<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use App\Models\InventoryItemLog;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InventorySchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('warehouses'));
        $this->assertTrue(Schema::hasTable('inventory_items'));
        $this->assertTrue(Schema::hasTable('inventory_item_logs'));
    }

    public function test_inventory_item_can_reference_variant_warehouse_and_supplier(): void
    {
        $variant = $this->createProductVariant();
        $warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'warehouse_type' => 'main_warehouse',
        ]);
        $supplier = Supplier::create([
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Corporation',
            'status' => 'Active',
        ]);

        $item = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'imei' => '123456789012345',
            'serial_number' => 'SN-0001',
            'status' => 'active',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 13000,
            'with_charger' => true,
        ]);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $item->id,
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'imei' => '123456789012345',
            'serial_number' => 'SN-0001',
            'status' => 'active',
        ]);
    }

    public function test_duplicate_imei_and_serial_number_are_rejected(): void
    {
        $variant = $this->createProductVariant();
        $warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'warehouse_type' => 'main_warehouse',
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '123456789012345',
            'serial_number' => 'SN-0001',
        ]);

        $this->expectException(QueryException::class);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '123456789012345',
            'serial_number' => 'SN-0002',
        ]);
    }

    public function test_inventory_item_log_can_be_created_with_nullable_actor(): void
    {
        $variant = $this->createProductVariant();
        $warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'warehouse_type' => 'main_warehouse',
        ]);
        $item = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'SN-0001',
        ]);

        $log = InventoryItemLog::create([
            'inventory_item_id' => $item->id,
            'logged_at' => '2026-04-08 10:00:00',
            'action' => 'GRN',
            'notes' => 'Received in good condition.',
        ]);

        $this->assertDatabaseHas('inventory_item_logs', [
            'id' => $log->id,
            'inventory_item_id' => $item->id,
            'actor_id' => null,
            'action' => 'GRN',
        ]);
    }

    public function test_deleting_warehouse_or_variant_with_inventory_items_is_blocked(): void
    {
        $variant = $this->createProductVariant();
        $warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'warehouse_type' => 'main_warehouse',
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'SN-0001',
        ]);

        $this->assertFalse($this->canDelete(fn () => $warehouse->delete()));
        $this->assertFalse($this->canDelete(fn () => $variant->delete()));
    }

    public function test_deleting_inventory_item_cascades_to_logs(): void
    {
        $variant = $this->createProductVariant();
        $warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'warehouse_type' => 'main_warehouse',
        ]);
        $user = User::factory()->create();
        $item = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'SN-0001',
        ]);
        $log = InventoryItemLog::create([
            'inventory_item_id' => $item->id,
            'actor_id' => $user->id,
            'logged_at' => now(),
            'action' => 'STATUS_CHANGE',
        ]);

        $item->delete();

        $this->assertDatabaseMissing('inventory_item_logs', ['id' => $log->id]);
    }

    private function createProductVariant(): ProductVariant
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
        $model = $brand->models()->create(['model_name' => 'iPhone 17']);
        $productMaster = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
    }

    private function canDelete(callable $callback): bool
    {
        try {
            DB::transaction(function () use ($callback) {
                $callback();

                throw new \RuntimeException('rollback');
            });
        } catch (QueryException) {
            return false;
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() === 'rollback') {
                return true;
            }

            throw $exception;
        }

        return true;
    }
}
