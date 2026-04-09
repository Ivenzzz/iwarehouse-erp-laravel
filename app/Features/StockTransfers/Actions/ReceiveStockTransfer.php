<?php

namespace App\Features\StockTransfers\Actions;

use App\Features\Inventory\Actions\LogInventoryActivity;
use App\Models\InventoryItem;
use App\Models\StockTransfer;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ReceiveStockTransfer
{
    public function __construct(
        private readonly LogInventoryActivity $logInventoryActivity,
        private readonly UpsertStockTransferMilestone $upsertStockTransferMilestone,
    ) {
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(StockTransfer $transfer, array $data, ?int $actorId = null): StockTransfer
    {
        if (! in_array($transfer->status, ['shipped', 'partially_received'], true)) {
            throw new InvalidArgumentException('Only shipped or partially received transfers can be received.');
        }

        return DB::transaction(function () use ($transfer, $data, $actorId) {
            $transfer->loadMissing('items.inventoryItem');

            $receivedIds = collect($data['newlyReceivedInventoryIds'] ?? [])
                ->map(fn ($value) => (int) $value)
                ->filter()
                ->values();

            $transferItems = $transfer->items
                ->keyBy('inventory_item_id');

            $receipt = $transfer->receipts()->create([
                'received_by_id' => $actorId,
                'branch_remarks' => data_get($data, 'receivingJson.branch_remarks'),
                'discrepancy_reason' => data_get($data, 'receivingJson.discrepancy_reason'),
                'received_at' => now(),
            ]);

            $destinationWarehouseId = (int) ($data['destinationWarehouseId'] ?? $transfer->destination_warehouse_id);

            foreach ($receivedIds as $inventoryId) {
                $transferItem = $transferItems->get($inventoryId);
                if ($transferItem === null) {
                    throw new InvalidArgumentException("Inventory item {$inventoryId} does not belong to this transfer.");
                }

                if ($transferItem->is_received) {
                    continue;
                }

                /** @var InventoryItem|null $item */
                $item = $transferItem->inventoryItem()->lockForUpdate()->first();
                if ($item === null) {
                    throw new InvalidArgumentException("Inventory item {$inventoryId} not found.");
                }

                $item->update([
                    'warehouse_id' => $destinationWarehouseId,
                    'status' => 'available',
                ]);

                $transferItem->update([
                    'is_picked' => true,
                    'is_shipped' => true,
                    'is_received' => true,
                ]);

                $receipt->items()->create([
                    'stock_transfer_item_id' => $transferItem->id,
                    'inventory_item_id' => $item->id,
                    'receipt_item_type' => 'expected_received',
                    'product_name' => null,
                    'variant_name' => $item->productVariant?->variant_name,
                    'imei1' => $item->imei,
                    'imei2' => $item->imei2,
                    'serial_number' => $item->serial_number,
                    'occurred_at' => now(),
                ]);

                $this->logInventoryActivity->handle(
                    $item->fresh(),
                    'STOCK_TRANSFER_RECEIVED',
                    $actorId,
                    "Received via stock transfer {$transfer->transfer_number}.",
                    [
                        'transfer_id' => $transfer->id,
                        'transfer_number' => $transfer->transfer_number,
                        'destination_warehouse_id' => $destinationWarehouseId,
                    ],
                );
            }

            foreach ($data['overageItems'] ?? [] as $overage) {
                $inventoryId = (int) ($overage['inventory_id'] ?? 0);
                $item = InventoryItem::query()->lockForUpdate()->find($inventoryId);
                if ($item === null) {
                    continue;
                }

                $item->update([
                    'warehouse_id' => $destinationWarehouseId,
                    'status' => 'on_hold',
                ]);

                $receipt->items()->create([
                    'inventory_item_id' => $item->id,
                    'receipt_item_type' => 'overage',
                    'product_name' => $overage['product_name'] ?? null,
                    'variant_name' => $overage['variant_name'] ?? null,
                    'imei1' => $overage['imei1'] ?? $item->imei,
                    'imei2' => $overage['imei2'] ?? $item->imei2,
                    'serial_number' => $overage['serial_number'] ?? $item->serial_number,
                    'occurred_at' => now(),
                ]);

                $this->logInventoryActivity->handle(
                    $item->fresh(),
                    'STOCK_TRANSFER_OVERAGE_RECEIVED',
                    $actorId,
                    "Received as overage in stock transfer {$transfer->transfer_number}.",
                    [
                        'transfer_id' => $transfer->id,
                        'transfer_number' => $transfer->transfer_number,
                    ],
                );
            }

            foreach ($data['unknownItems'] ?? [] as $unknown) {
                $receipt->items()->create([
                    'receipt_item_type' => 'unknown',
                    'scanned_barcode' => $unknown['barcode'] ?? $unknown['scanned_barcode'] ?? null,
                    'occurred_at' => now(),
                ]);
            }

            $unreceivedItems = $transfer->items
                ->filter(fn ($item) => ! $item->fresh()->is_received);

            foreach ($unreceivedItems as $transferItem) {
                $inventoryItem = $transferItem->inventoryItem;
                $receipt->items()->create([
                    'stock_transfer_item_id' => $transferItem->id,
                    'inventory_item_id' => $transferItem->inventory_item_id,
                    'receipt_item_type' => 'missing',
                    'product_name' => null,
                    'variant_name' => $inventoryItem?->productVariant?->variant_name,
                    'imei1' => $inventoryItem?->imei,
                    'imei2' => $inventoryItem?->imei2,
                    'serial_number' => $inventoryItem?->serial_number,
                    'occurred_at' => now(),
                ]);
            }

            if ($photoUrl = data_get($data, 'receivingJson.photo_proof_url')) {
                $receipt->photos()->create([
                    'image_path' => $photoUrl,
                    'captured_at' => now(),
                ]);
            }

            $transfer->refresh()->loadMissing('items');
            $remaining = $transfer->items->where('is_received', false)->count();
            $status = $remaining === 0 ? 'fully_received' : 'partially_received';

            $transfer->update(['status' => $status]);
            $this->upsertStockTransferMilestone->handle($transfer->fresh(), 'received', $actorId);

            return $transfer->fresh();
        });
    }
}
