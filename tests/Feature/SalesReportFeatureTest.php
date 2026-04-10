<?php

namespace Tests\Feature;

use App\Models\Customer;
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

class SalesReportFeatureTest extends TestCase
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

    public function test_sales_report_index_renders_and_admin_nav_points_to_live_routes(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Main Branch', 1);
        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256'],
        ]);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $session = $this->createSession($this->createEmployee('Cashier'), $warehouse, Carbon::create(2026, 4, 5, 9, 0, 0));
        $this->createTransaction(
            $session,
            $this->createCustomer('Juan', 'Dela Cruz'),
            $this->createInventoryItem($variant, $warehouse, cash: 20000, cost: 12000),
            [['method' => $cash, 'amount' => 20000]],
            $this->createEmployee('Sales Representative'),
            Carbon::create(2026, 4, 5, 10, 0, 0),
        );

        $this->assertSame('/sales-report', route('sales-report.index', absolute: false));
        $this->assertSame('/sales', route('sales.index', absolute: false));

        $navFile = file_get_contents(base_path('resources/js/shared/navigation/adminNav.js'));
        $this->assertStringContainsString("route('sales-report.index')", $navFile);
        $this->assertStringContainsString("route('sales.index')", $navFile);

        $this->actingAs($user)
            ->get(route('sales-report.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SalesReport')
                ->where('filters.tab', 'consolidated')
                ->has('warehouses', 1)
                ->has('individualRows', 1)
                ->has('consolidatedRows', 1)
                ->where('calendar.month', now()->month)
                ->where('calendar.year', now()->year)
            );
    }

    public function test_sales_report_filters_and_json_endpoints_are_server_side(): void
    {
        $user = User::factory()->create();
        $mainWarehouse = $this->createWarehouse('Main Branch', 1);
        $branchWarehouse = $this->createWarehouse('Branch Store', 2);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        [$variant] = $this->createProductGraph('Samsung', 'Galaxy S', 'SAMSUNG-GALAXY', [
            ['name' => '512GB Gray', 'sku' => 'SAMSUNG-GALAXY-512'],
        ]);

        $openSession = $this->createSession($this->createEmployee('Cashier'), $mainWarehouse, Carbon::create(2026, 4, 6, 8, 0, 0));
        $closedSession = $this->createSession($this->createEmployee('Cashier'), $branchWarehouse, Carbon::create(2026, 4, 6, 9, 0, 0), status: PosSession::STATUS_CLOSED);

        $salesRep = $this->createEmployee('Sales Representative');
        $this->createTransaction(
            $openSession,
            $this->createCustomer('Main', 'Buyer'),
            $this->createInventoryItem($variant, $mainWarehouse, imei: '123451234512345', cash: 25000),
            [['method' => $cash, 'amount' => 25000]],
            $salesRep,
            Carbon::create(2026, 4, 6, 10, 0, 0),
            'OR-MAIN-1',
        );

        $this->createTransaction(
            $closedSession,
            $this->createCustomer('Branch', 'Buyer'),
            $this->createInventoryItem($variant, $branchWarehouse, imei: '777777777777777', cash: 30000),
            [['method' => $cash, 'amount' => 30000]],
            $salesRep,
            Carbon::create(2026, 4, 6, 11, 0, 0),
            'OR-BRANCH-1',
        );

        $this->actingAs($user)
            ->get(route('sales-report.index', [
                'tab' => 'daily',
                'individual_branch' => $branchWarehouse->id,
                'individual_status' => 'closed',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.tab', 'daily')
                ->where('filters.individual_branch', (string) $branchWarehouse->id)
                ->where('filters.individual_status', 'closed')
                ->has('individualRows', 1)
                ->where('individualRows.0.warehouse_name', 'Branch Store')
                ->where('individualRows.0.status', 'closed')
            );

        $this->actingAs($user)
            ->getJson(route('sales-report.individual', [
                'individual_search' => $closedSession->session_number,
                'individual_branch' => $branchWarehouse->id,
            ]))
            ->assertOk()
            ->assertJsonCount(1, 'rows')
            ->assertJsonPath('rows.0.session_number', $closedSession->session_number);

        $this->actingAs($user)
            ->getJson(route('sales-report.consolidated', [
                'consolidated_branch' => $mainWarehouse->id,
                'consolidated_search' => 'Main',
            ]))
            ->assertOk()
            ->assertJsonCount(1, 'rows')
            ->assertJsonPath('rows.0.branch_name', 'Main Branch')
            ->assertJsonPath('rows.0.transaction_count', 1);
    }

    public function test_sales_report_detail_calendar_close_and_export_are_server_backed(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Main Branch', 1);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $creditCard = PaymentMethod::create(['name' => 'Credit Card', 'type' => 'card']);
        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256'],
        ]);
        $session = $this->createSession($this->createEmployee('Cashier'), $warehouse, Carbon::create(2026, 4, 5, 9, 0, 0));
        $salesRep = $this->createEmployee('Sales Representative');

        $transaction = $this->createTransaction(
            $session,
            $this->createCustomer('Maria', 'Santos'),
            $this->createInventoryItem($variant, $warehouse, cash: 40000, cost: 25000, serial: 'REPORT-001'),
            [
                ['method' => $cash, 'amount' => 10000],
                ['method' => $creditCard, 'amount' => 30000, 'detail' => ['bank' => 'BPI', 'reference_number' => 'CC-123', 'loan_term_months' => 6]],
            ],
            $salesRep,
            Carbon::create(2026, 4, 5, 10, 30, 0),
            'OR-REPORT-1',
        );

        $this->createTransaction(
            $session,
            $this->createCustomer('Pedro', 'Santos'),
            $this->createInventoryItem($variant, $warehouse, cash: 15000, cost: 9000, serial: 'REPORT-002'),
            [['method' => $cash, 'amount' => 15000]],
            $salesRep,
            Carbon::create(2026, 4, 7, 11, 0, 0),
            'OR-REPORT-2',
        );

        $this->actingAs($user)
            ->getJson(route('sales-report.individual.detail', $session))
            ->assertOk()
            ->assertJsonPath('summary.transactionCount', 2)
            ->assertJsonPath('transactions.0.actual_cash_paid', 15000)
            ->assertJsonPath('transactions.1.or_number', 'OR-REPORT-1')
            ->assertJsonPath('transactions.1.actual_cash_paid', 10000)
            ->assertJsonPath('transactions.1.mdr_deduction', 1950)
            ->assertJsonPath('transactions.1.net_profit', 13050);

        $this->actingAs($user)
            ->getJson(route('sales-report.consolidated.detail', [
                'date' => '2026-04-05',
                'warehouse_id' => $warehouse->id,
            ]))
            ->assertOk()
            ->assertJsonPath('summary.grossSales', 55000)
            ->assertJsonPath('summary.netSales', 55000)
            ->assertJsonPath('dynamicPaymentColumns.0', 'Credit Card (BPI)')
            ->assertJsonPath('ledgerRows.2.nonCashPaymentAmount', 30000);

        $this->actingAs($user)
            ->getJson(route('sales-report.calendar', ['month' => 4, 'year' => 2026]))
            ->assertOk()
            ->assertJsonPath('monthTotals.revenue', 55000)
            ->assertJsonPath('dailyMap.2026-04-05.revenue', 40000)
            ->assertJsonPath('dailyMap.2026-04-07.transactionCount', 1);

        $closeResponse = $this->actingAs($user)
            ->post(route('sales-report.individual.close', $session))
            ->assertOk();

        $this->assertDatabaseHas('pos_sessions', [
            'id' => $session->id,
            'status' => PosSession::STATUS_CLOSED,
        ]);
        $closeResponse->assertJsonPath('session.status', 'closed');

        $export = $this->actingAs($user)->get(route('sales-report.consolidated.export.xlsx', [
            'date' => '2026-04-05',
            'warehouse_id' => $warehouse->id,
        ]));

        $export->assertOk();
        $export->assertDownload('sales_report_2026-04-05_'.$warehouse->id.'.xlsx');

        $tempFile = tempnam(sys_get_temp_dir(), 'sales-report-xlsx-');
        file_put_contents($tempFile, $export->streamedContent());
        $spreadsheet = IOFactory::load($tempFile);
        $sheet = $spreadsheet->getActiveSheet();

        $this->assertSame('Customer Name', $sheet->getCell('A1')->getValue());
        $this->assertSame('Pedro Santos', $sheet->getCell('A2')->getValue());
        $this->assertSame('Maria Santos', $sheet->getCell('A3')->getValue());
        $this->assertSame('Credit Card (BPI)', $sheet->getCell('R1')->getValue());

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
            'employee_id' => 'EMP-SR-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
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

    private function createCustomer(string $firstName, string $lastName): Customer
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

        return $customer;
    }

    private function createSession(
        Employee $cashier,
        Warehouse $warehouse,
        Carbon $shiftStart,
        string $status = PosSession::STATUS_OPENED,
    ): PosSession {
        return PosSession::create([
            'employee_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'closing_balance' => $status === PosSession::STATUS_CLOSED ? 1000 : null,
            'shift_start_time' => $shiftStart,
            'shift_end_time' => $status === PosSession::STATUS_CLOSED ? $shiftStart->copy()->addHours(8) : null,
            'status' => $status,
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
            'serial_number' => $serial ?? sprintf('REPORT-%03d', $sequence),
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
        array $payments,
        Employee $salesRep,
        Carbon $createdAt,
        ?string $orNumber = null,
    ): SalesTransaction {
        $sequence = $this->transactionSequence++;
        $totalAmount = collect($payments)->sum('amount');

        $transaction = SalesTransaction::create([
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
            'sales_representative_id' => $salesRep->id,
            'or_number' => $orNumber ?? 'OR-'.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT),
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'total_amount' => $totalAmount,
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
            'line_total' => $totalAmount,
            'is_bundle' => false,
        ]);

        foreach ($payments as $paymentConfig) {
            $payment = SalesTransactionPayment::create([
                'sales_transaction_id' => $transaction->id,
                'payment_method_id' => $paymentConfig['method']->id,
                'amount' => $paymentConfig['amount'],
            ]);

            if (! empty($paymentConfig['detail'])) {
                SalesTransactionPaymentDetail::create([
                    'sales_transaction_payment_id' => $payment->id,
                    'reference_number' => $paymentConfig['detail']['reference_number'] ?? null,
                    'bank' => $paymentConfig['detail']['bank'] ?? null,
                    'loan_term_months' => $paymentConfig['detail']['loan_term_months'] ?? null,
                ]);
            }
        }

        return $transaction->fresh();
    }

    private function createCustomerDefaults(): void
    {
        CustomerGroup::firstOrCreate(['name' => 'Walk-in']);
        CustomerType::firstOrCreate(['name' => 'retail']);
    }
}
