<?php

namespace Tests\Feature;

use App\Models\CompanyInfo;
use App\Models\InventoryItem;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\StockTransfer;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockTransfersFeatureTest extends TestCase
{
    use RefreshDatabase;

    private const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9kAAAAASUVORK5CYII=';

    public function test_stock_transfer_page_and_lookup_endpoints_are_accessible(): void
    {
        $user = User::factory()->create();
        [$variant, $sourceWarehouse, $destinationWarehouse] = $this->createStockTransferGraph();
        CompanyInfo::create(['company_name' => 'iWarehouse Corp.']);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $sourceWarehouse->id,
            'imei' => '990000000000001',
            'serial_number' => 'ST-001',
            'status' => 'available',
            'cost_price' => 10000,
        ]);

        $this->actingAs($user)
            ->get(route('stock-transfers.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('StockTransfer')
                ->has('transfers', 0)
                ->has('warehouses', 2)
                ->where('companyInfo.company_name', 'iWarehouse Corp.')
                ->missing('users')
                ->missing('inventory')
                ->missing('productMasters')
                ->missing('variants')
                ->missing('productBrands')
            );

        $this->actingAs($user)
            ->getJson(route('stock-transfers.search-products', [
                'sourceLocationId' => $sourceWarehouse->id,
                'query' => 'Apple',
            ]))
            ->assertOk()
            ->assertJsonPath('0.variant_name', 'Apple iPhone 17 8GB 256GB Black')
            ->assertJsonPath('0.product_name', 'Apple iPhone 17')
            ->assertJsonPath('0.total_stock', 1);

        $this->actingAs($user)
            ->getJson(route('stock-transfers.variant-inventory', [
                'sourceLocationId' => $sourceWarehouse->id,
                'variantId' => $variant->id,
            ]))
            ->assertOk()
            ->assertJsonPath('0.variant_name', 'Apple iPhone 17 8GB 256GB Black')
            ->assertJsonPath('0.identifier', '990000000000001')
            ->assertJsonPath('0.serial_number', 'ST-001');

        $lookupItemId = InventoryItem::where('serial_number', 'ST-001')->value('id');

        $this->actingAs($user)
            ->getJson(route('stock-transfers.lookup-inventory-item', [
                'barcode' => 'ST-001',
            ]))
            ->assertOk()
            ->assertJsonPath('id', $lookupItemId)
            ->assertJsonPath('variant_name', 'Apple iPhone 17 8GB 256GB Black');
    }

    public function test_stock_transfer_lifecycle_updates_inventory_and_logs(): void
    {
        $user = User::factory()->create();
        [$variant, $sourceWarehouse, $destinationWarehouse] = $this->createStockTransferGraph();

        $expectedA = $this->createInventoryItem($variant->id, $sourceWarehouse->id, '990000000000101', 'LIFE-001');
        $expectedB = $this->createInventoryItem($variant->id, $sourceWarehouse->id, '990000000000102', 'LIFE-002');
        $overage = $this->createInventoryItem($variant->id, $sourceWarehouse->id, '990000000000103', 'LIFE-003');

        $createResponse = $this->actingAs($user)->postJson(route('stock-transfers.store'), [
            'source_location_id' => $sourceWarehouse->id,
            'destination_location_id' => $destinationWarehouse->id,
            'reference' => 'REQ-001',
            'notes' => 'Initial transfer',
            'product_lines' => [
                ['inventory_id' => $expectedA->id, 'is_picked' => false, 'is_shipped' => false, 'is_received' => false],
                ['inventory_id' => $expectedB->id, 'is_picked' => false, 'is_shipped' => false, 'is_received' => false],
            ],
        ])->assertOk();

        $transferId = $createResponse->json('transfer.id');

        $this->assertDatabaseHas('inventory_items', ['id' => $expectedA->id, 'status' => 'reserved_for_transfer']);
        $this->assertDatabaseHas('stock_transfers', ['id' => $transferId, 'transfer_number' => 'TRN-00000001', 'status' => 'draft']);
        $this->assertDatabaseHas('stock_transfer_items', ['stock_transfer_id' => $transferId, 'inventory_item_id' => $expectedA->id]);
        $this->assertSame($expectedA->id, $createResponse->json('transfer.product_lines.0.inventory_id'));
        $this->assertSame('Apple iPhone 17 8GB 256GB Black', $createResponse->json('transfer.product_lines.0.variant_name'));
        $this->assertSame(false, $createResponse->json('transfer.product_lines.0.is_picked'));
        $this->assertSame($user->name, $createResponse->json('transfer.created_by.full_name'));
        $this->assertSame('Main Warehouse', $createResponse->json('transfer.source_location.name'));
        $this->assertSame(2, $createResponse->json('transfer.summary.total_items'));
        $this->assertSame(20000, $createResponse->json('transfer.summary.total_cost'));

        $this->actingAs($user)->postJson(route('stock-transfers.pick', $transferId), [
            'scannedItems' => [
                ['inventory_id' => $expectedA->id, 'scanned_barcode' => $expectedA->imei, 'scanned_at' => now()->toISOString()],
                ['inventory_id' => $expectedB->id, 'scanned_barcode' => $expectedB->imei, 'scanned_at' => now()->toISOString()],
            ],
        ])->assertOk()->assertJsonPath('transfer.status', 'picked');
        $this->assertDatabaseHas('stock_transfer_items', [
            'stock_transfer_id' => $transferId,
            'inventory_item_id' => $expectedA->id,
            'is_picked' => true,
        ]);

        $this->actingAs($user)->postJson(route('stock-transfers.ship', $transferId), [
            'driver_name' => 'Juan Dela Cruz',
            'driver_contact' => '09170000000',
            'courier_name' => 'iWarehouse Logistics',
            'proof_of_dispatch_url' => 'https://example.test/dispatch.jpg',
            'remarks' => 'Handle with care',
        ])->assertOk()->assertJsonPath('transfer.status', 'shipped');

        $this->assertDatabaseHas('inventory_items', ['id' => $expectedA->id, 'status' => 'in_transit']);

        $this->actingAs($user)->postJson(route('stock-transfers.receive', $transferId), [
            'newlyReceivedInventoryIds' => [$expectedA->id],
            'overageItems' => [[
                'inventory_id' => $overage->id,
                'product_master_id' => $variant->product_master_id,
                'variant_id' => $variant->id,
                'product_name' => 'Apple iPhone 17',
                'variant_name' => $variant->variant_name,
            ]],
            'unknownItems' => [
                ['scanned_barcode' => 'UNKNOWN-BARCODE-001'],
            ],
            'destinationWarehouseId' => $destinationWarehouse->id,
            'receivingJson' => [
                'branch_remarks' => 'One item missing',
                'discrepancy_reason' => 'Carrier partial unload',
                'photo_proof_url' => 'https://example.test/receipt.jpg',
            ],
        ])->assertOk()->assertJsonPath('transfer.status', 'partially_received');
        $this->assertDatabaseHas('stock_transfer_items', [
            'stock_transfer_id' => $transferId,
            'inventory_item_id' => $expectedA->id,
            'is_received' => true,
        ]);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $expectedA->id,
            'warehouse_id' => $destinationWarehouse->id,
            'status' => 'available',
        ]);
        $this->assertDatabaseHas('inventory_items', [
            'id' => $overage->id,
            'warehouse_id' => $destinationWarehouse->id,
            'status' => 'on_hold',
        ]);
        $this->assertDatabaseHas('stock_transfer_receipt_items', [
            'receipt_item_type' => 'unknown',
            'scanned_barcode' => 'UNKNOWN-BARCODE-001',
        ]);

        $this->actingAs($user)->postJson(route('stock-transfers.receive', $transferId), [
            'newlyReceivedInventoryIds' => [$expectedB->id],
            'overageItems' => [],
            'unknownItems' => [],
            'destinationWarehouseId' => $destinationWarehouse->id,
            'receivingJson' => [
                'branch_remarks' => 'Completed',
                'discrepancy_reason' => '',
                'photo_proof_url' => null,
            ],
        ])->assertOk()->assertJsonPath('transfer.status', 'fully_received');

        $this->assertDatabaseHas('inventory_items', [
            'id' => $expectedB->id,
            'warehouse_id' => $destinationWarehouse->id,
            'status' => 'available',
        ]);
        $this->assertDatabaseHas('inventory_item_logs', [
            'inventory_item_id' => $expectedA->id,
            'action' => 'STOCK_TRANSFER_RECEIVED',
            'actor_id' => $user->id,
        ]);
    }

    public function test_deleting_draft_transfer_releases_inventory(): void
    {
        $user = User::factory()->create();
        [$variant, $sourceWarehouse, $destinationWarehouse] = $this->createStockTransferGraph();
        $item = $this->createInventoryItem($variant->id, $sourceWarehouse->id, '990000000000201', 'DEL-001');

        $createResponse = $this->actingAs($user)->postJson(route('stock-transfers.store'), [
            'source_location_id' => $sourceWarehouse->id,
            'destination_location_id' => $destinationWarehouse->id,
            'reference' => 'REQ-DELETE',
            'notes' => 'Delete test',
            'product_lines' => [
                ['inventory_id' => $item->id, 'is_picked' => false, 'is_shipped' => false, 'is_received' => false],
            ],
        ])->assertOk();

        $transferId = $createResponse->json('transfer.id');

        $this->actingAs($user)
            ->deleteJson(route('stock-transfers.destroy', $transferId))
            ->assertOk()
            ->assertJson(['deleted' => true]);

        $this->assertDatabaseMissing('stock_transfers', ['id' => $transferId]);
        $this->assertDatabaseHas('inventory_items', ['id' => $item->id, 'status' => 'available']);
    }

    public function test_consolidation_creates_master_and_marks_sources(): void
    {
        $user = User::factory()->create();
        [$variant, $sourceWarehouse, $destinationWarehouse] = $this->createStockTransferGraph();

        $firstItem = $this->createInventoryItem($variant->id, $sourceWarehouse->id, '990000000000301', 'CON-001');
        $secondItem = $this->createInventoryItem($variant->id, $sourceWarehouse->id, '990000000000302', 'CON-002');

        $firstTransferId = $this->createDraftTransfer($user, $variant, $sourceWarehouse->id, $destinationWarehouse->id, $firstItem->id);
        $secondTransferId = $this->createDraftTransfer($user, $variant, $sourceWarehouse->id, $destinationWarehouse->id, $secondItem->id);

        $this->actingAs($user)
            ->postJson(route('stock-transfers.consolidate'), [
                'transferIds' => [$firstTransferId, $secondTransferId],
            ])
            ->assertOk()
            ->assertJsonPath('masterTransfer.status', 'draft');

        $this->assertDatabaseHas('stock_transfers', ['id' => $firstTransferId, 'status' => 'consolidated']);
        $this->assertDatabaseHas('stock_transfers', ['id' => $secondTransferId, 'status' => 'consolidated']);
        $this->assertDatabaseCount('stock_transfer_consolidation_sources', 2);
    }

    private function createDraftTransfer(User $user, ProductVariant $variant, int $sourceWarehouseId, int $destinationWarehouseId, int $inventoryItemId): int
    {
        return $this->actingAs($user)->postJson(route('stock-transfers.store'), [
            'source_location_id' => $sourceWarehouseId,
            'destination_location_id' => $destinationWarehouseId,
            'reference' => 'REQ-CONS',
            'notes' => 'Consolidation source',
            'product_lines' => [
                ['inventory_id' => $inventoryItemId, 'is_picked' => false, 'is_shipped' => false, 'is_received' => false],
            ],
        ])->json('transfer.id');
    }

    private function createStockTransferGraph(): array
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
        $sourceWarehouse = Warehouse::create([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'main_warehouse',
        ]);
        $destinationWarehouse = Warehouse::create([
            'name' => 'Branch Warehouse',
            'warehouse_type' => 'warehouse',
        ]);

        return [$variant, $sourceWarehouse, $destinationWarehouse];
    }

    private function createInventoryItem(int $variantId, int $warehouseId, string $imei, string $serial): InventoryItem
    {
        return InventoryItem::create([
            'product_variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'imei' => $imei,
            'serial_number' => $serial,
            'status' => 'available',
            'cost_price' => 10000,
        ]);
    }
}
