<?php

namespace App\Features\Pos\Queries;

use App\Features\Pos\Support\PosDataTransformer;
use App\Models\InventoryItem;
use Illuminate\Support\Collection;

class SearchPosInventory
{
    public function __construct(private readonly PosDataTransformer $transformer)
    {
    }

    public function handle(string $search, int $warehouseId, int $limit = 20): array
    {
        $normalizedSearch = trim($search);

        if ($normalizedSearch === '') {
            return ['rows' => []];
        }

        $query = InventoryItem::query()
            ->with([
                'productVariant.values.attribute',
                'productVariant.productMaster.model.brand',
                'productVariant.productMaster.subcategory.parent',
            ])
            ->where('warehouse_id', $warehouseId)
            ->where('status', 'available');

        $query->where(function ($builder) use ($normalizedSearch) {
            if (preg_match('/^[a-z0-9]{6}$/i', $normalizedSearch)) {
                $builder
                    ->where('imei', 'like', '%'.$normalizedSearch)
                    ->orWhere('imei2', 'like', '%'.$normalizedSearch)
                    ->orWhere('serial_number', 'like', '%'.$normalizedSearch);

                return;
            }

            $builder
                ->where('imei', $normalizedSearch)
                ->orWhere('imei2', $normalizedSearch)
                ->orWhere('serial_number', $normalizedSearch);
        });

        /** @var Collection<int, InventoryItem> $items */
        $items = $query
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $rows = $items->map(function (InventoryItem $item) use ($warehouseId) {
            $stockOnHand = InventoryItem::query()
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $item->product_variant_id)
                ->where('status', 'available')
                ->count();

            return $this->transformer->transformInventorySearchItem($item, $stockOnHand);
        })->values();

        return ['rows' => $rows];
    }
}
