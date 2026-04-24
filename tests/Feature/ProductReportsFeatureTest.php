<?php

namespace Tests\Feature;

use App\Models\Customer;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductReportsFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_product_reports_index_is_server_driven_and_returns_expected_props(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);

        $cashier = User::factory()->create();
        $session = PosSession::create([
            'user_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now()->subHour(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $customer = Customer::create([
            'customer_kind' => Customer::KIND_PERSON,
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
            'status' => Customer::STATUS_ACTIVE,
        ]);

        $parentCategory = ProductCategory::create(['name' => 'Phones']);
        $subcategory = ProductCategory::create([
            'name' => 'Smartphones',
            'parent_category_id' => $parentCategory->id,
        ]);

        $brand = ProductBrand::create(['name' => 'Apple']);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'iPhone 17',
        ]);
        $master = ProductMaster::create([
            'master_sku' => 'PM-001',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $variant = ProductVariant::create([
            'product_master_id' => $master->id,
            'model_code' => 'A17',
            'sku' => 'A17-BLK-256',
            'condition' => 'Brand New',
            'color' => 'Black',
            'ram' => '8GB',
            'rom' => '256GB',
            'is_active' => true,
        ]);

        $inventory = \App\Models\InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '123456789012345',
            'status' => 'available',
            'cost_price' => 22000,
            'cash_price' => 30000,
            'srp_price' => 32000,
        ]);

        $transaction = SalesTransaction::create([
            'or_number' => 'OR-PR-1',
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
            'total_amount' => 30000,
        ]);

        SalesTransactionItem::create([
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $inventory->id,
            'price_basis' => SalesTransactionItem::PRICE_BASIS_CASH,
            'snapshot_cost_price' => 22000,
            'line_total' => 30000,
        ]);

        $method = PaymentMethod::create(['name' => 'Credit Card', 'type' => 'card']);
        $payment = SalesTransactionPayment::create([
            'sales_transaction_id' => $transaction->id,
            'payment_method_id' => $method->id,
            'amount' => 30000,
        ]);
        SalesTransactionPaymentDetail::create([
            'sales_transaction_payment_id' => $payment->id,
            'bank' => 'BPI',
            'reference_number' => 'CC-001',
        ]);

        $this->actingAs($user)
            ->get(route('product-reports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProductReports')
                ->where('filters.sortBy', 'rawDate')
                ->where('filters.sortDir', 'desc')
                ->where('pagination.page', 1)
                ->where('summary.totalRows', 1)
                ->where('summary.totalQuantity', 1)
                ->where('summary.uniqueTransactions', 1)
                ->where('rows.0.branch', 'Main Branch')
                ->where('rows.0.brand', 'Apple')
                ->where('rows.0.paymentType', 'Credit Card (BPI) (?30,000.00)')
            );
    }

    public function test_product_reports_sanitizes_invalid_query_contract_values(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('product-reports.index', [
                'sort' => 'drop table',
                'direction' => 'sideways',
                'per_page' => 5,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sortBy', 'rawDate')
                ->where('filters.sortDir', 'desc')
                ->where('filters.perPage', 25)
                ->where('pagination.per_page', 25)
            );
    }

    public function test_product_reports_csv_and_xlsx_exports_are_available(): void
    {
        $user = User::factory()->create();

        $csv = $this->actingAs($user)->get(route('product-reports.export.csv'));
        $csv->assertOk();
        $csv->assertDownload('product_reports_'.now()->format('Y-m-d').'.csv');

        $xlsx = $this->actingAs($user)->get(route('product-reports.export.xlsx'));
        $xlsx->assertOk();
        $xlsx->assertDownload('product_reports_'.now()->format('Y-m-d').'.xlsx');
    }
}
