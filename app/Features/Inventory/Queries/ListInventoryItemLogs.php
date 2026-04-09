<?php

namespace App\Features\Inventory\Queries;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Models\InventoryItem;

class ListInventoryItemLogs
{
    /**
     * @return array{logs: array<int, array<string, mixed>>}
     */
    public function __invoke(InventoryItem $inventoryItem): array
    {
        $inventoryItem->loadMissing('logs.actor');

        return [
            'logs' => $inventoryItem->logs
                ->map(fn ($log) => InventoryDataTransformer::transformInventoryLog($log))
                ->values()
                ->all(),
        ];
    }
}
