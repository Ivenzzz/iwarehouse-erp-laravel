<?php

namespace App\Features\Inventory\Queries;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Models\InventoryItem;

class FindExactInventoryMatches
{
    /**
     * @return array{rows: array<int, array<string, mixed>>, total: int, hasMore: bool}
     */
    public function handle(string $search, int $limit = 20): array
    {
        $search = trim($search);

        if ($search === '') {
            return ['rows' => [], 'total' => 0, 'hasMore' => false];
        }

        $query = InventoryItem::query()
            ->with(InventoryDataTransformer::INVENTORY_RELATIONS)
            ->where(function ($query) use ($search) {
                $query
                    ->where('imei', $search)
                    ->orWhere('imei2', $search)
                    ->orWhere('serial_number', $search);

                if (ctype_digit($search)) {
                    $query->orWhere('id', (int) $search);
                }
            })
            ->latest();

        $total = (clone $query)->count();
        $rows = $query
            ->limit($limit)
            ->get()
            ->map(fn (InventoryItem $item) => InventoryDataTransformer::transformInventoryItem($item))
            ->values()
            ->all();

        return [
            'rows' => $rows,
            'total' => $total,
            'hasMore' => $total > count($rows),
        ];
    }
}
