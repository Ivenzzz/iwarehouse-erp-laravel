<?php

namespace App\Features\StockTransfers\Actions;

use App\Models\InventoryItem;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;

class SearchTransferProducts
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function handle(int $sourceLocationId, string $query): array
    {
        $normalized = trim($query);
        if ($normalized === '') {
            return [];
        }

        $condition = null;
        $lower = strtolower($normalized);
        if (str_ends_with($lower, ' bn')) {
            $condition = 'Brand New';
            $normalized = trim(substr($normalized, 0, -3));
        } elseif (str_ends_with($lower, ' cpo')) {
            $condition = 'Certified Pre-Owned';
            $normalized = trim(substr($normalized, 0, -4));
        }

        $tokens = collect(preg_split('/\s+/', strtolower($normalized)) ?: [])->filter()->values();

        return InventoryItem::query()
            ->with([
                'productVariant.values.attribute',
                'productVariant.productMaster.model.brand',
            ])
            ->where('warehouse_id', $sourceLocationId)
            ->where('status', 'available')
            ->get()
            ->filter(function (InventoryItem $item) use ($tokens, $condition) {
                $variant = $item->productVariant;
                $productMaster = $variant?->productMaster;
                $brand = $productMaster?->model?->brand;

                if ($condition !== null && $variant?->condition !== $condition) {
                    return false;
                }

                if ($tokens->isEmpty()) {
                    return true;
                }

                $searchable = strtolower(implode(' ', array_filter([
                    $variant?->variant_name,
                    $brand?->name,
                    $productMaster?->model?->model_name,
                    $item->imei,
                    $item->imei2,
                    $item->serial_number,
                ])));

                return $tokens->every(fn (string $token) => str_contains($searchable, $token));
            })
            ->groupBy('product_variant_id')
            ->map(fn (Collection $items) => $this->transformVariantResult($items))
            ->filter()
            ->sortByDesc('total_stock')
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, InventoryItem>  $items
     * @return array<string, mixed>|null
     */
    private function transformVariantResult(Collection $items): ?array
    {
        /** @var InventoryItem|null $sample */
        $sample = $items->first();
        /** @var ProductVariant|null $variant */
        $variant = $sample?->productVariant;

        if ($sample === null || $variant === null) {
            return null;
        }

        $productMaster = $variant->productMaster;
        $brand = $productMaster?->model?->brand;
        $attributes = $variant->values
            ->mapWithKeys(fn ($value) => [$value->attribute->key => $value->value])
            ->all();

        return [
            'id' => $variant->id,
            'product_master_id' => $productMaster?->id,
            'variant_name' => $variant->variant_name,
            'product_name' => trim(implode(' ', array_filter([
                $brand?->name,
                $productMaster?->model?->model_name,
            ]))),
            'brand_name' => $brand?->name,
            'sku' => $variant->sku,
            'condition' => $variant->condition,
            'attributes' => $attributes,
            'total_stock' => $items->count(),
        ];
    }
}
