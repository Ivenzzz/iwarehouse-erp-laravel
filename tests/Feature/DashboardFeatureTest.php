<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\JobTitle;
use App\Models\PosSession;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        CustomerGroup::firstOrCreate(['name' => 'Walk-in']);
        CustomerType::firstOrCreate(['name' => 'retail']);
    }

    public function test_dashboard_loads_with_contract_shape(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-23 12:00:00'));
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('summary')
                ->has('summary.mtdSales')
                ->has('summary.mtdCogs')
                ->has('summary.salesCount')
                ->has('charts')
                ->has('charts.salesPerDay')
                ->has('charts.weeklySales')
                ->has('charts.brandSales')
                ->has('tables')
                ->has('tables.topProducts')
                ->has('tables.salesRepresentatives')
                ->has('period')
                ->where('period.month', 4)
                ->where('period.monthLabel', 'April')
                ->where('period.year', 2026)
            );
    }

    public function test_dashboard_monthly_aggregates_only_include_current_month(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-23 12:00:00'));
        $user = User::factory()->create();
        $graph = $this->createSalesGraph();

        $this->createTransaction(
            user: $user,
            warehouse: $graph['warehouse'],
            customer: $graph['customer'],
            variant: $graph['variantA'],
            soldAt: Carbon::parse('2026-04-05 11:00:00'),
            totalAmount: 10000,
            lineTotal: 10000,
            snapshotCost: 7000,
            salesRepresentative: null,
            orNumber: 'OR-APR-001',
        );

        $this->createTransaction(
            user: $user,
            warehouse: $graph['warehouse'],
            customer: $graph['customer'],
            variant: $graph['variantA'],
            soldAt: Carbon::parse('2026-03-28 11:00:00'),
            totalAmount: 9999,
            lineTotal: 9999,
            snapshotCost: 5000,
            salesRepresentative: null,
            orNumber: 'OR-MAR-001',
        );

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.mtdSales', 10000.0)
                ->where('summary.mtdCogs', 7000.0)
                ->where('summary.salesCount', 1)
            );
    }

    public function test_dashboard_rankings_and_chart_buckets_are_sorted_and_limited(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-23 12:00:00'));
        $user = User::factory()->create();
        $graph = $this->createSalesGraph();
        $repOne = $this->createSalesRep('Ana', 'Seller');
        $repTwo = $this->createSalesRep('Bea', 'Closer');

        $this->createTransaction(
            user: $user,
            warehouse: $graph['warehouse'],
            customer: $graph['customer'],
            variant: $graph['variantA'],
            soldAt: Carbon::parse('2026-04-03 10:00:00'),
            totalAmount: 20000,
            lineTotal: 20000,
            snapshotCost: 15000,
            salesRepresentative: $repOne,
            orNumber: 'OR-RANK-001',
        );

        $this->createTransaction(
            user: $user,
            warehouse: $graph['warehouse'],
            customer: $graph['customer'],
            variant: $graph['variantA'],
            soldAt: Carbon::parse('2026-04-10 10:00:00'),
            totalAmount: 15000,
            lineTotal: 15000,
            snapshotCost: 10000,
            salesRepresentative: $repOne,
            orNumber: 'OR-RANK-002',
        );

        $this->createTransaction(
            user: $user,
            warehouse: $graph['warehouse'],
            customer: $graph['customer'],
            variant: $graph['variantB'],
            soldAt: Carbon::parse('2026-04-11 10:00:00'),
            totalAmount: 12000,
            lineTotal: 12000,
            snapshotCost: 9000,
            salesRepresentative: $repTwo,
            orNumber: 'OR-RANK-003',
        );

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('tables.topProducts', 2)
                ->where('tables.topProducts.0.name', 'Alpha A1 128GB Black')
                ->where('tables.topProducts.0.qtySold', 2)
                ->where('tables.topProducts.0.revenue', 35000.0)
                ->where('tables.salesRepresentatives.0.name', 'Ana Seller')
                ->where('tables.salesRepresentatives.0.revenue', 35000.0)
                ->where('charts.salesPerDay.0.label', 'Apr 03')
                ->where('charts.weeklySales.0.label', 'Week 1')
            );
    }

    public function test_dashboard_returns_empty_payload_when_no_current_month_sales(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-23 12:00:00'));
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.mtdSales', 0.0)
                ->where('summary.mtdCogs', 0.0)
                ->where('summary.salesCount', 0)
                ->has('charts.salesPerDay', 0)
                ->has('charts.weeklySales', 0)
                ->has('charts.brandSales', 0)
                ->has('tables.topProducts', 0)
                ->has('tables.salesRepresentatives', 0)
            );
    }

    private function createSalesGraph(): array
    {
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
        ]);

        $customer = Customer::create([
            'firstname' => 'Juan',
            'lastname' => 'Buyer',
        ]);

        $brandA = ProductBrand::create(['name' => 'Alpha']);
        $brandB = ProductBrand::create(['name' => 'Beta']);

        $category = ProductCategory::create([
            'name' => 'Phones',
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Smartphones',
            'parent_category_id' => $category->id,
        ]);

        $modelA = ProductModel::create([
            'brand_id' => $brandA->id,
            'model_name' => 'A1',
        ]);
        $modelB = ProductModel::create([
            'brand_id' => $brandB->id,
            'model_name' => 'B1',
        ]);

        $masterA = ProductMaster::create([
            'master_sku' => 'ALPHA-A1',
            'model_id' => $modelA->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $masterB = ProductMaster::create([
            'master_sku' => 'BETA-B1',
            'model_id' => $modelB->id,
            'subcategory_id' => $subcategory->id,
        ]);

        $variantA = ProductVariant::create([
            'product_master_id' => $masterA->id,
            'model_code' => '128GB',
            'color' => 'Black',
            'is_active' => true,
        ]);
        $variantB = ProductVariant::create([
            'product_master_id' => $masterB->id,
            'model_code' => '256GB',
            'color' => 'Silver',
            'is_active' => true,
        ]);

        return [
            'warehouse' => $warehouse,
            'customer' => $customer,
            'variantA' => $variantA,
            'variantB' => $variantB,
        ];
    }

    private function createSalesRep(string $firstName, string $lastName): Employee
    {
        $department = Department::firstOrCreate(
            ['name' => 'Sales'],
            ['status' => Department::STATUS_ACTIVE]
        );

        $jobTitle = JobTitle::firstOrCreate(
            ['department_id' => $department->id, 'name' => 'Sales Representative'],
            ['status' => JobTitle::STATUS_ACTIVE]
        );

        return Employee::create([
            'employee_id' => 'EMP-'.strtoupper(substr($firstName, 0, 3)).'-'.strtoupper(substr($lastName, 0, 3)),
            'job_title_id' => $jobTitle->id,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'status' => Employee::STATUS_ACTIVE,
        ]);
    }

    private function createTransaction(
        User $user,
        Warehouse $warehouse,
        Customer $customer,
        ProductVariant $variant,
        Carbon $soldAt,
        float $totalAmount,
        float $lineTotal,
        float $snapshotCost,
        ?Employee $salesRepresentative,
        string $orNumber,
    ): SalesTransaction {
        $session = PosSession::create([
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'closing_balance' => 1000,
            'shift_start_time' => $soldAt->copy()->subHour(),
            'shift_end_time' => $soldAt->copy()->addHour(),
            'status' => PosSession::STATUS_CLOSED,
        ]);

        $inventoryItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => 'IMEI-'.str_replace('-', '', $orNumber),
            'serial_number' => 'SN-'.str_replace('-', '', $orNumber),
            'status' => 'sold',
            'cost_price' => $snapshotCost,
            'cash_price' => $lineTotal,
            'srp_price' => $lineTotal,
        ]);

        $transaction = SalesTransaction::create([
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
            'sales_representative_id' => $salesRepresentative?->id,
            'or_number' => $orNumber,
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'total_amount' => $totalAmount,
        ]);

        $transaction->forceFill([
            'created_at' => $soldAt,
            'updated_at' => $soldAt,
        ])->save();

        SalesTransactionItem::create([
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $inventoryItem->id,
            'price_basis' => SalesTransactionItem::PRICE_BASIS_CASH,
            'snapshot_cash_price' => $lineTotal,
            'snapshot_srp' => $lineTotal,
            'snapshot_cost_price' => $snapshotCost,
            'discount_amount' => 0,
            'line_total' => $lineTotal,
        ]);

        return $transaction;
    }
}

