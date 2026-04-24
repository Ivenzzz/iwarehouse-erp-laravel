<?php

namespace App\Features\Inventory\Actions;

use App\Features\Inventory\Support\InventoryListQuery;
use Illuminate\Database\Eloquent\Builder;

class GetInventoryKpis
{
    public function __construct(
        private readonly InventoryListQuery $inventoryListQuery,
    ) {
    }

    /**
     * @return array{totalItems: int, availableStock: int, totalValuation: float}
     */
    public function handle(array $filters = []): array
    {
        $baseFilters = [
            'search' => '',
            'location' => 'all',
            'status' => 'all',
            'brand' => 'all',
            'model' => 'all',
            'category' => 'all',
            'condition' => 'all',
            'stockAge' => 'all',
            'sort' => 'encoded_date',
            'direction' => 'desc',
            'perPage' => 50,
        ];
        $resolvedFilters = [...$baseFilters, ...$filters];
        $query = $this->inventoryListQuery->query($resolvedFilters);

        return [
            'totalItems' => $this->countDistinctInventoryItems($query),
            'availableStock' => $this->countDistinctInventoryItems(
                (clone $query)->whereIn('inventory_items.status', ['available', 'active']),
            ),
            'totalValuation' => (float) ((clone $query)->sum('inventory_items.cost_price') ?? 0),
        ];
    }

    private function countDistinctInventoryItems(Builder $query): int
    {
        return (int) ((clone $query)
            ->toBase()
            ->distinct()
            ->count('inventory_items.id'));
    }
}
