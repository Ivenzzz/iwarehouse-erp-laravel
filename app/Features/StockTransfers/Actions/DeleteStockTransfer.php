<?php

namespace App\Features\StockTransfers\Actions;

use App\Features\Inventory\Actions\LogInventoryActivity;
use App\Models\StockTransfer;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DeleteStockTransfer
{
    public function __construct(
        private readonly LogInventoryActivity $logInventoryActivity,
    ) {
    }

    public function handle(StockTransfer $transfer, ?int $actorId = null): void
    {
        if ($transfer->status !== 'draft') {
            throw new InvalidArgumentException('Only draft transfers can be deleted.');
        }

        DB::transaction(function () use ($transfer, $actorId) {
            $transfer->loadMissing('items.inventoryItem');

            foreach ($transfer->items as $transferItem) {
                $item = $transferItem->inventoryItem;
                if ($item === null) {
                    continue;
                }

                $item->update(['status' => 'available']);
                $this->logInventoryActivity->handle(
                    $item->fresh(),
                    'STOCK_TRANSFER_RELEASED',
                    $actorId,
                    "Released from stock transfer {$transfer->transfer_number}.",
                    [
                        'transfer_id' => $transfer->id,
                        'transfer_number' => $transfer->transfer_number,
                    ],
                );
            }

            $transfer->delete();
        });
    }
}
