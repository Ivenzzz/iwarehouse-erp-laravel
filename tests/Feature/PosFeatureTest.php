<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerContact;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeAccount;
use App\Models\InventoryItem;
use App\Models\InventoryItemLog;
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

    public function test_pos_page_loads_with_cashier_resolved_by_employee_account_link(): void
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

        EmployeeAccount::create([
            'user_id' => $user->id,
            'employee_id' => $employee->id,
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

    public function test_pos_page_requires_employee_account_link_for_cashier_resolution(): void
    {
        $user = User::factory()->create([
            'name' => 'Jane Cashier',
            'email' => 'different@example.com',
        ]);

        Employee::create([
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
                ->where('cashier.employee_id', null)
                ->where('cashier.setup_error', 'No employee account link matched the authenticated user. Link this account to an employee before using POS.')
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

    public function test_pos_page_returns_display_labels_for_customers_and_sales_reps(): void
    {
        [$user] = $this->createCashierUserAndEmployee();
        $this->createCustomerDefaults();
        $salesJobTitle = $this->createSalesJobTitle();

        Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $customer = Customer::create([
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
            'customer_kind' => Customer::KIND_PERSON,
        ]);

        CustomerContact::create([
            'customer_id' => $customer->id,
            'contact_type' => 'mobile',
            'phone' => '09171234567',
            'email' => 'juan@example.com',
            'is_primary' => true,
        ]);

        Employee::create([
            'employee_id' => 'EMP-SALES-001',
            'job_title_id' => $salesJobTitle->id,
            'first_name' => 'Ana',
            'last_name' => 'Seller',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $this->actingAs($user)
            ->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('POS')
                ->has('warehouses', 1)
                ->has('customers', 1)
                ->has('salesReps', 1)
                ->has('paymentMethods', 1)
                ->where('customers.0.display_label', 'Juan Dela Cruz - 09171234567')
                ->where('salesReps.0.display_label', 'Ana Seller - Sales Representative')
            );
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
                    'region' => 'National Capital Region',
                    'postal_code' => '1000',
                    'country' => 'Philippines',
                    'country_code' => 'PH',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('customer.full_name', 'Juan Dela Cruz')
            ->assertJsonPath('customer.address_json.region', 'National Capital Region')
            ->assertJsonPath('customer.address_json.country', 'Philippines')
            ->assertJsonPath('customer.address_json.country_code', 'PH');

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
            'region' => 'National Capital Region',
            'city_municipality' => 'Manila',
            'country' => 'PH',
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

    public function test_pos_discount_oic_verification_succeeds_for_active_sales_oic(): void
    {
        [$user, $cashier] = $this->createCashierUserAndEmployee();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        $session = PosSession::create([
            'employee_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        Employee::create([
            'employee_id' => 'EMP-OIC-001',
            'job_title_id' => $this->createSalesOicJobTitle()->id,
            'first_name' => 'Olive',
            'last_name' => 'Charge',
            'oic_password_hash' => '2468',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $this->actingAs($user)
            ->postJson(route('pos.discounts.verify-oic'), [
                'pos_session_id' => $session->id,
                'pin' => '2468',
            ])
            ->assertOk()
            ->assertJsonPath('authorized', true)
            ->assertJsonPath('employee.full_name', 'Olive Charge');
    }

    public function test_pos_discount_oic_verification_fails_for_wrong_pin(): void
    {
        [$user, $cashier] = $this->createCashierUserAndEmployee();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        $session = PosSession::create([
            'employee_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        Employee::create([
            'employee_id' => 'EMP-OIC-002',
            'job_title_id' => $this->createSalesOicJobTitle()->id,
            'first_name' => 'Valid',
            'last_name' => 'Approver',
            'oic_password_hash' => '1357',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $this->actingAs($user)
            ->postJson(route('pos.discounts.verify-oic'), [
                'pos_session_id' => $session->id,
                'pin' => '9999',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Invalid OIC PIN.');
    }

    public function test_pos_discount_oic_verification_fails_for_non_oic_and_inactive_employees(): void
    {
        [$user, $cashier] = $this->createCashierUserAndEmployee();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        $session = PosSession::create([
            'employee_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        Employee::create([
            'employee_id' => 'EMP-SALES-003',
            'job_title_id' => $this->createSalesJobTitle()->id,
            'first_name' => 'Regular',
            'last_name' => 'Seller',
            'oic_password_hash' => '5555',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        Employee::create([
            'employee_id' => 'EMP-OIC-003',
            'job_title_id' => $this->createSalesOicJobTitle()->id,
            'first_name' => 'Inactive',
            'last_name' => 'Approver',
            'oic_password_hash' => '5555',
            'status' => Employee::STATUS_INACTIVE,
        ]);

        $this->actingAs($user)
            ->postJson(route('pos.discounts.verify-oic'), [
                'pos_session_id' => $session->id,
                'pin' => '5555',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Invalid OIC PIN.');
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
            'email' => 'walkin@example.com',
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
                        'discount_proof_image_url' => 'https://example.com/discount-proof.jpg',
                        'discount_validated_at' => '2026-04-10T09:30:00+08:00',
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
            ->assertJsonPath('transaction.total_amount', 11800)
            ->assertJsonPath('transaction.customer_name', 'Walk In')
            ->assertJsonPath('transaction.customer_phone', '09170000000')
            ->assertJsonPath('transaction.customer_email', 'walkin@example.com')
            ->assertJsonPath('transaction.items.0.identifier', '555555555555555')
            ->assertJsonPath('transaction.items.0.display_name', 'Apple iPhone 15 256GB Black')
            ->assertJsonPath('transaction.items.0.receipt_description', 'Apple iPhone 15 256GB Black Brand New')
            ->assertJsonPath('transaction.items.0.discount_proof_image_url', 'https://example.com/discount-proof.jpg');

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
            'discount_proof_image_url' => 'https://example.com/discount-proof.jpg',
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

        $log = InventoryItemLog::query()->where('inventory_item_id', $inventoryItem->id)->first();
        $this->assertNotNull($log);
        $this->assertSame('POS_SOLD', $log->action);
        $this->assertSame($user->id, $log->actor_id);
        $this->assertSame($transaction->id, data_get($log->meta, 'sales_transaction_id'));
        $this->assertSame($transaction->transaction_number, data_get($log->meta, 'transaction_number'));
        $this->assertSame('OR-10001', data_get($log->meta, 'or_number'));
        $this->assertSame($customer->id, data_get($log->meta, 'customer_id'));
        $this->assertSame('Walk In', data_get($log->meta, 'customer_name'));
        $this->assertNotNull(data_get($log->meta, 'transaction_date'));
        $this->assertFalse((bool) data_get($log->meta, 'is_bundle_component'));
    }

    public function test_pos_transaction_stores_manual_discount_proof_on_first_discounted_item(): void
    {
        [$user, $employee] = $this->createCashierUserAndEmployee();
        $this->createCustomerDefaults();
        [$variant, $warehouse] = $this->createInventoryGraph();
        $paymentMethod = PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $customer = Customer::create([
            'firstname' => 'Proof',
            'lastname' => 'Buyer',
        ]);

        $session = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $firstItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '111111111111111',
            'serial_number' => 'TXN-SN-003',
            'status' => 'available',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 12500,
        ]);

        $secondItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '222222222222222',
            'serial_number' => 'TXN-SN-004',
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
                'or_number' => 'OR-10003',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'remarks' => 'Transaction discount on first item only',
                'total_amount' => 23500,
                'items' => [
                    [
                        'inventory_item_id' => $firstItem->id,
                        'price_basis' => 'cash',
                        'snapshot_cash_price' => 12000,
                        'snapshot_srp' => 12500,
                        'snapshot_cost_price' => 10000,
                        'discount_amount' => 500,
                        'discount_proof_image_url' => 'https://example.com/manual-proof.jpg',
                        'discount_validated_at' => '2026-04-10T10:00:00+08:00',
                        'line_total' => 11500,
                    ],
                    [
                        'inventory_item_id' => $secondItem->id,
                        'price_basis' => 'cash',
                        'snapshot_cash_price' => 12000,
                        'snapshot_srp' => 12500,
                        'snapshot_cost_price' => 10000,
                        'discount_amount' => 0,
                        'line_total' => 12000,
                    ],
                ],
                'payments' => [
                    [
                        'payment_method_id' => $paymentMethod->id,
                        'amount' => 23500,
                    ],
                ],
            ])
            ->assertOk();

        $transaction = SalesTransaction::firstOrFail();

        $this->assertDatabaseHas('sales_transaction_items', [
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $firstItem->id,
            'discount_amount' => 500,
            'discount_proof_image_url' => 'https://example.com/manual-proof.jpg',
        ]);

        $this->assertDatabaseHas('sales_transaction_items', [
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $secondItem->id,
            'discount_amount' => 0,
            'discount_proof_image_url' => null,
        ]);
    }

    public function test_pos_transaction_logs_main_and_bundle_component_items_as_sold(): void
    {
        [$user, $employee] = $this->createCashierUserAndEmployee();
        $this->createCustomerDefaults();
        [$variant, $warehouse] = $this->createInventoryGraph();
        $paymentMethod = PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $customer = Customer::create([
            'firstname' => 'Bundle',
            'lastname' => 'Buyer',
        ]);

        $session = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $mainItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '333333333333333',
            'serial_number' => 'TXN-SN-005',
            'status' => 'available',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 12500,
        ]);

        $bundleComponent = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '444444444444444',
            'serial_number' => 'TXN-SN-006',
            'status' => 'available',
            'cost_price' => 2000,
            'cash_price' => 2500,
            'srp_price' => 3000,
        ]);

        $this->actingAs($user)
            ->postJson(route('pos.transactions.store'), [
                'pos_session_id' => $session->id,
                'customer_id' => $customer->id,
                'sales_representative_id' => null,
                'or_number' => 'OR-10004',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'remarks' => 'Bundle transaction',
                'total_amount' => 12000,
                'items' => [
                    [
                        'inventory_item_id' => $mainItem->id,
                        'price_basis' => 'cash',
                        'snapshot_cash_price' => 12000,
                        'snapshot_srp' => 12500,
                        'snapshot_cost_price' => 10000,
                        'discount_amount' => 0,
                        'line_total' => 12000,
                        'is_bundle' => true,
                        'bundle_serial' => 'BUNDLE-0001',
                        'bundle_components' => [
                            [
                                'inventory_id' => $bundleComponent->id,
                            ],
                        ],
                    ],
                ],
                'payments' => [
                    [
                        'payment_method_id' => $paymentMethod->id,
                        'amount' => 12000,
                    ],
                ],
            ])
            ->assertOk();

        $transaction = SalesTransaction::firstOrFail();
        $lineItem = SalesTransactionItem::firstOrFail();

        $this->assertDatabaseHas('inventory_items', [
            'id' => $mainItem->id,
            'status' => 'sold',
        ]);
        $this->assertDatabaseHas('inventory_items', [
            'id' => $bundleComponent->id,
            'status' => 'sold',
        ]);

        $mainLog = InventoryItemLog::query()->where('inventory_item_id', $mainItem->id)->first();
        $componentLog = InventoryItemLog::query()->where('inventory_item_id', $bundleComponent->id)->first();

        $this->assertNotNull($mainLog);
        $this->assertNotNull($componentLog);

        $this->assertSame('POS_SOLD', $mainLog->action);
        $this->assertSame('POS_SOLD', $componentLog->action);
        $this->assertSame($transaction->id, data_get($mainLog->meta, 'sales_transaction_id'));
        $this->assertSame($transaction->id, data_get($componentLog->meta, 'sales_transaction_id'));
        $this->assertSame($lineItem->id, data_get($mainLog->meta, 'line_item_id'));
        $this->assertSame($lineItem->id, data_get($componentLog->meta, 'line_item_id'));
        $this->assertFalse((bool) data_get($mainLog->meta, 'is_bundle_component'));
        $this->assertTrue((bool) data_get($componentLog->meta, 'is_bundle_component'));
    }

    public function test_pos_transaction_fails_when_any_component_item_is_not_available_and_rolls_back_all_writes(): void
    {
        [$user, $employee] = $this->createCashierUserAndEmployee();
        $this->createCustomerDefaults();
        [$variant, $warehouse] = $this->createInventoryGraph();
        $paymentMethod = PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $customer = Customer::create([
            'firstname' => 'Rollback',
            'lastname' => 'Buyer',
        ]);

        $session = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $mainItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '666666666666666',
            'serial_number' => 'TXN-SN-007',
            'status' => 'available',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 12500,
        ]);

        $unavailableComponent = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '777777777777777',
            'serial_number' => 'TXN-SN-008',
            'status' => 'sold',
            'cost_price' => 2000,
            'cash_price' => 2500,
            'srp_price' => 3000,
        ]);

        $this->actingAs($user)
            ->postJson(route('pos.transactions.store'), [
                'pos_session_id' => $session->id,
                'customer_id' => $customer->id,
                'sales_representative_id' => null,
                'or_number' => 'OR-10005',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'remarks' => 'Should fail',
                'total_amount' => 12000,
                'items' => [
                    [
                        'inventory_item_id' => $mainItem->id,
                        'price_basis' => 'cash',
                        'snapshot_cash_price' => 12000,
                        'snapshot_srp' => 12500,
                        'snapshot_cost_price' => 10000,
                        'discount_amount' => 0,
                        'line_total' => 12000,
                        'is_bundle' => true,
                        'bundle_components' => [
                            [
                                'inventory_id' => $unavailableComponent->id,
                            ],
                        ],
                    ],
                ],
                'payments' => [
                    [
                        'payment_method_id' => $paymentMethod->id,
                        'amount' => 12000,
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'One or more inventory items are no longer available.');

        $this->assertDatabaseCount('sales_transactions', 0);
        $this->assertDatabaseCount('sales_transaction_items', 0);
        $this->assertDatabaseCount('sales_transaction_item_components', 0);
        $this->assertDatabaseCount('inventory_item_logs', 0);
        $this->assertDatabaseHas('inventory_items', [
            'id' => $mainItem->id,
            'status' => 'available',
        ]);
        $this->assertDatabaseHas('inventory_items', [
            'id' => $unavailableComponent->id,
            'status' => 'sold',
        ]);
    }

    public function test_pos_transactions_endpoint_returns_receipt_ready_rows(): void
    {
        [$user, $cashier] = $this->createCashierUserAndEmployee();
        $this->createCustomerDefaults();
        [$variant, $warehouse] = $this->createInventoryGraph();
        $salesJobTitle = $this->createSalesJobTitle();
        $paymentMethod = PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $salesRep = Employee::create([
            'employee_id' => 'EMP-SALES-002',
            'job_title_id' => $salesJobTitle->id,
            'first_name' => 'Bea',
            'last_name' => 'Seller',
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $customer = Customer::create([
            'firstname' => 'Maria',
            'lastname' => 'Buyer',
            'customer_kind' => Customer::KIND_PERSON,
        ]);

        CustomerContact::create([
            'customer_id' => $customer->id,
            'contact_type' => 'mobile',
            'phone' => '09179990000',
            'email' => 'maria@example.com',
            'is_primary' => true,
        ]);

        $session = PosSession::create([
            'employee_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $inventoryItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '999999999999999',
            'serial_number' => 'TXN-SN-002',
            'status' => 'sold',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 12500,
            'warranty' => '30 days service warranty',
        ]);

        $transaction = SalesTransaction::create([
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
            'sales_representative_id' => $salesRep->id,
            'or_number' => 'OR-10002',
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'remarks' => 'History transaction',
            'total_amount' => 12000,
        ]);

        SalesTransactionItem::create([
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $inventoryItem->id,
            'price_basis' => SalesTransactionItem::PRICE_BASIS_CASH,
            'snapshot_cash_price' => 12000,
            'snapshot_srp' => 12500,
            'snapshot_cost_price' => 10000,
            'discount_amount' => 0,
            'line_total' => 12000,
        ]);

        $payment = SalesTransactionPayment::create([
            'sales_transaction_id' => $transaction->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => 12000,
        ]);

        SalesTransactionPaymentDetail::create([
            'sales_transaction_payment_id' => $payment->id,
            'reference_number' => 'POS-REF-002',
        ]);

        $this->actingAs($user)
            ->getJson(route('pos.transactions', ['session_id' => $session->id]))
            ->assertOk()
            ->assertJsonPath('rows.0.customer_name', 'Maria Buyer')
            ->assertJsonPath('rows.0.customer_phone', '09179990000')
            ->assertJsonPath('rows.0.customer_email', 'maria@example.com')
            ->assertJsonPath('rows.0.sales_representative_name', 'Bea Seller')
            ->assertJsonPath('rows.0.warehouse_name', 'Main Branch')
            ->assertJsonPath('rows.0.items.0.identifier', '999999999999999')
            ->assertJsonPath('rows.0.items.0.display_name', 'Apple iPhone 15 256GB Black')
            ->assertJsonPath('rows.0.items.0.receipt_description', 'Apple iPhone 15 256GB Black Brand New');
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

        EmployeeAccount::create([
            'user_id' => $user->id,
            'employee_id' => $employee->id,
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
        $department = Department::firstOrCreate(
            ['name' => 'Sales'],
            ['status' => Department::STATUS_ACTIVE],
        );

        return JobTitle::firstOrCreate(
            [
                'department_id' => $department->id,
                'name' => 'Sales Representative',
            ],
            ['status' => JobTitle::STATUS_ACTIVE],
        );
    }

    private function createSalesOicJobTitle(): JobTitle
    {
        $department = Department::firstOrCreate(
            ['name' => 'Sales'],
            ['status' => Department::STATUS_ACTIVE],
        );

        return JobTitle::firstOrCreate(
            [
                'department_id' => $department->id,
                'name' => 'OIC',
            ],
            ['status' => JobTitle::STATUS_ACTIVE],
        );
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
