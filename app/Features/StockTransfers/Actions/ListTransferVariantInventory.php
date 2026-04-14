<?php

namespace App\Features\StockTransfers\Actions;

use App\Models\InventoryItem;

class ListTransferVariantInventory
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function handle(int $sourceLocationId, int $variantId): array
    {
        return InventoryItem::query()
            ->with([
                'productVariant.productMaster.model.brand',
            ])
            ->where('warehouse_id', $sourceLocationId)
            ->where('product_variant_id', $variantId)
            ->where('status', 'available')
            ->orderBy('encoded_at')
            ->orderBy('created_at')
            ->get()
            ->map(fn (InventoryItem $item) => $this->transformInventoryUnit($item))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function transformInventoryUnit(InventoryItem $item): array
    {
        $variant = $item->productVariant;
        $productMaster = $variant?->productMaster;
        $brand = $productMaster?->model?->brand;
        $attributes = $variant?->attributesMap() ?? [];

        return [
            'id' => $item->id,
            'product_master_id' => $productMaster?->id,
            'variant_id' => $variant?->id,
            'product_name' => trim(implode(' ', array_filter([
                $brand?->name,
                $productMaster?->model?->model_name,
            ]))),
            'variant_name' => $variant?->variant_name,
            'brand_name' => $brand?->name,
            'sku' => $variant?->sku,
            'condition' => $variant?->condition,
            'attributes' => $attributes,
            'identifier' => $item->imei ?: $item->imei2 ?: $item->serial_number ?: (string) $item->id,
            'imei1' => $item->imei,
            'imei2' => $item->imei2,
            'serial_number' => $item->serial_number,
            'status' => $item->status,
            'cost_price' => $item->cost_price !== null ? (float) $item->cost_price : null,
            'created_date' => optional($item->created_at)?->toDateTimeString(),
            'encoded_date' => optional($item->encoded_at ?? $item->created_at)?->toDateTimeString(),
        ];
    }
}
