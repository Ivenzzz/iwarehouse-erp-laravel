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
            'selectedVariant' => $this->selectedVariant($filters),
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

    private function selectedVariant(array $filters): ?array
    {
        if (! empty($filters['product_master_id'])) {
            $query = ListPriceControlVariants::baseQuery()
                ->where('product_variants.product_master_id', (int) $filters['product_master_id']);

            if (($filters['variant_ram'] ?? '') !== '') {
                $query->where('variant_ram_values.value', $filters['variant_ram']);
            }

            if (($filters['variant_rom'] ?? '') !== '') {
                $query->where('variant_rom_values.value', $filters['variant_rom']);
            }

            if (($filters['condition'] ?? '') !== '') {
                $query->where('product_variants.condition', $filters['condition']);
            }

            $variant = $query->first();

            return $variant ? $this->priceControlQuery->transformVariantRow($variant) : null;
        }

        if (empty($filters['variant_id'])) {
            return null;
        }

        $variant = ListPriceControlVariants::baseQuery()
            ->where('product_variants.id', (int) $filters['variant_id'])
            ->first();

        return $variant ? $this->priceControlQuery->transformVariantRow($variant) : null;
    }
}
