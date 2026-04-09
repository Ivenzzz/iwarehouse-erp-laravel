<?php

namespace App\Features\StockTransfers\Actions;

use App\Features\Inventory\Actions\LogInventoryActivity;
use App\Models\StockTransfer;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ShipStockTransfer
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
        if ($transfer->status !== 'picked') {
            throw new InvalidArgumentException('Only picked transfers can be shipped.');
        }

        return DB::transaction(function () use ($transfer, $data, $actorId) {
            $transfer->loadMissing('items.inventoryItem');

            foreach ($transfer->items as $transferItem) {
                $transferItem->update(['is_shipped' => true]);

                $item = $transferItem->inventoryItem;
                if ($item === null) {
                    continue;
                }

                $item->update(['status' => 'in_transit']);
                $this->logInventoryActivity->handle(
                    $item->fresh(),
                    'STOCK_TRANSFER_SHIPPED',
                    $actorId,
                    "Shipped under stock transfer {$transfer->transfer_number}.",
                    [
                        'transfer_id' => $transfer->id,
                        'transfer_number' => $transfer->transfer_number,
                    ],
                );
            }

            $transfer->shipment()->updateOrCreate(
                ['stock_transfer_id' => $transfer->id],
                [
                    'driver_name' => $data['driver_name'] ?: null,
                    'driver_contact' => $data['driver_contact'] ?: null,
                    'courier_name' => $data['courier_name'] ?: null,
                    'proof_of_dispatch_path' => $data['proof_of_dispatch_url'] ?: null,
                    'remarks' => $data['remarks'] ?: null,
                ],
            );

            $transfer->update(['status' => 'shipped']);
            $this->upsertStockTransferMilestone->handle($transfer->fresh(), 'shipped', $actorId);

            return $transfer->fresh();
        });
    }
}
