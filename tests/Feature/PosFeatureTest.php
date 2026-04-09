<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerContact;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\JobTitle;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionDocument;
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionPayment;
use App\Models\SalesTransactionPaymentDetail;
use App\Models\SalesTransactionPaymentDocument;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PosFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_pos_page_loads_with_cashier_resolved_by_email(): void
    {
        $user = User::factory()->create([
            'name' => 'Email Matched',
            'email' => 'cashier@example.com',
        ]);

        $employee = Employee::create([
            'employee_id' => 'EMP-001',
            'job_title_id' => $this->createGenericJobTitle()->id,
            'first_name' => 'Email',
            'last_name' => 'Matched',
            'email' => 'cashier@example.com',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $this->actingAs($user)
            ->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('POS')
                ->where('cashier.employee_id', $employee->id)
                ->where('cashier.setup_error', null)
                ->has('warehouses', 1)
                ->has('paymentMethods', 1)
            );
    }

    public function test_pos_page_falls_back_to_full_name_for_cashier_resolution(): void
    {
        $user = User::factory()->create([
            'name' => 'Jane Cashier',
            'email' => 'different@example.com',
        ]);

        $employee = Employee::create([
            'employee_id' => 'EMP-002',
            'job_title_id' => $this->createGenericJobTitle()->id,
            'first_name' => 'Jane',
            'last_name' => 'Cashier',
            'email' => 'jane.cashier@example.com',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $this->actingAs($user)
            ->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('POS')
                ->where('cashier.employee_id', $employee->id)
                ->where('cashier.setup_error', null)
            );
    }

    public function test_pos_session_start_and_close_work(): void
    {
        [$user, $employee] = $this->createCashierUserAndEmployee();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        $this->actingAs($user)
            ->postJson(route('pos.session.store'), [
                'warehouse_id' => $warehouse->id,
                'opening_balance' => 1500,
            ])
            ->assertOk()
            ->assertJsonPath('session.employee_id', $employee->id)
            ->assertJsonPath('session.warehouse_id', $warehouse->id);

        $session = PosSession::firstOrFail();

        $this->assertDatabaseHas('pos_sessions', [
            'id' => $session->id,
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'status' => PosSession::STATUS_OPENED,
        ]);

        $this->actingAs($user)
            ->patchJson(route('pos.session.close', $session), [
                'closing_balance' => 2100,
                'cashier_remarks' => 'Closed cleanly',
            ])
            ->assertOk()
            ->assertJsonPath('session.status', PosSession::STATUS_CLOSED);

        $this->assertDatabaseHas('pos_sessions', [
            'id' => $session->id,
            'status' => PosSession::STATUS_CLOSED,
            'closing_balance' => 2100,
            'cashier_remarks' => 'Closed cleanly',
        ]);
    }

    public function test_pos_inventory_search_returns_joined_item_rows(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '123456789012345',
            'serial_number' => 'POS-SN-001',
            'status' => 'available',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 12500,
            'warranty' => '30 days service warranty',
        ]);

        $this->actingAs($user)
            ->getJson(route('pos.inventory-search', [
                'search' => '123456789012345',
                'warehouse_id' => $warehouse->id,
            ]))
            ->assertOk()
            ->assertJsonPath('rows.0.inventory_id', 1)
            ->assertJsonPath('rows.0.brand_name', 'Apple')
            ->assertJsonPath('rows.0.model', 'iPhone 15')
            ->assertJsonPath('rows.0.stock_on_hand', 1)
            ->assertJsonPath('rows.0.cash_price', 12000);
    }

    public function test_pos_customer_and_sales_rep_creation_use_backend_schema(): void
    {
        $user = User::factory()->create();
        $this->createCustomerDefaults();
        $salesJobTitle = $this->createSalesJobTitle();

        $customerResponse = $this->actingAs($user)
            ->postJson(route('pos.customers.store'), [
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'phone' => '09171234567',
                'email' => 'juan@example.com',
                'address_json' => [
                    'street' => '123 Mabini',
                    'barangay' => 'Barangay 1',
                    'city_municipality' => 'Manila',
                    'province' => 'Metro Manila',
                    'postal_code' => '1000',
                    'country' => 'Philippines',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('customer.full_name', 'Juan Dela Cruz');

        $customerId = $customerResponse->json('customer.id');

        $this->assertDatabaseHas('customers', [
            'id' => $customerId,
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
            'customer_kind' => Customer::KIND_PERSON,
        ]);

        $this->assertDatabaseHas('customer_contacts', [
            'customer_id' => $customerId,
            'phone' => '09171234567',
            'email' => 'juan@example.com',
            'is_primary' => true,
        ]);

        $this->assertDatabaseHas('customer_addresses', [
            'customer_id' => $customerId,
            'street' => '123 Mabini',
            'city_municipality' => 'Manila',
            'is_primary' => true,
        ]);

        $salesRepResponse = $this->actingAs($user)
            ->postJson(route('pos.sales-reps.store'), [
                'first_name' => 'Ana',
                'last_name' => 'Seller',
            ])
            ->assertOk()
            ->assertJsonPath('salesRep.department', 'Sales');

        $this->assertDatabaseHas('employees', [
            'id' => $salesRepResponse->json('salesRep.id'),
            'job_title_id' => $salesJobTitle->id,
            'first_name' => 'Ana',
            'last_name' => 'Seller',
            'status' => Employee::STATUS_ACTIVE,
        ]);
    }

    public function test_pos_transaction_checkout_persists_records_and_updates_inventory(): void
    {
        [$user, $employee] = $this->createCashierUserAndEmployee();
        $this->createCustomerDefaults();
        [$variant, $warehouse] = $this->createInventoryGraph();
        $paymentMethod = PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $customer = Customer::create([
            'firstname' => 'Walk',
            'lastname' => 'In',
        ]);

        CustomerContact::create([
            'customer_id' => $customer->id,
            'contact_type' => 'mobile',
            'phone' => '09170000000',
            'is_primary' => true,
        ]);

        CustomerAddress::create([
            'customer_id' => $customer->id,
            'address_type' => 'billing',
            'is_primary' => true,
            'city_municipality' => 'Quezon City',
        ]);

        $session = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $inventoryItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '555555555555555',
            'serial_number' => 'TXN-SN-001',
            'status' => 'available',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 12500,
        ]);

        $this->actingAs($user)
            ->postJson(route('pos.transactions.store'), [
                'pos_session_id' => $session->id,
                'customer_id' => $customer->id,
                'sales_representative_id' => null,
                'or_number' => 'OR-10001',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'remarks' => 'Paid in full',
                'total_amount' => 11800,
                'items' => [
                    [
                        'inventory_item_id' => $inventoryItem->id,
                        'price_basis' => 'cash',
                        'snapshot_cash_price' => 12000,
                        'snapshot_srp' => 12500,
                        'snapshot_cost_price' => 10000,
                        'discount_amount' => 200,
                        'line_total' => 11800,
                    ],
                ],
                'payments' => [
                    [
                        'payment_method_id' => $paymentMethod->id,
                        'amount' => 11800,
                        'payment_details' => [
                            'reference_number' => 'POS-REF-001',
                            'supporting_doc_urls' => [
                                [
                                    'name' => 'cash-slip',
                                    'url' => 'https://example.com/cash-slip.jpg',
                                    'type' => 'image/jpeg',
                                ],
                            ],
                        ],
                    ],
                ],
                'documents' => [
                    [
                        'document_type' => 'official_receipt',
                        'document_name' => 'official receipt',
                        'document_url' => 'https://example.com/or.jpg',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('transaction.or_number', 'OR-10001')
            ->assertJsonPath('transaction.total_amount', 11800);

        $transaction = SalesTransaction::firstOrFail();

        $this->assertDatabaseHas('sales_transactions', [
            'id' => $transaction->id,
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
            'or_number' => 'OR-10001',
            'total_amount' => 11800,
        ]);

        $this->assertDatabaseHas('sales_transaction_items', [
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $inventoryItem->id,
            'price_basis' => 'cash',
            'discount_amount' => 200,
            'line_total' => 11800,
        ]);

        $this->assertDatabaseHas('sales_transaction_payments', [
            'sales_transaction_id' => $transaction->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => 11800,
        ]);

        $payment = SalesTransactionPayment::firstOrFail();
        $detail = SalesTransactionPaymentDetail::firstOrFail();

        $this->assertSame($payment->id, $detail->sales_transaction_payment_id);

        $this->assertDatabaseHas('sales_transaction_payment_documents', [
            'sales_transaction_payment_detail_id' => $detail->id,
            'document_name' => 'cash-slip',
            'document_url' => 'https://example.com/cash-slip.jpg',
        ]);

        $this->assertDatabaseHas('sales_transaction_documents', [
            'sales_transaction_id' => $transaction->id,
            'document_type' => 'official_receipt',
            'document_url' => 'https://example.com/or.jpg',
        ]);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $inventoryItem->id,
            'status' => 'sold',
        ]);
    }

    private function createCashierUserAndEmployee(): array
    {
        $user = User::factory()->create([
            'name' => 'POS Cashier',
            'email' => 'pos.cashier@example.com',
        ]);

        $employee = Employee::create([
            'employee_id' => 'EMP-POS-001',
            'job_title_id' => $this->createGenericJobTitle()->id,
            'first_name' => 'POS',
            'last_name' => 'Cashier',
            'email' => 'pos.cashier@example.com',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        return [$user, $employee];
    }

    private function createCustomerDefaults(): void
    {
        CustomerGroup::firstOrCreate(['name' => 'Walk-in']);
        CustomerType::firstOrCreate(['name' => 'retail']);
    }

    private function createSalesJobTitle(): JobTitle
    {
        $department = Department::create([
            'name' => 'Sales',
            'status' => Department::STATUS_ACTIVE,
        ]);

        return JobTitle::create([
            'department_id' => $department->id,
            'name' => 'Sales Representative',
            'status' => JobTitle::STATUS_ACTIVE,
        ]);
    }

    private function createGenericJobTitle(): JobTitle
    {
        $department = Department::firstOrCreate(
            ['name' => 'Operations'],
            ['status' => Department::STATUS_ACTIVE],
        );

        return JobTitle::firstOrCreate(
            [
                'department_id' => $department->id,
                'name' => 'Cashier',
            ],
            ['status' => JobTitle::STATUS_ACTIVE],
        );
    }

    private function createInventoryGraph(): array
    {
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        $brand = ProductBrand::create(['name' => 'Apple']);
        $category = ProductCategory::create([
            'name' => 'Phones',
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Smartphones',
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'iPhone 15',
        ]);
        $master = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE-15',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $variant = ProductVariant::create([
            'product_master_id' => $master->id,
            'variant_name' => '256GB Black',
            'sku' => 'APPLE-IPHONE-15-256-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        return [$variant, $warehouse];
    }
}
