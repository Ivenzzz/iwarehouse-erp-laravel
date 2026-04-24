<?php

namespace App\Features\StockTransfers\Actions;

use App\Features\Inventory\Actions\LogInventoryActivity;
use App\Models\InventoryItem;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreatePickedStockTransferOldMethod
{
    public function __construct(
        private readonly LogInventoryActivity $logInventoryActivity,
        private readonly UpsertStockTransferMilestone $upsertStockTransferMilestone,
    ) {
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(array $data, ?int $actorId = null): StockTransfer
    {
        return DB::transaction(function () use ($data, $actorId) {
            $transfer = StockTransfer::query()->create([
                'transfer_number' => 'PENDING',
                'source_warehouse_id' => (int) $data['source_location_id'],
                'destination_warehouse_id' => (int) $data['destination_location_id'],
                'created_by_id' => $actorId,
                'status' => 'picked',
                'operation_type' => (string) ($data['operation_type'] ?? 'internal_transfer'),
                'priority' => (string) ($data['priority'] ?? 'normal'),
                'reference' => null,
                'notes' => $data['notes'] ?: null,
            ]);

            $transfer->update([
                'transfer_number' => sprintf('TRN-%08d', $transfer->id),
            ]);

            $inventoryIds = collect($data['product_lines'])
                ->pluck('inventory_id')
                ->filter()
                ->map(fn ($value) => (int) $value)
                ->unique()
                ->values();

            if ($inventoryIds->isEmpty()) {
                throw new InvalidArgumentException('At least one inventory item is required.');
            }

            $items = InventoryItem::query()
                ->whereIn('id', $inventoryIds->all())
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($inventoryIds as $inventoryId) {
                /** @var InventoryItem|null $item */
                $item = $items->get($inventoryId);

                if ($item === null) {
                    throw new InvalidArgumentException("Inventory item {$inventoryId} not found.");
                }

                if ((int) $item->warehouse_id !== (int) $transfer->source_warehouse_id) {
                    throw new InvalidArgumentException("Inventory item {$inventoryId} is not in the selected source warehouse.");
                }

                if ($item->status !== 'available') {
                    throw new InvalidArgumentException("Inventory item {$inventoryId} is not available for transfer.");
                }

                $hasActiveAllocation = StockTransferItem::query()
                    ->where('inventory_item_id', $inventoryId)
                    ->whereHas('stockTransfer', fn ($query) => $query->whereIn('status', [
                        'draft',
                        'picked',
                        'shipped',
                        'partially_received',
                    ]))
                    ->exists();

                if ($hasActiveAllocation) {
                    throw new InvalidArgumentException("Inventory item {$inventoryId} is already allocated to another active transfer.");
                }

                $transfer->items()->create([
                    'inventory_item_id' => $item->id,
                    'is_picked' => true,
                    'is_shipped' => false,
                    'is_received' => false,
                ]);

                $item->update([
                    'status' => 'reserved_for_transfer',
                ]);

                $this->logInventoryActivity->handle(
                    $item->fresh(),
                    'STOCK_TRANSFER_RESERVED',
                    $actorId,
                    "Reserved for stock transfer {$transfer->transfer_number}.",
                    [
                        'transfer_id' => $transfer->id,
                        'transfer_number' => $transfer->transfer_number,
                    ],
                );
            }

            $createdAt = optional($transfer->created_at)?->toDateTimeString();
            $this->upsertStockTransferMilestone->handle($transfer, 'created', $actorId, null, [], $createdAt);
            $this->upsertStockTransferMilestone->handle($transfer, 'picked', $actorId, null, [], $createdAt);

            return $transfer->fresh();
        });
    }
}

