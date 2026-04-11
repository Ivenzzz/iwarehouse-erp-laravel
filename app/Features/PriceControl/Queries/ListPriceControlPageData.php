<?php

namespace App\Features\PriceControl\Queries;

use App\Features\PriceControl\Support\PriceControlQuery;
use App\Models\Warehouse;
use Illuminate\Http\Request;

class ListPriceControlPageData
{
    public function __construct(
        private readonly PriceControlQuery $priceControlQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $filters = $this->priceControlQuery->filtersFromRequest($request);

        $items = $this->priceControlQuery
            ->applySorting($this->priceControlQuery->query($filters), $filters)
            ->paginate($filters['perPage'])
            ->withQueryString()
            ->through(fn ($item) => $this->priceControlQuery->transformInventoryRow($item));

        return [
            'inventory' => $items,
            'filters' => $filters,
            'hasSearched' => $this->priceControlQuery->hasSearch($filters),
            'selectedVariant' => $filters['variant_id']
                ? $this->selectedVariant($filters['variant_id'])
                : null,
            'warehouses' => Warehouse::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Warehouse $warehouse) => [
                    'id' => $warehouse->id,
                    'name' => $warehouse->name,
                ])
                ->values(),
            'statusOptions' => PriceControlQuery::FILTER_STATUS_OPTIONS,
            'perPageOptions' => PriceControlQuery::PER_PAGE_OPTIONS,
        ];
    }

    private function selectedVariant(int $variantId): ?array
    {
        $variant = ListPriceControlVariants::baseQuery()
            ->where('product_variants.id', $variantId)
            ->first();

        return $variant ? $this->priceControlQuery->transformVariantRow($variant) : null;
    }
}
