<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\StockRequest;
use App\Models\StockRequestStatusHistory;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockRequestsFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_server_driven_props_and_filters_by_tab(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create(['name' => 'Branch A', 'warehouse_type' => 'store']);

        StockRequest::create([
            'request_number' => 'SR-20260413-0001',
            'warehouse_id' => $warehouse->id,
            'requestor_id' => $user->id,
            'required_at' => now()->addDay(),
            'purpose' => 'Replenishment',
            'status' => 'pending',
        ]);

        StockRequest::create([
            'request_number' => 'SR-20260413-0002',
            'warehouse_id' => $warehouse->id,
            'requestor_id' => $user->id,
            'required_at' => now()->addDays(2),
            'purpose' => 'Display Refill',
            'status' => 'declined',
        ]);

        $this->actingAs($user)
            ->get(route('stock-requests.index', ['status_tab' => 'Pending']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('StockRequests')
                ->where('filters.status_tab', 'Pending')
                ->where('pagination.page', 1)
                ->where('pagination.per_page', 10)
                ->has('requests', 1)
                ->where('requests.0.status', 'pending')
                ->where('kpis.total', 1)
            );
    }

    public function test_store_creates_request_items_and_initial_history(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create(['name' => 'Branch B', 'warehouse_type' => 'store']);
        $variant = $this->createVariant();

        $this->actingAs($user)
            ->postJson(route('stock-requests.store'), [
                'warehouse_id' => $warehouse->id,
                'required_at' => now()->addDays(3)->toIso8601String(),
                'purpose' => 'Replenishment',
                'notes' => 'Urgent refill',
                'items' => [
                    [
                        'variant_id' => $variant->id,
                        'quantity' => 3,
                        'reason' => 'Top sellers',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('request.status', 'pending');

        $this->assertDatabaseHas('stock_requests', [
            'warehouse_id' => $warehouse->id,
            'requestor_id' => $user->id,
            'status' => 'pending',
            'purpose' => 'Replenishment',
        ]);

        $requestId = StockRequest::query()->value('id');

        $this->assertDatabaseHas('stock_request_items', [
            'stock_request_id' => $requestId,
            'variant_id' => $variant->id,
            'quantity' => 3,
            'reason' => 'Top sellers',
        ]);

        $this->assertDatabaseHas('stock_request_status_histories', [
            'stock_request_id' => $requestId,
            'status' => 'pending',
            'actor_id' => $user->id,
        ]);
    }

    public function test_export_uses_same_filter_contract(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create(['name' => 'Branch C', 'warehouse_type' => 'store']);

        StockRequest::create([
            'request_number' => 'SR-20260413-0100',
            'warehouse_id' => $warehouse->id,
            'requestor_id' => $user->id,
            'required_at' => now()->addDay(),
            'purpose' => 'Replenishment',
            'status' => 'pending',
        ]);

        StockRequest::create([
            'request_number' => 'SR-20260413-0101',
            'warehouse_id' => $warehouse->id,
            'requestor_id' => $user->id,
            'required_at' => now()->addDay(),
            'purpose' => 'Replenishment',
            'status' => 'declined',
        ]);

        $response = $this->actingAs($user)
            ->get(route('stock-requests.export', [
                'status_tab' => 'Pending',
                'sort' => 'created_at',
                'direction' => 'desc',
            ]));

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $csvContent = $response->streamedContent();
        $this->assertStringContainsString('SR-20260413-0100', $csvContent);
        $this->assertStringNotContainsString('SR-20260413-0101', $csvContent);
    }

    public function test_catalog_returns_more_info_metrics_payload(): void
    {
        Carbon::setTestNow('2026-04-13 09:00:00');

        $user = User::factory()->create();
        $mainWarehouse = Warehouse::create(['name' => 'Main Warehouse', 'warehouse_type' => 'main_warehouse']);
        $branchWarehouse = Warehouse::create(['name' => 'Branch D', 'warehouse_type' => 'store']);
        $variant = $this->createVariant();

        $branchInventory = \App\Models\InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $branchWarehouse->id,
            'imei' => '900000000001',
            'serial_number' => 'CAT-001',
            'status' => 'available',
            'cost_price' => 1000,
        ]);
        \App\Models\InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $mainWarehouse->id,
            'imei' => '900000000002',
            'serial_number' => 'CAT-002',
            'status' => 'available',
            'cost_price' => 1000,
        ]);

        $transfer = StockTransfer::create([
            'transfer_number' => 'TRN-00000001',
            'source_warehouse_id' => $mainWarehouse->id,
            'destination_warehouse_id' => $branchWarehouse->id,
            'created_by_id' => $user->id,
            'status' => 'shipped',
        ]);
        StockTransferItem::create([
            'stock_transfer_id' => $transfer->id,
            'inventory_item_id' => $branchInventory->id,
            'is_picked' => true,
            'is_shipped' => true,
            'is_received' => false,
        ]);

        $this->actingAs($user)
            ->getJson(route('stock-requests.catalog', [
                'search' => 'Apple',
                'warehouse_id' => $branchWarehouse->id,
            ]))
            ->assertOk()
            ->assertJsonPath('items.0.id', $variant->id)
            ->assertJsonPath('items.0.metrics.current_stock', 1)
            ->assertJsonPath('items.0.metrics.main_warehouse_stock', 1)
            ->assertJsonPath('items.0.metrics.incoming_transfer_to_branch.quantity', 1)
            ->assertJsonPath('items.0.metrics.ads.ads7', 0)
            ->assertJsonPath('items.0.metrics.ads.ads14', 0)
            ->assertJsonPath('items.0.metrics.ads.ads28', 0);

        Carbon::setTestNow();
    }

    private function createVariant(): ProductVariant
    {
        $brand = ProductBrand::create(['name' => 'Apple']);
        $category = ProductCategory::create(['name' => 'Phones', 'parent_category_id' => null]);
        $subcategory = ProductCategory::create(['name' => 'Smartphones', 'parent_category_id' => $category->id]);
        $model = ProductModel::create(['brand_id' => $brand->id, 'model_name' => 'iPhone 17']);
        $master = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $master->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
    }
}
