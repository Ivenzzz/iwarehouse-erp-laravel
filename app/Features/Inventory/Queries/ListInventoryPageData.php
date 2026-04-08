<?php

namespace App\Features\Inventory\Queries;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Features\Inventory\Support\InventoryListQuery;
use App\Models\InventoryItem;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ListInventoryPageData
{
    public function __construct(
        private readonly InventoryListQuery $inventoryListQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $filters = $this->inventoryListQuery->filtersFromRequest($request);

        $inventory = $this->inventoryListQuery->applySorting(
            $this->inventoryListQuery->query($filters),
            $filters,
        )->paginate($filters['perPage'])->withQueryString();

        $exactLookup = [
            'active' => false,
            'matchedCount' => 0,
            'outsideCurrentFiltersCount' => 0,
            'search' => $filters['search'],
        ];

        if (
            $inventory->total() === 0
            && $this->inventoryListQuery->isIdentifierSearch($filters['search'])
        ) {
            $matchedCount = $this->inventoryListQuery->applyExactIdentifierFilter(
                $this->inventoryListQuery->query([
                    ...$filters,
                    'location' => 'all',
                    'status' => 'all',
                    'brand' => 'all',
                    'category' => 'all',
                    'stockAge' => 'all',
                    'search' => '',
                ], includeSearch: false),
                $filters['search'],
            )->count();

            if ($matchedCount > 0) {
                $browseMatchedCount = $this->inventoryListQuery->applyExactIdentifierFilter(
                    $this->inventoryListQuery->query($filters, includeSearch: false),
                    $filters['search'],
                )->count();

                $fallbackInventory = $this->inventoryListQuery->applySorting(
                    $this->inventoryListQuery->applyExactIdentifierFilter(
                        $this->inventoryListQuery->query([
                            ...$filters,
                            'location' => 'all',
                            'status' => 'all',
                            'brand' => 'all',
                            'category' => 'all',
                            'stockAge' => 'all',
                            'search' => '',
                        ], includeSearch: false),
                        $filters['search'],
                    ),
                    $filters,
                )->paginate($filters['perPage'])->withQueryString();

                $inventory = $fallbackInventory;
                $exactLookup = [
                    'active' => true,
                    'matchedCount' => $matchedCount,
                    'outsideCurrentFiltersCount' => max(0, $matchedCount - $browseMatchedCount),
                    'search' => $filters['search'],
                ];
            }
        }

        return [
            'inventory' => $this->transformInventoryPaginator($inventory),
            'filters' => $filters,
            'perPageOptions' => InventoryListQuery::PER_PAGE_OPTIONS,
            'exactLookup' => $exactLookup,
            'productMasters' => ProductMaster::query()
                ->with(InventoryDataTransformer::PRODUCT_MASTER_RELATIONS)
                ->orderBy('master_sku')
                ->get()
                ->map(fn (ProductMaster $productMaster) => InventoryDataTransformer::transformProductMaster($productMaster))
                ->values(),
            'variants' => ProductVariant::query()
                ->with(InventoryDataTransformer::VARIANT_RELATIONS)
                ->orderBy('variant_name')
                ->get()
                ->map(fn (ProductVariant $variant) => InventoryDataTransformer::transformVariant($variant))
                ->values(),
            'warehouses' => Warehouse::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Warehouse $warehouse) => InventoryDataTransformer::transformWarehouse($warehouse))
                ->values(),
            'brands' => ProductBrand::query()
                ->orderBy('name')
                ->get()
                ->map(fn (ProductBrand $brand) => InventoryDataTransformer::transformBrand($brand))
                ->values(),
            'categories' => ProductCategory::query()
                ->whereNull('parent_category_id')
                ->orderBy('name')
                ->get()
                ->map(fn (ProductCategory $category) => InventoryDataTransformer::transformCategory($category))
                ->values(),
            'subcategories' => ProductCategory::query()
                ->whereNotNull('parent_category_id')
                ->orderBy('name')
                ->get()
                ->map(fn (ProductCategory $category) => InventoryDataTransformer::transformCategory($category))
                ->values(),
        ];
    }

    private function transformInventoryPaginator(LengthAwarePaginator $inventory): LengthAwarePaginator
    {
        return $inventory->through(fn (InventoryItem $item) => InventoryDataTransformer::transformInventoryItem($item));
    }
}
