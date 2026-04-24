<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\InventoryItem;
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
use Tests\TestCase;

class SalesProfitTrackerFeatureTest extends TestCase
{
    use RefreshDatabase;
    private int $inventorySequence = 1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        CustomerGroup::firstOrCreate(['name' => 'Walk-in']);
        CustomerType::firstOrCreate(['name' => 'retail']);
    }

    public function test_sales_profit_tracker_index_is_server_driven_and_returns_expected_props(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);

        $this->seedTransaction(
            warehouse: $warehouse,
            totalAmount: 10000,
            totalCost: 7000,
            createdAt: Carbon::create(2026, 4, 15, 11, 0, 0),
            method: 'Credit Card',
            loanTermMonths: 6,
            bank: 'BPI'
        );

        $this->actingAs($user)
            ->get(route('sales-profit-tracker.index', [
                'period' => 'monthly',
                'reference_date' => '2026-04-24',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SalesProfitTracker')
                ->where('filters.period', 'monthly')
                ->where('filters.referenceDate', '2026-04-24')
                ->where('filters.warehouseId', 'all')
                ->where('pagination.page', 1)
                ->where('pagination.per_page', 15)
                ->where('pagination.total', 1)
                ->where('kpis.current.totalRevenue', 10000)
                ->where('kpis.current.totalCost', 7000)
                ->where('kpis.current.grossProfit', 3000)
                ->where('rows.0.warehouseName', 'Main Branch')
                ->where('rows.0.mdr', 650)
            );
    }

    public function test_sales_profit_tracker_sanitizes_invalid_contract_values(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('sales-profit-tracker.index', [
                'period' => 'invalid',
                'reference_date' => 'not-a-date',
                'warehouse_id' => '999999',
                'sort' => 'drop table',
                'direction' => 'sideways',
                'per_page' => 5,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.period', 'monthly')
                ->where('filters.warehouseId', 'all')
                ->where('filters.sort', 'transaction_date')
                ->where('filters.direction', 'desc')
                ->where('filters.perPage', 15)
                ->where('pagination.per_page', 15)
            );
    }

    public function test_sales_profit_tracker_filter_search_and_pagination_are_server_side(): void
    {
        $user = User::factory()->create();
        $main = Warehouse::create(['name' => 'Main Branch', 'warehouse_type' => 'store', 'sort_order' => 1]);
        $branch = Warehouse::create(['name' => 'Branch Store', 'warehouse_type' => 'store', 'sort_order' => 2]);

        foreach (range(1, 16) as $i) {
            $this->seedTransaction(
                warehouse: $main,
                totalAmount: 1000 + $i,
                totalCost: 600,
                createdAt: Carbon::create(2026, 4, 1)->addDays($i - 1),
                method: 'Cash',
                transactionNumber: 'M-'.$i,
            );
        }

        $this->seedTransaction(
            warehouse: $branch,
            totalAmount: 5000,
            totalCost: 2500,
            createdAt: Carbon::create(2026, 4, 12, 10, 30, 0),
            method: 'Cash',
            transactionNumber: 'B-999',
        );

        $this->actingAs($user)
            ->get(route('sales-profit-tracker.index', [
                'period' => 'monthly',
                'reference_date' => '2026-04-24',
                'warehouse_id' => (string) $branch->id,
                'search' => 'B-999',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.0.transactionNumber', 'B-999')
                ->where('pagination.total', 1)
            );

        $this->actingAs($user)
            ->get(route('sales-profit-tracker.index', [
                'period' => 'monthly',
                'reference_date' => '2026-04-24',
                'warehouse_id' => (string) $main->id,
                'per_page' => 15,
                'page' => 2,
                'sort' => 'transaction_date',
                'direction' => 'asc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagination.total', 16)
                ->where('pagination.page', 2)
                ->has('rows', 1)
                ->where('rows.0.transactionNumber', 'M-16')
            );
    }

    public function test_sales_profit_tracker_csv_export_reuses_filters(): void
    {
        $user = User::factory()->create();
        $main = Warehouse::create(['name' => 'Main Branch', 'warehouse_type' => 'store', 'sort_order' => 1]);
        $branch = Warehouse::create(['name' => 'Branch Store', 'warehouse_type' => 'store', 'sort_order' => 2]);

        $this->seedTransaction($main, 9000, 6000, Carbon::create(2026, 4, 10), 'Cash', transactionNumber: 'MAIN-TXN');
        $this->seedTransaction($branch, 11000, 7000, Carbon::create(2026, 4, 11), 'Cash', transactionNumber: 'BRANCH-TXN');

        $response = $this->actingAs($user)->get(route('sales-profit-tracker.export.csv', [
            'period' => 'monthly',
            'reference_date' => '2026-04-24',
            'warehouse_id' => (string) $branch->id,
            'search' => 'BRANCH-TXN',
        ]));

        $response->assertOk();
        $response->assertDownload('sales_profit_tracker_'.now()->format('Y-m-d').'.csv');

        $content = $response->streamedContent();
        $this->assertStringContainsString('BRANCH-TXN', $content);
        $this->assertStringNotContainsString('MAIN-TXN', $content);
    }

    private function seedTransaction(
        Warehouse $warehouse,
        float $totalAmount,
        float $totalCost,
        Carbon $createdAt,
        string $method,
        ?int $loanTermMonths = null,
        ?string $bank = null,
        ?string $transactionNumber = null,
    ): void {
        $cashier = User::factory()->create();

        $session = PosSession::create([
            'user_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now()->subHours(4),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $customer = Customer::create([
            'customer_kind' => Customer::KIND_PERSON,
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
            'status' => Customer::STATUS_ACTIVE,
        ]);
        $inventoryItem = $this->createInventoryItem($warehouse, $totalAmount, $totalCost);

        $transaction = SalesTransaction::create([
            'transaction_number' => $transactionNumber,
            'or_number' => 'OR-'.uniqid(),
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
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
            'snapshot_cost_price' => $totalCost,
            'line_total' => $totalAmount,
        ]);

        $paymentMethod = PaymentMethod::firstOrCreate(['name' => $method], ['type' => 'cash']);

        $payment = SalesTransactionPayment::create([
            'sales_transaction_id' => $transaction->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => $totalAmount,
        ]);

        SalesTransactionPaymentDetail::create([
            'sales_transaction_payment_id' => $payment->id,
            'loan_term_months' => $loanTermMonths,
            'bank' => $bank,
        ]);
    }

    private function createInventoryItem(Warehouse $warehouse, float $cashPrice, float $costPrice): InventoryItem
    {
        $sequence = $this->inventorySequence++;
        $category = ProductCategory::firstOrCreate(['name' => 'Phones']);
        $brand = ProductBrand::firstOrCreate(['name' => 'Apple']);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'iPhone 17 '.$sequence,
        ]);
        $master = ProductMaster::create([
            'master_sku' => 'SPT-'.$sequence,
            'model_id' => $model->id,
            'subcategory_id' => $category->id,
        ]);
        $variant = ProductVariant::create([
            'product_master_id' => $master->id,
            'sku' => 'SPT-'.$sequence.'-SKU',
            'model_code' => 'SPT-'.$sequence,
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        return InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => sprintf('990000000001%03d', $sequence),
            'status' => 'sold',
            'cost_price' => $costPrice,
            'cash_price' => $cashPrice,
            'srp_price' => $cashPrice,
        ]);
    }
}
