<?php

namespace App\Features\Pos\Queries;

use App\Models\InventoryItem;
use App\Models\Warehouse;
use Illuminate\Support\Collection;

class SearchPosPriceCheck
{
    public function handle(string $search, ?int $warehouseId = null): array
    {
        $term = trim($search);

        if ($term === '') {
            return ['found' => false, 'message' => 'Search term is required.'];
        }

        $normalized = mb_strtolower($term);

        $items = InventoryItem::query()
            ->with([
                'warehouse',
                'productVariant.productMaster.model.brand',
                'productVariant.productMaster.subcategory.parent',
            ])
            ->where('status', 'available')
            ->where(function ($query) use ($term, $normalized) {
                $query
                    ->whereRaw('LOWER(imei) = ?', [$normalized])
                    ->orWhereRaw('LOWER(imei2) = ?', [$normalized])
                    ->orWhereRaw('LOWER(serial_number) = ?', [$normalized])
                    ->orWhereHas('productVariant', function ($variantQuery) use ($term, $normalized) {
                        $variantQuery
                            ->whereRaw('LOWER(sku) = ?', [$normalized])
                            ->orWhereRaw('LOWER(model_code) = ?', [$normalized])
                            ->orWhereRaw('LOWER(sku) like ?', ['%'.mb_strtolower($term).'%'])
                            ->orWhereRaw('LOWER(model_code) like ?', ['%'.mb_strtolower($term).'%'])
                            ->orWhereRaw('LOWER(ram) like ?', ['%'.mb_strtolower($term).'%'])
                            ->orWhereRaw('LOWER(rom) like ?', ['%'.mb_strtolower($term).'%'])
                            ->orWhereRaw('LOWER(color) like ?', ['%'.mb_strtolower($term).'%'])
                            ->orWhereHas('productMaster', function ($masterQuery) use ($term, $normalized) {
                                $masterQuery
                                    ->whereRaw('LOWER(master_sku) = ?', [$normalized])
                                    ->orWhereRaw('LOWER(master_sku) like ?', ['%'.mb_strtolower($term).'%'])
                                    ->orWhereHas('model', function ($modelQuery) use ($term) {
                                        $modelQuery
                                            ->whereRaw('LOWER(model_name) like ?', ['%'.mb_strtolower($term).'%'])
                                            ->orWhereHas('brand', function ($brandQuery) use ($term) {
                                                $brandQuery->whereRaw('LOWER(name) like ?', ['%'.mb_strtolower($term).'%']);
                                            });
                                    });
                            });
                    });
            })
            ->limit(300)
            ->get();

        if ($items->isEmpty()) {
            return ['found' => false, 'message' => 'No product matched your search.'];
        }

        /** @var InventoryItem $selectedInventory */
        $selectedInventory = $warehouseId
            ? $items->firstWhere('warehouse_id', $warehouseId) ?? $items->first()
            : $items->first();

        $variant = $selectedInventory->productVariant;
        $productMaster = $variant?->productMaster;
        $selectedVariantId = $variant?->id;

        $selectedVariantItems = $items
            ->filter(fn (InventoryItem $item) => (int) $item->product_variant_id === (int) $selectedVariantId)
            ->values();

        $stockByBranch = $selectedVariantItems
            ->groupBy('warehouse_id')
            ->map(function (Collection $branchItems, $branchId) use ($warehouseId) {
                /** @var InventoryItem $sample */
                $sample = $branchItems->first();
                $warehouse = $sample?->warehouse;

                return [
                    'warehouse_id' => (int) $branchId,
                    'warehouse_name' => $warehouse?->name ?? 'Unknown Warehouse',
                    'count' => $branchItems->count(),
                    'is_current_branch' => $warehouseId ? (int) $branchId === (int) $warehouseId : false,
                ];
            })
            ->sortByDesc('is_current_branch')
            ->values()
            ->all();

        $totalStock = $selectedVariantItems->count();
        $branchPricingItem = $warehouseId
            ? $selectedVariantItems->firstWhere('warehouse_id', $warehouseId) ?? $selectedVariantItems->first()
            : $selectedVariantItems->first();

        $cashPrice = (float) ($branchPricingItem?->cash_price ?? 0);
        $srp = (float) ($branchPricingItem?->srp_price ?? 0);
        $taxRate = 12;
        $taxAmount = $cashPrice - ($cashPrice / (1 + ($taxRate / 100)));

        $variants = InventoryItem::query()
            ->with(['productVariant.productMaster.model.brand'])
            ->where('status', 'available')
            ->whereHas('productVariant', fn ($query) => $query->where('product_master_id', $productMaster?->id))
            ->get()
            ->pluck('productVariant')
            ->filter()
            ->unique('id')
            ->values()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'variant_name' => $entry->variant_name,
                'variant_sku' => $entry->sku ?: $entry->model_code,
            ])
            ->all();

        $currentBranch = $warehouseId ? Warehouse::query()->find($warehouseId) : null;

        return [
            'found' => true,
            'product' => [
                'id' => $productMaster?->id,
                'name' => $productMaster?->product_name,
                'master_sku' => $productMaster?->master_sku,
                'image_url' => $productMaster?->image_url,
                'brand_name' => $productMaster?->model?->brand?->name,
                'category_name' => $productMaster?->subcategory?->parent?->name,
                'description' => $productMaster?->description,
            ],
            'variant' => [
                'id' => $variant?->id,
                'variant_name' => $variant?->variant_name,
                'variant_sku' => $variant?->sku ?: $variant?->model_code,
                'attributes' => [
                    'ram' => $variant?->ram,
                    'rom' => $variant?->rom,
                    'color' => $variant?->color,
                    'cpu' => $variant?->cpu,
                    'gpu' => $variant?->gpu,
                ],
            ],
            'variants' => $variants,
            'pricing' => [
                'srp' => $srp,
                'cash_price' => $cashPrice,
                'discount_amount' => 0,
                'final_price' => $cashPrice,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'price_before_tax' => max(0, $cashPrice - $taxAmount),
            ],
            'stock_by_branch' => $stockByBranch,
            'total_stock' => $totalStock,
            'current_branch' => $currentBranch ? [
                'id' => $currentBranch->id,
                'name' => $currentBranch->name,
            ] : null,
            'promotions' => [],
        ];
    }
}

