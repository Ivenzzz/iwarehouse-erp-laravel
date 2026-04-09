<?php

namespace App\Features\StockTransfers\Actions;

use App\Models\StockTransfer;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PickStockTransfer
{
    public function __construct(
        private readonly UpsertStockTransferMilestone $upsertStockTransferMilestone,
    ) {
    }

    /**
     * @param  array<int, array<string, mixed>>  $scannedItems
     */
    public function handle(StockTransfer $transfer, array $scannedItems, ?int $actorId = null): StockTransfer
    {
        if (! in_array($transfer->status, ['draft', 'picked'], true)) {
            throw new InvalidArgumentException('Only draft transfers can be picked.');
        }

        return DB::transaction(function () use ($transfer, $scannedItems, $actorId) {
            $transfer->loadMissing('items');

            $transferItems = $transfer->items
                ->keyBy('inventory_item_id');

            foreach ($scannedItems as $item) {
                $inventoryId = (int) ($item['inventory_id'] ?? 0);
                $transferItem = $transferItems->get($inventoryId);

                if ($transferItem === null) {
                    throw new InvalidArgumentException("Scanned inventory item {$inventoryId} does not belong to this transfer.");
                }

                $transferItem->update([
                    'is_picked' => true,
                ]);
            }

            $transfer->update(['status' => 'picked']);
            $this->upsertStockTransferMilestone->handle($transfer->fresh(), 'picked', $actorId);

            return $transfer->fresh();
        });
    }
}
