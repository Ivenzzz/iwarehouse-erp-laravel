<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\StockRequest;
use App\Models\StockRequestApproval;
use App\Models\StockRequestApprovalItem;
use App\Models\StockRequestApprovalReference;
use App\Models\StockRequestItem;
use App\Models\StockRequestStatusHistory;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StockRequestsSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_request_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('stock_requests'));
        $this->assertTrue(Schema::hasTable('stock_request_items'));
        $this->assertTrue(Schema::hasTable('stock_request_status_histories'));
        $this->assertTrue(Schema::hasTable('stock_request_approvals'));
        $this->assertTrue(Schema::hasTable('stock_request_approval_items'));
        $this->assertTrue(Schema::hasTable('stock_request_approval_references'));
    }

    public function test_stock_request_number_must_be_unique(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse A',
            'warehouse_type' => 'warehouse',
        ]);

        StockRequest::create([
            'request_number' => 'SR-000001',
            'warehouse_id' => $warehouse->id,
            'required_at' => '2026-04-11 10:00:00',
        ]);

        $this->expectException(QueryException::class);

        StockRequest::create([
            'request_number' => 'SR-000001',
            'warehouse_id' => $warehouse->id,
            'required_at' => '2026-04-11 11:00:00',
        ]);
    }

    public function test_stock_request_defaults_are_applied(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse B',
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-000002',
            'warehouse_id' => $warehouse->id,
            'required_at' => '2026-04-12 09:00:00',
        ]);

        $this->assertDatabaseHas('stock_requests', [
            'id' => $stockRequest->id,
            'purpose' => 'Replenishment',
            'status' => 'pending',
        ]);
    }

    public function test_invalid_purpose_is_rejected(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse B2',
            'warehouse_type' => 'store',
        ]);

        $this->expectException(QueryException::class);

        StockRequest::create([
            'request_number' => 'SR-000002-INVALID-PURPOSE',
            'warehouse_id' => $warehouse->id,
            'required_at' => '2026-04-12 09:30:00',
            'purpose' => 'Invalid Purpose',
            'status' => 'pending',
        ]);
    }

    public function test_invalid_status_is_rejected(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse B3',
            'warehouse_type' => 'store',
        ]);

        $this->expectException(QueryException::class);

        StockRequest::create([
            'request_number' => 'SR-000002-INVALID-STATUS',
            'warehouse_id' => $warehouse->id,
            'required_at' => '2026-04-12 09:45:00',
            'purpose' => 'Replenishment',
            'status' => 'invalid_status',
        ]);
    }

    public function test_deleting_stock_request_cascades_to_items_and_status_history(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse C',
            'warehouse_type' => 'warehouse',
        ]);
        $variant = $this->createProductVariant();

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-000003',
            'warehouse_id' => $warehouse->id,
            'required_at' => '2026-04-12 10:00:00',
            'purpose' => 'Display Refill',
            'status' => 'pending',
        ]);

        $item = StockRequestItem::create([
            'stock_request_id' => $stockRequest->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
            'reason' => 'Display replenishment',
        ]);

        $history = StockRequestStatusHistory::create([
            'stock_request_id' => $stockRequest->id,
            'status' => 'pending',
            'occurred_at' => now(),
            'notes' => 'Created',
        ]);

        $stockRequest->delete();

        $this->assertDatabaseMissing('stock_request_items', ['id' => $item->id]);
        $this->assertDatabaseMissing('stock_request_status_histories', ['id' => $history->id]);
    }

    public function test_deleting_user_nulls_requestor_and_actor_references(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse D',
            'warehouse_type' => 'store',
        ]);
        $user = User::factory()->create();

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-000004',
            'warehouse_id' => $warehouse->id,
            'requestor_id' => $user->id,
            'required_at' => '2026-04-12 11:00:00',
        ]);

        $history = StockRequestStatusHistory::create([
            'stock_request_id' => $stockRequest->id,
            'status' => 'pending',
            'actor_id' => $user->id,
            'occurred_at' => now(),
        ]);

        $user->forceDelete();

        $this->assertDatabaseHas('stock_requests', [
            'id' => $stockRequest->id,
            'requestor_id' => null,
        ]);
        $this->assertDatabaseHas('stock_request_status_histories', [
            'id' => $history->id,
            'actor_id' => null,
        ]);
    }

    public function test_deleting_referenced_warehouse_or_variant_is_blocked(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse E',
            'warehouse_type' => 'warehouse',
        ]);
        $variant = $this->createProductVariant();

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-000005',
            'warehouse_id' => $warehouse->id,
            'required_at' => '2026-04-12 12:00:00',
        ]);

        StockRequestItem::create([
            'stock_request_id' => $stockRequest->id,
            'variant_id' => $variant->id,
            'quantity' => 1,
        ]);

        $this->assertFalse($this->canDelete(fn () => $warehouse->delete()));
        $this->assertFalse($this->canDelete(fn () => $variant->delete()));
    }

    public function test_stock_request_approval_one_per_request_is_enforced(): void
    {
        [$stockRequest, $history] = $this->createRequestWithHistory();
        $user = User::factory()->create();

        StockRequestApproval::create([
            'stock_request_id' => $stockRequest->id,
            'status_history_id' => $history->id,
            'approver_id' => $user->id,
            'approval_date' => now(),
            'action' => 'rfq_created',
        ]);

        $otherHistory = StockRequestStatusHistory::create([
            'stock_request_id' => $stockRequest->id,
            'status' => 'stock_transfer_created',
            'actor_id' => $user->id,
            'occurred_at' => now()->addMinute(),
        ]);

        $this->expectException(QueryException::class);

        StockRequestApproval::create([
            'stock_request_id' => $stockRequest->id,
            'status_history_id' => $otherHistory->id,
            'approver_id' => $user->id,
            'approval_date' => now()->addMinute(),
            'action' => 'stock_transfer_created',
        ]);
    }

    public function test_stock_request_approval_reference_one_per_type_is_enforced(): void
    {
        [$stockRequest, $history] = $this->createRequestWithHistory();
        $user = User::factory()->create();

        $approval = StockRequestApproval::create([
            'stock_request_id' => $stockRequest->id,
            'status_history_id' => $history->id,
            'approver_id' => $user->id,
            'approval_date' => now(),
            'action' => 'rfq_created',
        ]);

        StockRequestApprovalReference::create([
            'stock_request_approval_id' => $approval->id,
            'reference_type' => 'rfq',
            'reference_number' => 'RFQ-001',
        ]);

        $this->expectException(QueryException::class);

        StockRequestApprovalReference::create([
            'stock_request_approval_id' => $approval->id,
            'reference_type' => 'rfq',
            'reference_number' => 'RFQ-002',
        ]);
    }

    public function test_stock_request_approval_item_requires_valid_stock_request_item_fk(): void
    {
        [$stockRequest, $history] = $this->createRequestWithHistory();
        $user = User::factory()->create();

        $approval = StockRequestApproval::create([
            'stock_request_id' => $stockRequest->id,
            'status_history_id' => $history->id,
            'approver_id' => $user->id,
            'approval_date' => now(),
            'action' => 'rfq_created',
        ]);

        $this->expectException(QueryException::class);

        StockRequestApprovalItem::create([
            'stock_request_approval_id' => $approval->id,
            'stock_request_item_id' => 999999,
            'approved_quantity' => 1,
        ]);
    }

    public function test_deleting_stock_request_cascades_to_approval_tables(): void
    {
        [$stockRequest, $history, $requestItem] = $this->createRequestWithHistoryAndItem();
        $user = User::factory()->create();

        $approval = StockRequestApproval::create([
            'stock_request_id' => $stockRequest->id,
            'status_history_id' => $history->id,
            'approver_id' => $user->id,
            'approval_date' => now(),
            'action' => 'rfq_created',
        ]);

        $approvalItem = StockRequestApprovalItem::create([
            'stock_request_approval_id' => $approval->id,
            'stock_request_item_id' => $requestItem->id,
            'approved_quantity' => 1,
        ]);

        $approvalReference = StockRequestApprovalReference::create([
            'stock_request_approval_id' => $approval->id,
            'reference_type' => 'rfq',
            'reference_number' => 'RFQ-1000',
        ]);

        $stockRequest->delete();

        $this->assertDatabaseMissing('stock_request_approvals', ['id' => $approval->id]);
        $this->assertDatabaseMissing('stock_request_approval_items', ['id' => $approvalItem->id]);
        $this->assertDatabaseMissing('stock_request_approval_references', ['id' => $approvalReference->id]);
    }

    public function test_approval_tables_follow_normalized_columns(): void
    {
        $this->assertFalse(Schema::hasColumn('stock_request_approvals', 'approver_name'));
        $this->assertFalse(Schema::hasColumn('stock_request_approval_items', 'original_quantity'));
        $this->assertTrue(Schema::hasColumn('stock_request_approval_items', 'approved_quantity'));
    }

    public function test_original_quantity_is_reconstructable_by_join(): void
    {
        [$stockRequest, $history, $requestItem] = $this->createRequestWithHistoryAndItem();
        $user = User::factory()->create();

        $approval = StockRequestApproval::create([
            'stock_request_id' => $stockRequest->id,
            'status_history_id' => $history->id,
            'approver_id' => $user->id,
            'approval_date' => now(),
            'action' => 'rfq_created',
        ]);

        StockRequestApprovalItem::create([
            'stock_request_approval_id' => $approval->id,
            'stock_request_item_id' => $requestItem->id,
            'approved_quantity' => 3,
        ]);

        $row = DB::table('stock_request_approval_items')
            ->join('stock_request_items', 'stock_request_items.id', '=', 'stock_request_approval_items.stock_request_item_id')
            ->where('stock_request_approval_items.stock_request_approval_id', $approval->id)
            ->select([
                'stock_request_approval_items.approved_quantity',
                'stock_request_items.quantity as original_quantity',
            ])
            ->first();

        $this->assertNotNull($row);
        $this->assertSame(3, (int) $row->approved_quantity);
        $this->assertSame((int) $requestItem->quantity, (int) $row->original_quantity);
    }

    private function createProductVariant(): ProductVariant
    {
        $brand = ProductBrand::create(['name' => 'Brand-Stock-Request']);
        $category = ProductCategory::create([
            'name' => 'Category-Stock-Request',
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Subcategory-Stock-Request',
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'Model-Stock-Request',
        ]);
        $productMaster = ProductMaster::create([
            'master_sku' => 'MASTER-SR-001',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Variant Stock Request',
            'sku' => 'VARIANT-SR-001',
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

    private function createRequestWithHistory(): array
    {
        $warehouse = Warehouse::create([
            'name' => 'Warehouse F',
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-APP-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'warehouse_id' => $warehouse->id,
            'required_at' => now()->addDay(),
            'status' => 'rfq_created',
        ]);

        $history = StockRequestStatusHistory::create([
            'stock_request_id' => $stockRequest->id,
            'status' => 'rfq_created',
            'occurred_at' => now(),
        ]);

        return [$stockRequest, $history];
    }

    private function createRequestWithHistoryAndItem(): array
    {
        [$stockRequest, $history] = $this->createRequestWithHistory();
        $variant = $this->createProductVariant();

        $item = StockRequestItem::create([
            'stock_request_id' => $stockRequest->id,
            'variant_id' => $variant->id,
            'quantity' => 5,
        ]);

        return [$stockRequest, $history, $item];
    }
}
