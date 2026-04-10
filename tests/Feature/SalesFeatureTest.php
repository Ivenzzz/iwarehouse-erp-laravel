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
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionPayment;
use App\Models\SalesTransactionPaymentDetail;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class SalesFeatureTest extends TestCase
{
    use RefreshDatabase;

    private int $inventorySequence = 1;
    private int $employeeSequence = 1;
    private int $transactionSequence = 1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->createCustomerDefaults();
    }

    public function test_sales_index_route_is_live_and_renders_server_rows(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Main Branch', 1);
        $cashier = $this->createEmployee('Cashier');
        $session = $this->createSession($cashier, $warehouse);
        $salesRep = $this->createEmployee('Sales Representative');
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $customer = $this->createCustomer('Juan', 'Dela Cruz');
        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256'],
        ]);
        $inventory = $this->createInventoryItem($variant, $warehouse, cash: 32000, cost: 21000);

        $this->createTransaction($session, $customer, $inventory, $cash, $salesRep, createdAt: now()->subDay());

        $this->actingAs($user)
            ->get(route('sales.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Sales')
                ->where('filters.search', '')
                ->where('filters.warehouse', 'all')
                ->where('filters.sort', 'transaction_date')
                ->where('filters.direction', 'desc')
                ->has('warehouses', 1)
                ->has('rows', 1)
                ->where('rows.0.warehouse_name', 'Main Branch')
                ->where('rows.0.customer_name', 'Juan Dela Cruz')
                ->where('rows.0.sales_representative_name', 'Sales Representative 002')
                ->where('rows.0.total_amount', 32000)
            );
    }

    public function test_sales_filters_search_and_sort_are_server_side(): void
    {
        $user = User::factory()->create();
        $mainWarehouse = $this->createWarehouse('Main Branch', 1);
        $branchWarehouse = $this->createWarehouse('Branch Store', 2);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $creditCard = PaymentMethod::create(['name' => 'Credit Card', 'type' => 'card']);
        $salesRep = $this->createEmployee('Sales Representative');

        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256'],
        ]);

        $mainInventory = $this->createInventoryItem($variant, $mainWarehouse, imei: '111111111111111', cash: 30000, cost: 18000);
        $branchInventory = $this->createInventoryItem($variant, $branchWarehouse, imei: '999999999999999', cash: 45000, cost: 22000);

        $this->createTransaction(
            $this->createSession($this->createEmployee('Cashier'), $mainWarehouse),
            $this->createCustomer('Main', 'Buyer'),
            $mainInventory,
            $cash,
            $salesRep,
            createdAt: Carbon::create(2026, 4, 2, 10, 0, 0),
            orNumber: 'OR-MAIN-1',
        );

        $this->createTransaction(
            $this->createSession($this->createEmployee('Cashier'), $branchWarehouse),
            $this->createCustomer('Branch', 'Buyer'),
            $branchInventory,
            $creditCard,
            $salesRep,
            createdAt: Carbon::create(2026, 4, 4, 12, 0, 0),
            orNumber: 'OR-BRANCH-1',
            detail: ['bank' => 'BPI', 'reference_number' => 'CC-123', 'loan_term_months' => 6],
        );

        $this->actingAs($user)
            ->get(route('sales.index', [
                'warehouse' => $branchWarehouse->id,
                'search' => '999999999999999',
                'sort' => 'total_amount',
                'direction' => 'asc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.warehouse', (string) $branchWarehouse->id)
                ->where('filters.search', '999999999999999')
                ->where('filters.sort', 'total_amount')
                ->where('filters.direction', 'asc')
                ->has('rows', 1)
                ->where('rows.0.or_number', 'OR-BRANCH-1')
                ->where('rows.0.warehouse_name', 'Branch Store')
                ->where('rows.0.total_amount', 45000)
            );
    }

    public function test_sales_transaction_detail_and_xlsx_export_are_server_backed(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Main Branch', 1);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $salesRep = $this->createEmployee('Sales Representative');
        $session = $this->createSession($this->createEmployee('Cashier'), $warehouse);
        $customer = $this->createCustomer('Maria', 'Santos', withAddress: true);
        [$variant] = $this->createProductGraph('Samsung', 'Galaxy S', 'SAMSUNG-GALAXY', [
            ['name' => '512GB Gray', 'sku' => 'SAMSUNG-GALAXY-512'],
        ]);
        $inventory = $this->createInventoryItem($variant, $warehouse, serial: 'SERIAL-123', cash: 28000, cost: 17000);

        $transaction = $this->createTransaction(
            $session,
            $customer,
            $inventory,
            $cash,
            $salesRep,
            createdAt: Carbon::create(2026, 4, 3, 14, 30, 0),
            orNumber: 'OR-DETAIL-1',
        );

        $this->actingAs($user)
            ->getJson(route('sales.show', $transaction))
            ->assertOk()
            ->assertJsonPath('transaction.customer_name', 'Maria Santos')
            ->assertJsonPath('transaction.customer_address', '123 Mabini, Barangay 1, Manila, Metro Manila, NCR')
            ->assertJsonPath('transaction.items.0.condition', 'Brand New')
            ->assertJsonPath('transaction.items.0.serial_number', 'SERIAL-123');

        $response = $this->actingAs($user)->get(route('sales.export.xlsx'));
        $response->assertOk();
        $response->assertDownload('sales_'.now()->format('Y-m-d').'.xlsx');

        $tempFile = tempnam(sys_get_temp_dir(), 'sales-xlsx-');
        file_put_contents($tempFile, $response->streamedContent());
        $spreadsheet = IOFactory::load($tempFile);
        $sheet = $spreadsheet->getActiveSheet();

        $this->assertSame('OR Number', $sheet->getCell('A1')->getValue());
        $this->assertSame('OR-DETAIL-1', $sheet->getCell('A2')->getValue());
        $this->assertSame('Main Branch', $sheet->getCell('D2')->getValue());

        @unlink($tempFile);
    }

    private function createWarehouse(string $name, int $sortOrder): Warehouse
    {
        return Warehouse::create([
            'name' => $name,
            'warehouse_type' => 'store',
            'sort_order' => $sortOrder,
        ]);
    }

    private function createEmployee(string $role): Employee
    {
        $sequence = $this->employeeSequence++;

        return Employee::create([
            'employee_id' => 'EMP-SL-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
            'job_title_id' => $this->createJobTitle($role)->id,
            'first_name' => $role,
            'last_name' => str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
            'status' => Employee::STATUS_ACTIVE,
        ]);
    }

    private function createJobTitle(string $name): JobTitle
    {
        $department = Department::firstOrCreate(
            ['name' => 'Operations'],
            ['status' => Department::STATUS_ACTIVE],
        );

        return JobTitle::firstOrCreate(
            ['department_id' => $department->id, 'name' => $name],
            ['status' => JobTitle::STATUS_ACTIVE],
        );
    }

    private function createCustomer(string $firstName, string $lastName, bool $withAddress = false): Customer
    {
        $customer = Customer::create([
            'firstname' => $firstName,
            'lastname' => $lastName,
            'customer_kind' => Customer::KIND_PERSON,
        ]);

        CustomerContact::create([
            'customer_id' => $customer->id,
            'contact_type' => 'mobile',
            'phone' => '09171234567',
            'email' => strtolower($firstName).'.'.strtolower($lastName).'@example.com',
            'is_primary' => true,
        ]);

        if ($withAddress) {
            CustomerAddress::create([
                'customer_id' => $customer->id,
                'address_type' => 'primary',
                'street' => '123 Mabini',
                'barangay' => 'Barangay 1',
                'city_municipality' => 'Manila',
                'province' => 'Metro Manila',
                'region' => 'NCR',
                'country' => 'PH',
                'is_primary' => true,
            ]);
        }

        return $customer;
    }

    private function createSession(Employee $cashier, Warehouse $warehouse): PosSession
    {
        return PosSession::create([
            'employee_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now()->subHours(4),
            'status' => PosSession::STATUS_OPENED,
        ]);
    }

    private function createProductGraph(string $brandName, string $modelName, string $masterSku, array $variantDefinitions): array
    {
        $brand = ProductBrand::firstOrCreate(['name' => $brandName]);
        $category = ProductCategory::firstOrCreate(['name' => 'Phones', 'parent_category_id' => null]);
        $subcategory = ProductCategory::create([
            'name' => $modelName.' Subcategory',
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => $modelName,
        ]);
        $master = ProductMaster::create([
            'master_sku' => $masterSku,
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
            'product_name' => $brandName.' '.$modelName,
        ]);

        $variants = [];
        foreach ($variantDefinitions as $definition) {
            $variants[] = ProductVariant::create([
                'product_master_id' => $master->id,
                'variant_name' => $definition['name'],
                'sku' => $definition['sku'],
                'condition' => $definition['condition'] ?? 'Brand New',
                'is_active' => true,
            ]);
        }

        return [...$variants, $master];
    }

    private function createInventoryItem(
        ProductVariant $variant,
        Warehouse $warehouse,
        ?string $imei = null,
        ?string $serial = null,
        float $cash = 10000,
        float $cost = 7000,
    ): InventoryItem {
        $sequence = $this->inventorySequence++;

        return InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => $imei ?? sprintf('990000000000%03d', $sequence),
            'serial_number' => $serial ?? sprintf('SALES-%03d', $sequence),
            'status' => 'sold',
            'cost_price' => $cost,
            'cash_price' => $cash,
            'srp_price' => $cash + 500,
            'warranty' => '30 days service warranty',
        ]);
    }

    private function createTransaction(
        PosSession $session,
        Customer $customer,
        InventoryItem $inventoryItem,
        PaymentMethod $paymentMethod,
        Employee $salesRep,
        ?Carbon $createdAt = null,
        ?string $orNumber = null,
        array $detail = [],
    ): SalesTransaction {
        $sequence = $this->transactionSequence++;
        $createdAt ??= now();

        $transaction = SalesTransaction::create([
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
            'sales_representative_id' => $salesRep->id,
            'or_number' => $orNumber ?? 'OR-'.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT),
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'total_amount' => $inventoryItem->cash_price,
        ]);

        $transaction->timestamps = false;
        $transaction->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();

        SalesTransactionItem::create([
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $inventoryItem->id,
            'price_basis' => SalesTransactionItem::PRICE_BASIS_CASH,
            'snapshot_cash_price' => $inventoryItem->cash_price,
            'snapshot_srp' => $inventoryItem->srp_price,
            'snapshot_cost_price' => $inventoryItem->cost_price,
            'discount_amount' => 0,
            'line_total' => $inventoryItem->cash_price,
            'is_bundle' => false,
        ]);

        $payment = SalesTransactionPayment::create([
            'sales_transaction_id' => $transaction->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => $inventoryItem->cash_price,
        ]);

        if ($detail !== []) {
            SalesTransactionPaymentDetail::create([
                'sales_transaction_payment_id' => $payment->id,
                'reference_number' => $detail['reference_number'] ?? null,
                'bank' => $detail['bank'] ?? null,
                'loan_term_months' => $detail['loan_term_months'] ?? null,
            ]);
        }

        return $transaction->fresh();
    }

    private function createCustomerDefaults(): void
    {
        CustomerGroup::firstOrCreate(['name' => 'Walk-in']);
        CustomerType::firstOrCreate(['name' => 'retail']);
    }
}
