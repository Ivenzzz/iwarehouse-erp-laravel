<?php

namespace App\Features\Inventory\Actions;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Models\InventoryItem;

class GetInventoryKpis
{
    /**
     * @return array{totalItems: int, availableStock: int, totalValuation: float}
     */
    public function handle(): array
    {
        $allItems = InventoryItem::query()->get(['status', 'cost_price']);

        return [
            'totalItems' => $allItems->count(),
            'availableStock' => $allItems
                ->filter(fn (InventoryItem $item) => InventoryDataTransformer::normalizeStatus($item->status) === 'available')
                ->count(),
            'totalValuation' => (float) $allItems->sum(fn (InventoryItem $item) => (float) ($item->cost_price ?? 0)),
        ];
    }
}
