<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\Department;
use App\Models\DeliveryReceipt;
use App\Models\Employee;
use App\Models\GoodsReceipt;
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
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class PlacementReportsFeatureTest extends TestCase
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

    public function test_placement_reports_index_renders_via_inertia_and_route_is_live(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);
        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256-BLK'],
        ]);

        $this->createInventoryItem($variant, $warehouse, status: 'available', cost: 15000);

        $this->assertSame('/placement-reports', route('placement-reports.index', absolute: false));

        $this->actingAs($user)
            ->get(route('placement-reports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PlacementReports')
                ->where('filters.search', '')
                ->where('filters.warehouse', 'all')
                ->where('filters.supplier', 'all')
                ->where('filters.sort', 'display_name')
                ->where('filters.direction', 'asc')
                ->has('warehouses', 1)
                ->has('suppliers')
                ->has('rows', 1)
                ->where('pagination.page', 1)
                ->where('pagination.hasMore', false)
                ->where('summary.totalUniqueProducts', 1)
                ->where('summary.totalItems', 1)
                ->where('footerTotals.grandTotal', 1)
            );
    }

    public function test_placement_reports_filters_sorts_and_summaries_are_server_side(): void
    {
        $user = User::factory()->create();
        $mainWarehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);
        $branchWarehouse = Warehouse::create([
            'name' => 'Branch Store',
            'warehouse_type' => 'store',
            'sort_order' => 2,
        ]);

        [$iphoneVariant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256-BLK'],
        ]);
        [$ipadVariant] = $this->createProductGraph('Apple', 'iPad Pro', 'APPLE-IPADPRO', [
            ['name' => '512GB Silver', 'sku' => 'APPLE-IPADPRO-512-SLV'],
        ]);
        [$galaxyVariant] = $this->createProductGraph('Samsung', 'Galaxy Tab Ultra', 'SAMSUNG-TABULTRA', [
            ['name' => '512GB Gray', 'sku' => 'SAMSUNG-TABULTRA-512-GRY'],
        ]);

        $this->createInventoryItem($iphoneVariant, $mainWarehouse, status: 'available', cost: 12000);
        $this->createInventoryItem($iphoneVariant, $mainWarehouse, status: 'available', cost: 13000);
        $this->createInventoryItem($iphoneVariant, $branchWarehouse, status: 'available', cost: 12500);
        $this->createInventoryItem($iphoneVariant, $branchWarehouse, status: 'available', cost: 12600);

        $this->createInventoryItem($ipadVariant, $branchWarehouse, status: 'available', cost: 20000);

        $this->createInventoryItem($galaxyVariant, $branchWarehouse, status: 'available', cost: 11000);
        $this->createInventoryItem($galaxyVariant, $branchWarehouse, status: 'available', cost: 11200);

        $this->actingAs($user)
            ->get(route('placement-reports.index', [
                'search' => 'Apple',
                'warehouse' => $branchWarehouse->id,
                'sort' => 'warehouse',
                'sort_warehouse_id' => $branchWarehouse->id,
                'direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.search', 'Apple')
                ->where('filters.warehouse', (string) $branchWarehouse->id)
                ->where('filters.sort', 'warehouse')
                ->where('filters.sort_warehouse_id', (string) $branchWarehouse->id)
                ->where('filters.direction', 'desc')
                ->where('rows.0.display_name', 'Apple iPhone 17')
                ->where('rows.0.warehouses.'.$branchWarehouse->id, 2)
                ->where('rows.1.display_name', 'Apple iPad Pro')
                ->where('summary.totalUniqueProducts', 2)
                ->where('summary.totalItems', 5)
                ->where('summary.totalStores', 2)
                ->where('footerTotals.grandTotal', 5)
                ->where('footerTotals.warehouses.'.$mainWarehouse->id, 2)
                ->where('footerTotals.warehouses.'.$branchWarehouse->id, 3)
            );
    }

    public function test_placement_reports_supplier_filter_is_server_side(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);

        $supplierA = $this->createSupplier('SUP-A', 'Supplier Alpha');
        $supplierB = $this->createSupplier('SUP-B', 'Supplier Beta');

        [$variantA] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256-BLK'],
        ]);
        [$variantB] = $this->createProductGraph('Samsung', 'Galaxy Tab', 'SAMSUNG-TAB', [
            ['name' => '256GB Gray', 'sku' => 'SAMSUNG-TAB-256-GRY'],
        ]);

        $itemA1 = $this->createInventoryItem($variantA, $warehouse, status: 'available', cost: 15000);
        $itemA2 = $this->createInventoryItem($variantA, $warehouse, status: 'available', cost: 15100);
        $itemB1 = $this->createInventoryItem($variantB, $warehouse, status: 'available', cost: 11000);

        $this->attachInventoryItemToSupplier($itemA1, $supplierA, 'GRN-A-001');
        $this->attachInventoryItemToSupplier($itemA2, $supplierA, 'GRN-A-002');
        $this->attachInventoryItemToSupplier($itemB1, $supplierB, 'GRN-B-001');

        $this->actingAs($user)
            ->get(route('placement-reports.index', ['supplier' => $supplierA->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.supplier', (string) $supplierA->id)
                ->where('rows.0.display_name', 'Apple iPhone 17')
                ->where('rows.0.total', 2)
                ->where('summary.totalUniqueProducts', 1)
                ->where('summary.totalItems', 2)
                ->where('footerTotals.grandTotal', 2)
            );
    }

    public function test_placement_reports_lazy_rows_endpoint_returns_page_two_without_duplicates(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);

        foreach (range(1, 55) as $index) {
            [$variant] = $this->createProductGraph(
                'Brand '.$index,
                'Model '.$index,
                'MASTER-'.$index,
                [['name' => 'Variant '.$index, 'sku' => 'SKU-'.$index]],
            );

            $this->createInventoryItem($variant, $warehouse, status: 'available', cost: 1000 + $index);
        }

        $response = $this->actingAs($user)->get(route('placement-reports.index'));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('rows', 50)
            ->where('pagination.page', 1)
            ->where('pagination.hasMore', true)
            ->where('pagination.total', 55)
        );

        $this->actingAs($user)
            ->get(route('placement-reports.index', ['page' => 2]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows', 5)
                ->where('pagination.page', 2)
                ->where('pagination.hasMore', false)
                ->where('pagination.total', 55)
            );

        $pageTwo = $this->actingAs($user)
            ->getJson(route('placement-reports.rows', ['page' => 2]))
            ->assertOk()
            ->json();

        $this->assertCount(5, $pageTwo['rows']);
        $this->assertFalse($pageTwo['pagination']['hasMore']);
        $this->assertCount(
            5,
            array_unique(array_column($pageTwo['rows'], 'product_master_id'))
        );
    }

    public function test_placement_reports_variant_and_item_drilldowns_are_server_backed(): void
    {
        $user = User::factory()->create();
        $mainWarehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);
        $branchWarehouse = Warehouse::create([
            'name' => 'Branch Store',
            'warehouse_type' => 'store',
            'sort_order' => 2,
        ]);

        [$variantA, $variantB, $master] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256-BLK'],
            ['name' => '512GB Blue', 'sku' => 'APPLE-IPHONE17-512-BLU'],
        ]);
        [$otherVariant] = $this->createProductGraph('Samsung', 'Galaxy Tab Ultra', 'SAMSUNG-TABULTRA', [
            ['name' => '512GB Gray', 'sku' => 'SAMSUNG-TABULTRA-512-GRY'],
        ]);

        $this->createInventoryItem($variantA, $mainWarehouse, status: 'available', cost: 15000);
        $this->createInventoryItem($variantA, $branchWarehouse, status: 'available', cost: 15100);
        $this->createInventoryItem($variantB, $branchWarehouse, status: 'available', cost: 16000);
        $this->createInventoryItem($otherVariant, $branchWarehouse, status: 'available', cost: 12000);

        $this->actingAs($user)
            ->getJson(route('placement-reports.variants', [
                'productMaster' => $master->id,
                'warehouse' => $mainWarehouse->id,
            ]))
            ->assertOk()
            ->assertJsonCount(2, 'variants')
            ->assertJsonPath('variants.0.variant_name', '256GB Black')
            ->assertJsonPath('variants.0.warehouseMetricQty', 1)
            ->assertJsonPath('variants.1.variant_name', '512GB Blue')
            ->assertJsonPath('variants.1.warehouseMetricQty', 0);

        $itemResponse = $this->actingAs($user)
            ->getJson(route('placement-reports.items', [
                'warehouse_id' => $branchWarehouse->id,
                'variant_id' => $variantA->id,
            ]))
            ->assertOk()
            ->json();

        $this->assertCount(1, $itemResponse['items']);
        $this->assertSame('Branch Store', $itemResponse['warehouseName']);
        $this->assertSame('256GB Black', $itemResponse['variantName']);
        $this->assertSame($branchWarehouse->id, $itemResponse['items'][0]['warehouse_id']);
        $this->assertSame($variantA->id, $itemResponse['items'][0]['variant_id']);
    }

    public function test_placement_reports_metrics_and_csv_export_respect_server_side_filters(): void
    {
        $user = User::factory()->create();
        $mainWarehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);
        $branchWarehouse = Warehouse::create([
            'name' => 'Branch Store',
            'warehouse_type' => 'store',
            'sort_order' => 2,
        ]);

        [$variantA, $variantB] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256-BLK'],
            ['name' => '512GB Blue', 'sku' => 'APPLE-IPHONE17-512-BLU'],
        ]);
        [$otherVariant] = $this->createProductGraph('Samsung', 'Galaxy Tab Ultra', 'SAMSUNG-TABULTRA', [
            ['name' => '512GB Gray', 'sku' => 'SAMSUNG-TABULTRA-512-GRY'],
        ]);

        $this->createInventoryItem($variantA, $mainWarehouse, status: 'available', cost: 15000);
        $this->createInventoryItem($variantA, $mainWarehouse, status: 'available', cost: 15200);
        $this->createInventoryItem($variantB, $mainWarehouse, status: 'available', cost: 16000);
        $this->createInventoryItem($otherVariant, $branchWarehouse, status: 'available', cost: 12000);

        $sold15A = $this->createInventoryItem($variantA, $mainWarehouse, status: 'sold', cost: 10000, cash: 18000);
        $sold15B = $this->createInventoryItem($variantB, $mainWarehouse, status: 'sold', cost: 10000, cash: 19000);
        $sold30Only = $this->createInventoryItem($variantA, $mainWarehouse, status: 'sold', cost: 10000, cash: 18000);
        $otherWarehouseSale = $this->createInventoryItem($variantA, $branchWarehouse, status: 'sold', cost: 10000, cash: 18000);

        $this->createSaleForInventory($sold15A, $mainWarehouse, now()->subDays(5));
        $this->createSaleForInventory($sold15B, $mainWarehouse, now()->subDays(10));
        $this->createSaleForInventory($sold30Only, $mainWarehouse, now()->subDays(20));
        $this->createSaleForInventory($otherWarehouseSale, $branchWarehouse, now()->subDays(7));

        $this->actingAs($user)
            ->get(route('placement-reports.index', ['warehouse' => $mainWarehouse->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.0.display_name', 'Apple iPhone 17')
                ->where('rows.0.sold15', 2)
                ->where('rows.0.sold30', 3)
                ->where('rows.0.avgSellOutPerDay', 0.13)
                ->where('rows.0.inventoryLifeDays', 23.1)
                ->where('rows.0.suggestedPoQty', 1)
            );

        $response = $this->actingAs($user)->get(route('placement-reports.export.csv', [
            'warehouse' => $mainWarehouse->id,
            'search' => 'Apple',
        ]));

        $response->assertOk();
        $response->assertDownload('placement_report_'.now()->format('Y-m-d').'.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('256GB Black', $content);
        $this->assertStringContainsString('512GB Blue', $content);
        $this->assertStringNotContainsString('512GB Gray', $content);
        $this->assertStringContainsString('15 Day Sell Out', $content);
    }

    public function test_placement_reports_xlsx_export_returns_variant_level_rows(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Main Branch',
            'warehouse_type' => 'store',
            'sort_order' => 1,
        ]);

        [$variantA, $variantB] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256-BLK'],
            ['name' => '512GB Blue', 'sku' => 'APPLE-IPHONE17-512-BLU'],
        ]);

        $this->createInventoryItem($variantA, $warehouse, status: 'available', cost: 15000);
        $this->createInventoryItem($variantB, $warehouse, status: 'available', cost: 16000);

        $response = $this->actingAs($user)->get(route('placement-reports.export.xlsx'));

        $response->assertOk();
        $response->assertDownload('placement_report_'.now()->format('Y-m-d').'.xlsx');

        $tempFile = tempnam(sys_get_temp_dir(), 'placement-xlsx-');
        file_put_contents($tempFile, $response->streamedContent());

        $spreadsheet = IOFactory::load($tempFile);
        $sheet = $spreadsheet->getActiveSheet();

        $this->assertSame('Product', $sheet->getCell('A1')->getValue());
        $this->assertSame('Variant', $sheet->getCell('B1')->getValue());
        $this->assertSame('256GB Black', $sheet->getCell('B2')->getValue());
        $this->assertSame('512GB Blue', $sheet->getCell('B3')->getValue());

        @unlink($tempFile);
    }

    private function createProductGraph(string $brandName, string $modelName, string $masterSku, array $variantDefinitions): array
    {
        $brand = ProductBrand::firstOrCreate(['name' => $brandName]);
        $category = ProductCategory::firstOrCreate([
            'name' => 'Phones',
            'parent_category_id' => null,
        ]);
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
        string $status = 'available',
        float $cost = 10000,
        ?float $cash = null,
    ): InventoryItem {
        $sequence = $this->inventorySequence++;

        return InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => sprintf('990000000000%03d', $sequence),
            'serial_number' => sprintf('PLACEMENT-%03d', $sequence),
            'status' => $status,
            'cost_price' => $cost,
            'cash_price' => $cash ?? ($cost + 2000),
            'srp_price' => ($cash ?? ($cost + 2000)) + 500,
        ]);
    }

    private function createSupplier(string $code, string $legalName): Supplier
    {
        return Supplier::create([
            'supplier_code' => $code,
            'legal_business_name' => $legalName,
            'trade_name' => $legalName,
            'status' => 'Active',
        ]);
    }

    private function attachInventoryItemToSupplier(InventoryItem $item, Supplier $supplier, string $grnNumber): void
    {
        $deliveryReceipt = DeliveryReceipt::create([
            'supplier_id' => $supplier->id,
            'dr_number' => 'DR-'.$grnNumber,
            'date_received' => now(),
            'date_encoded' => now(),
            'has_goods_receipt' => true,
        ]);

        GoodsReceipt::create([
            'grn_number' => $grnNumber,
            'delivery_receipt_id' => $deliveryReceipt->id,
            'status' => 'completed',
        ]);

        $item->forceFill(['grn_number' => $grnNumber])->save();
    }

    private function createSaleForInventory(InventoryItem $inventoryItem, Warehouse $warehouse, Carbon $createdAt): void
    {
        $user = User::factory()->create();
        $session = PosSession::create([
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $transaction = SalesTransaction::create([
            'customer_id' => Customer::create([
                'firstname' => 'Walk',
                'lastname' => 'In '.$this->transactionSequence,
            ])->id,
            'pos_session_id' => $session->id,
            'or_number' => 'OR-'.str_pad((string) $this->transactionSequence, 5, '0', STR_PAD_LEFT),
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'total_amount' => $inventoryItem->cash_price ?? 1000,
        ]);

        $transaction->timestamps = false;
        $transaction->forceFill([
            'created_at' => $createdAt->copy(),
            'updated_at' => $createdAt->copy(),
        ])->saveQuietly();

        SalesTransactionItem::create([
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $inventoryItem->id,
            'price_basis' => SalesTransactionItem::PRICE_BASIS_CASH,
            'snapshot_cash_price' => $inventoryItem->cash_price,
            'snapshot_srp' => $inventoryItem->srp_price,
            'snapshot_cost_price' => $inventoryItem->cost_price,
            'discount_amount' => 0,
            'line_total' => $inventoryItem->cash_price ?? 1000,
            'is_bundle' => false,
        ]);

        $this->transactionSequence++;
    }

    private function createEmployee(): Employee
    {
        $sequence = $this->employeeSequence++;

        return Employee::create([
            'employee_id' => 'EMP-PL-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
            'job_title_id' => $this->createGenericJobTitle()->id,
            'first_name' => 'Placement',
            'last_name' => 'Cashier '.$sequence,
            'status' => Employee::STATUS_ACTIVE,
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

    private function createCustomerDefaults(): void
    {
        CustomerGroup::firstOrCreate(['name' => 'Walk-in']);
        CustomerType::firstOrCreate(['name' => 'retail']);
    }
}
