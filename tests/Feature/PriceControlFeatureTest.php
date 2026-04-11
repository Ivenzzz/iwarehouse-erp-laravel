<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PriceControlFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_price_control_index_returns_server_joined_rows_for_authenticated_users(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '111111111111111',
            'serial_number' => 'APPLE-001',
            'status' => 'active',
            'cash_price' => 12000,
            'srp_price' => 13000,
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '222222222222222',
            'serial_number' => 'APPLE-SOLD',
            'status' => 'sold',
            'cash_price' => 1,
            'srp_price' => 2,
        ]);

        $this->actingAs($user)->get(route('price-control.index', [
            'mode' => 'variant',
            'variant_id' => $variant->id,
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PriceControl')
                ->where('hasSearched', true)
                ->where('filters.mode', 'variant')
                ->where('filters.variant_id', $variant->id)
                ->where('inventory.total', 1)
                ->where('inventory.data.0.product_label', 'Apple iPhone 17')
                ->where('inventory.data.0.variant_label', 'Apple iPhone 17 8GB 256GB Black')
                ->where('inventory.data.0.identifier', '111111111111111')
                ->where('inventory.data.0.warehouse_name', 'Main Warehouse')
                ->where('inventory.data.0.status', 'available')
                ->where('inventory.data.0.cash_price_formatted', '₱12,000.00')
                ->where('inventory.data.0.srp_formatted', '₱13,000.00')
                ->has('warehouses', 1)
                ->missing('productMasters')
                ->missing('variants')
                ->missing('brands')
            );
    }

    public function test_variant_search_uses_server_side_joins(): void
    {
        $user = User::factory()->create();
        [$variant] = $this->createInventoryGraph();

        $this->actingAs($user)->getJson(route('price-control.variants', [
            'search' => 'Apple Black',
        ]))
            ->assertOk()
            ->assertJsonPath('variants.0.id', $variant->id)
            ->assertJsonPath('variants.0.variant_name', 'Apple iPhone 17 8GB 256GB Black')
            ->assertJsonPath('variants.0.description', 'Apple | iPhone 17 | Brand New');
    }

    public function test_identifier_search_filtering_sorting_and_pagination_are_server_side(): void
    {
        $user = User::factory()->create();
        [$variant, $mainWarehouse] = $this->createInventoryGraph();
        $branchWarehouse = Warehouse::create([
            'name' => 'Branch Warehouse',
            'warehouse_type' => 'warehouse',
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $mainWarehouse->id,
            'imei' => '333333333333333',
            'serial_number' => 'MAIN-001',
            'status' => 'available',
            'cash_price' => 14000,
            'srp_price' => 15000,
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $branchWarehouse->id,
            'imei' => '444444444444444',
            'serial_number' => 'BRANCH-001',
            'status' => 'reserved',
            'cash_price' => 9000,
            'srp_price' => 10000,
        ]);

        $this->actingAs($user)->get(route('price-control.index', [
            'mode' => 'identifier',
            'identifier' => '444444444444444',
            'warehouse' => $branchWarehouse->id,
            'status' => 'reserved',
            'sort' => 'cash_price',
            'direction' => 'desc',
            'perPage' => 10,
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.mode', 'identifier')
                ->where('filters.identifier', '444444444444444')
                ->where('filters.warehouse', (string) $branchWarehouse->id)
                ->where('filters.status', 'reserved')
                ->where('filters.sort', 'cash_price')
                ->where('filters.direction', 'desc')
                ->where('filters.perPage', 10)
                ->where('inventory.total', 1)
                ->where('inventory.per_page', 10)
                ->where('inventory.data.0.identifier', '444444444444444')
                ->where('inventory.data.0.warehouse_name', 'Branch Warehouse')
            );
    }

    public function test_price_update_preview_and_confirm_are_server_calculated_and_logged(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $eligibleItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '555555555555555',
            'serial_number' => 'PRICE-001',
            'status' => 'available',
            'cash_price' => 10000,
            'srp_price' => 11000,
        ]);

        $soldItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '666666666666666',
            'serial_number' => 'PRICE-SOLD',
            'status' => 'sold',
            'cash_price' => 100,
            'srp_price' => 200,
        ]);

        $this->actingAs($user)->postJson(route('price-control.preview'), [
            'itemIds' => [$eligibleItem->id, $soldItem->id],
            'newCashPrice' => 12345.67,
            'newSrp' => 15000,
        ])
            ->assertOk()
            ->assertJsonPath('selectedCount', 2)
            ->assertJsonPath('eligibleCount', 1)
            ->assertJsonPath('skippedCount', 1)
            ->assertJsonPath('newCashPriceFormatted', '₱12,345.67')
            ->assertJsonPath('newSrpFormatted', '₱15,000.00');

        $this->actingAs($user)->patchJson(route('price-control.prices'), [
            'itemIds' => [$eligibleItem->id, $soldItem->id],
            'newCashPrice' => 12345.67,
            'newSrp' => 15000,
        ])
            ->assertOk()
            ->assertJsonPath('succeeded.0', $eligibleItem->id)
            ->assertJsonPath('skipped.0', $soldItem->id);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $eligibleItem->id,
            'cash_price' => 12345.67,
            'srp_price' => 15000,
        ]);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $soldItem->id,
            'cash_price' => 100,
            'srp_price' => 200,
        ]);

        $log = $eligibleItem->logs()->where('action', 'PRICE_CHANGE')->first();

        $this->assertNotNull($log);
        $this->assertSame($user->id, $log->actor_id);
        $this->assertEquals(10000.0, $log->meta['changes']['cash_price']['old']);
        $this->assertSame(12345.67, $log->meta['changes']['cash_price']['new']);
        $this->assertEquals(11000.0, $log->meta['changes']['srp']['old']);
        $this->assertEquals(15000.0, $log->meta['changes']['srp']['new']);
    }

    public function test_price_control_export_respects_current_filters_and_sort(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '777777777777777',
            'serial_number' => 'EXPORT-001',
            'status' => 'available',
            'cash_price' => 20000,
            'srp_price' => 21000,
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '888888888888888',
            'serial_number' => 'EXPORT-SOLD',
            'status' => 'sold',
            'cash_price' => 1,
            'srp_price' => 2,
        ]);

        $response = $this->actingAs($user)->get(route('price-control.export', [
            'mode' => 'variant',
            'variant_id' => $variant->id,
            'status' => 'available',
            'sort' => 'identifier',
            'direction' => 'asc',
        ]));

        $response->assertOk();
        $response->assertDownload('price-control.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('777777777777777', $content);
        $this->assertStringNotContainsString('EXPORT-SOLD', $content);
        $this->assertStringContainsString('Apple iPhone 17', $content);
        $this->assertStringContainsString('Main Warehouse', $content);
    }

    /**
     * @return array{0: ProductVariant, 1: Warehouse, 2: ProductMaster}
     */
    private function createInventoryGraph(): array
    {
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
            'model_name' => 'iPhone 17',
        ]);
        $productMaster = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $variant = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
        $warehouse = Warehouse::create([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'main_warehouse',
        ]);

        return [$variant, $warehouse, $productMaster];
    }
}
