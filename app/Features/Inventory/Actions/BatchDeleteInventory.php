<?php

namespace App\Features\Inventory\Actions;

use App\Models\InventoryItem;

class BatchDeleteInventory
{
    /**
     * @param  array<int, int>  $itemIds
     * @return array{deleted: int, failed: int, errors: array<int, array{id: int, reason: string}>}
     */
    public function handle(array $itemIds): array
    {
        $deleted = 0;
        $failed = 0;
        $errors = [];

        foreach ($itemIds as $itemId) {
            try {
                $item = InventoryItem::query()->find($itemId);

                if ($item === null) {
                    throw new \RuntimeException('Inventory item not found.');
                }

                $item->delete();
                $deleted++;
            } catch (\Throwable $exception) {
                $failed++;
                $errors[] = ['id' => $itemId, 'reason' => $exception->getMessage()];
            }
        }

        return compact('deleted', 'failed', 'errors');
    }
}
