<?php

namespace App\Features\StockRequestApprovals\Actions;

use App\Models\InventoryItem;
use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationStatusHistory;
use App\Models\StockRequest;
use App\Models\StockRequestApproval;
use App\Models\StockRequestStatusHistory;
use App\Models\StockTransfer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApproveStockRequestsBatch
{
    /** @param array<int, array<string,mixed>> $allocations */
    public function handle(array $allocations, ?int $actorId = null): void
    {
        DB::transaction(function () use ($allocations, $actorId): void {
            $byRequest = collect($allocations)->groupBy(fn ($row) => (int) $row['srId']);

            $mainWarehouseId = (int) optional(DB::table('warehouses')->select('id')->where('warehouse_type', 'main_warehouse')->orderBy('id')->first())->id;
            if ($mainWarehouseId <= 0) {
                throw ValidationException::withMessages(['allocations' => 'Main warehouse is required.']);
            }

            foreach ($byRequest as $requestId => $rows) {
                /** @var StockRequest $request */
                $request = StockRequest::query()->with(['items', 'approval.items', 'approval.references'])->findOrFail((int) $requestId);

                $requestedItems = $request->items->keyBy('id');
                $transferRefs = [];
                $rfqRef = null;

                $rowMap = $rows->keyBy(fn ($r) => (int) $r['stockRequestItemId']);

                foreach ($requestedItems as $stockRequestItemId => $stockItem) {
                    if (! $rowMap->has($stockRequestItemId)) {
                        throw ValidationException::withMessages(['allocations' => "Missing allocation for item {$stockRequestItemId}"]);
                    }
                }

                $rfqItemsPayload = [];

                foreach ($rows as $row) {
                    $approvedQty = max(0, (int) ($row['approvedQty'] ?? 0));
                    $transferQty = max(0, (int) ($row['transferQty'] ?? 0));
                    $rfqQty = max(0, (int) ($row['rfqQty'] ?? 0));
                    $itemId = (int) $row['stockRequestItemId'];

                    if ($transferQty + $rfqQty !== $approvedQty) {
                        throw ValidationException::withMessages(['allocations' => "Allocation mismatch for item {$itemId}"]);
                    }

                    $stockItem = $requestedItems[$itemId];
                    if ($approvedQty > (int) $stockItem->quantity) {
                        throw ValidationException::withMessages(['allocations' => "Approved qty cannot exceed requested qty for item {$itemId}"]);
                    }

                    if ($transferQty > 0) {
                        $inventoryIds = InventoryItem::query()
                            ->where('warehouse_id', $mainWarehouseId)
                            ->where('status', 'available')
                            ->where('product_variant_id', (int) $row['variantId'])
                            ->lockForUpdate()
                            ->limit($transferQty)
                            ->pluck('id')
                            ->all();

                        if (count($inventoryIds) < $transferQty) {
                            throw ValidationException::withMessages(['allocations' => "Insufficient main warehouse inventory for variant {$row['variantId']}"]);
                        }

                        $transfer = $this->createTransfer(
                            sourceWarehouseId: $mainWarehouseId,
                            destinationWarehouseId: (int) $row['branchId'],
                            reference: (string) $request->request_number,
                            inventoryIds: $inventoryIds,
                            actorId: $actorId,
                        );

                        $transferRefs[] = $transfer->transfer_number;
                    }

                    if ($rfqQty > 0) {
                        $variantId = (int) $row['variantId'];
                        if (! isset($rfqItemsPayload[$variantId])) {
                            $rfqItemsPayload[$variantId] = [
                                'variant_id' => $variantId,
                                'quantity' => 0,
                                'description' => 'Generated from stock request approval',
                            ];
                        }
                        $rfqItemsPayload[$variantId]['quantity'] += $rfqQty;
                    }
                }

                if ($rfqItemsPayload !== []) {
                    $rfq = RequestForQuotation::query()->firstOrNew(['stock_request_id' => $request->id]);
                    if (! $rfq->exists) {
                        $rfq->rfq_number = $this->nextRfqNumber();
                        $rfq->created_by_id = $actorId;
                        $rfq->status = 'draft';
                    }
                    $rfq->save();

                    $rfq->items()->delete();
                    foreach ($rfqItemsPayload as $item) {
                        $rfq->items()->create($item);
                    }

                    RequestForQuotationStatusHistory::query()->create([
                        'request_for_quotation_id' => $rfq->id,
                        'status' => 'draft',
                        'changed_by_id' => $actorId,
                        'occurred_at' => now(),
                        'notes' => 'Created or updated from stock request approval',
                    ]);

                    $rfqRef = $rfq->rfq_number;
                }

                $hasTransfer = count($transferRefs) > 0;
                $hasRfq = $rfqRef !== null;
                $action = $hasTransfer && $hasRfq
                    ? 'split_operation_created'
                    : ($hasTransfer ? 'stock_transfer_created' : 'rfq_created');

                $statusHistory = StockRequestStatusHistory::query()->create([
                    'stock_request_id' => $request->id,
                    'status' => $action,
                    'actor_id' => $actorId,
                    'occurred_at' => now(),
                    'notes' => 'Approved via batch review',
                ]);

                $approval = StockRequestApproval::query()->updateOrCreate(
                    ['stock_request_id' => $request->id],
                    [
                        'status_history_id' => $statusHistory->id,
                        'approver_id' => $actorId,
                        'approval_date' => now(),
                        'action' => $action,
                        'notes' => 'Approved via batch review',
                    ],
                );

                $approval->items()->delete();
                foreach ($rows as $row) {
                    $approval->items()->create([
                        'stock_request_item_id' => (int) $row['stockRequestItemId'],
                        'approved_quantity' => max(0, (int) ($row['approvedQty'] ?? 0)),
                    ]);
                }

                $approval->references()->delete();
                foreach (array_unique($transferRefs) as $transferNumber) {
                    $approval->references()->create([
                        'reference_type' => 'stock_transfer',
                        'reference_number' => $transferNumber,
                    ]);
                }
                if ($rfqRef !== null) {
                    $approval->references()->create([
                        'reference_type' => 'rfq',
                        'reference_number' => $rfqRef,
                    ]);
                }
                if ($action === 'split_operation_created') {
                    $approval->references()->create([
                        'reference_type' => 'split_operation',
                        'reference_number' => 'SPLIT-'.$request->request_number,
                    ]);
                }

                $request->update([
                    'status' => $action,
                ]);
            }
        });
    }

    /** @param array<int> $inventoryIds */
    private function createTransfer(int $sourceWarehouseId, int $destinationWarehouseId, string $reference, array $inventoryIds, ?int $actorId): StockTransfer
    {
        $transfer = StockTransfer::query()->create([
            'transfer_number' => 'PENDING',
            'source_warehouse_id' => $sourceWarehouseId,
            'destination_warehouse_id' => $destinationWarehouseId,
            'created_by_id' => $actorId,
            'status' => 'draft',
            'operation_type' => 'internal_transfer',
            'priority' => 'normal',
            'reference' => $reference,
        ]);

        $transfer->update([
            'transfer_number' => sprintf('TRN-%08d', $transfer->id),
        ]);

        foreach ($inventoryIds as $inventoryId) {
            $transfer->items()->create([
                'inventory_item_id' => (int) $inventoryId,
                'is_picked' => false,
                'is_shipped' => false,
                'is_received' => false,
            ]);

            InventoryItem::query()->whereKey($inventoryId)->update(['status' => 'reserved_for_transfer']);
        }

        return $transfer->fresh();
    }

    private function nextRfqNumber(): string
    {
        $prefix = 'RFQ-'.now()->format('Ymd').'-';

        $latest = RequestForQuotation::query()
            ->where('rfq_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('rfq_number');

        $next = 1;
        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches)) {
            $next = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
