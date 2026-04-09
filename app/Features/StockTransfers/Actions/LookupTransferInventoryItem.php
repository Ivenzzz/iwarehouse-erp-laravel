<?php

namespace App\Features\StockTransfers\Actions;

use App\Models\InventoryItem;

class LookupTransferInventoryItem
{
    /**
     * @return array<string, mixed>|null
     */
    public function handle(string $barcode): ?array
    {
        $barcode = trim($barcode);
        if ($barcode === '') {
            return null;
        }

        $item = InventoryItem::query()
            ->with([
                'productVariant.values.attribute',
                'productVariant.productMaster.model.brand',
            ])
            ->where(function ($query) use ($barcode) {
                $query
                    ->where('imei', $barcode)
                    ->orWhere('imei2', $barcode)
                    ->orWhere('serial_number', $barcode);
            })
            ->first();

        if ($item === null) {
            return null;
        }

        $variant = $item->productVariant;
        $productMaster = $variant?->productMaster;
        $brand = $productMaster?->model?->brand;
        $attributes = $variant?->values
            ?->mapWithKeys(fn ($value) => [$value->attribute->key => $value->value])
            ->all() ?? [];

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
