<?php

namespace App\Features\Inventory\Actions;

use App\Models\InventoryItem;
use App\Models\Warehouse;

class BatchMoveInventory
{
    public function __construct(
        private readonly LogInventoryActivity $logInventoryActivity,
    ) {}

    /**
     * @param  array<int, int>  $itemIds
     * @return array{succeeded: array<int, int>, failed: array<int, array{id: int, error: string}>}
     */
    public function handle(array $itemIds, int $targetWarehouseId, ?int $actorId = null): array
    {
        $targetWarehouse = Warehouse::query()->findOrFail($targetWarehouseId);

        $succeeded = [];
        $failed = [];

        $items = InventoryItem::query()
            ->with('warehouse')
            ->whereIn('id', $itemIds)
            ->get()
            ->keyBy('id');

        foreach ($itemIds as $itemId) {
            $item = $items->get($itemId);

            if ($item === null) {
                $failed[] = ['id' => $itemId, 'error' => 'Inventory item not found.'];

                continue;
            }

            try {
                $fromWarehouse = $item->warehouse?->name;
                $item->update(['warehouse_id' => $targetWarehouseId]);

                $this->logInventoryActivity->handle(
                    $item->fresh(),
                    'WAREHOUSE_MOVE',
                    $actorId,
                    "Warehouse moved from {$fromWarehouse} to {$targetWarehouse->name}.",
                    [
                        'from_warehouse' => $fromWarehouse,
                        'to_warehouse' => $targetWarehouse->name,
                    ],
                );

                $succeeded[] = $itemId;
            } catch (\Throwable $exception) {
                $failed[] = ['id' => $itemId, 'error' => $exception->getMessage()];
            }
        }

        return compact('succeeded', 'failed');
    }
}
