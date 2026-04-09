<?php

namespace App\Features\Inventory\Support;

use App\Models\InventoryItem;
use App\Models\InventoryItemLog;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\ProductVariantValue;
use App\Models\Warehouse;

class InventoryDataTransformer
{
    public const INVENTORY_RELATIONS = [
        'warehouse',
        'logs.actor',
        'productVariant.values.attribute',
        'productVariant.productMaster.model.brand',
        'productVariant.productMaster.subcategory.parent',
        'productVariant.productMaster.specValues.definition',
    ];

    public const PRODUCT_MASTER_RELATIONS = [
        'model.brand',
        'subcategory.parent',
        'specValues.definition',
    ];

    public const VARIANT_RELATIONS = [
        'values.attribute',
        'productMaster.model.brand',
        'productMaster.subcategory.parent',
    ];

    public static function transformInventoryItem(InventoryItem $item): array
    {
        $item->loadMissing(self::INVENTORY_RELATIONS);

        $variant = $item->productVariant;
        $productMaster = $variant?->productMaster;
        $warehouse = $item->warehouse;
        $attributes = self::variantAttributes($variant);

        return [
            'id' => $item->id,
            'product_master_id' => $productMaster?->id,
            'variant_id' => $variant?->id,
            'warehouse_id' => $warehouse?->id,
            'supplier_id' => $item->supplier_id,
            'imei1' => $item->imei,
            'imei2' => $item->imei2,
            'serial_number' => $item->serial_number,
            'status' => self::normalizeStatus($item->status),
            'cost_price' => $item->cost_price !== null ? (float) $item->cost_price : null,
            'cash_price' => $item->cash_price !== null ? (float) $item->cash_price : null,
            'srp' => $item->srp_price !== null ? (float) $item->srp_price : null,
            'package' => $item->package,
            'warranty_description' => $item->warranty,
            'cpu' => $item->cpu,
            'gpu' => $item->gpu,
            'submodel' => $item->submodel,
            'ram_type' => $item->ram_type,
            'rom_type' => $item->rom_type,
            'ram_slots' => $item->ram_slots,
            'product_type' => $item->product_type,
            'country_model' => $item->country_model,
            'with_charger' => (bool) $item->with_charger,
            'resolution' => $item->resolution,
            'grn_number' => $item->grn_number,
            'purchase' => $item->purchase_reference,
            'purchase_file_data' => $item->purchase_file_data ?? [],
            'created_date' => optional($item->created_at)?->toDateTimeString(),
            'encoded_date' => optional($item->encoded_at ?? $item->created_at)?->toDateTimeString(),
            'updated_at' => optional($item->updated_at)?->toDateTimeString(),
            'logs' => $item->logs
                ->map(fn (InventoryItemLog $log) => self::transformInventoryLog($log))
                ->values()
                ->all(),
            'productName' => $variant?->variant_name ?? '',
            'brandName' => $productMaster?->model?->brand?->name ?? '',
            'masterModel' => $productMaster?->model?->model_name ?? '',
            'warehouseName' => $warehouse?->name ?? 'N/A',
            'barcode' => collect([$item->imei, $item->imei2, $item->serial_number])->filter()->implode(' '),
            'brandId' => $productMaster?->model?->brand?->id,
            'categoryId' => $productMaster?->subcategory?->parent?->id,
            'categoryName' => $productMaster?->subcategory?->parent?->name ?? '',
            'subcategoryId' => $productMaster?->subcategory?->id,
            'subcategoryName' => $productMaster?->subcategory?->name ?? '',
            'variantCondition' => $variant?->condition,
            'attrRAM' => $attributes['ram'] ?? '',
            'attrROM' => $attributes['storage'] ?? '',
            'attrColor' => $attributes['color'] ?? '',
            '_variantAttributes' => $attributes,
        ];
    }

    public static function transformInventoryListItem(InventoryItem $item): array
    {
        return [
            'id' => $item->id,
            'product_master_id' => self::nullableInt($item->getAttribute('product_master_id')),
            'variant_id' => self::nullableInt($item->product_variant_id),
            'warehouse_id' => self::nullableInt($item->warehouse_id),
            'supplier_id' => self::nullableInt($item->supplier_id),
            'imei1' => $item->imei,
            'imei2' => $item->imei2,
            'serial_number' => $item->serial_number,
            'status' => self::normalizeStatus($item->status),
            'cost_price' => $item->cost_price !== null ? (float) $item->cost_price : null,
            'cash_price' => $item->cash_price !== null ? (float) $item->cash_price : null,
            'srp' => $item->srp_price !== null ? (float) $item->srp_price : null,
            'package' => $item->package,
            'warranty_description' => $item->warranty,
            'cpu' => $item->cpu,
            'gpu' => $item->gpu,
            'platform_cpu' => self::nullableString($item->getAttribute('platform_cpu')),
            'platform_gpu' => self::nullableString($item->getAttribute('platform_gpu')),
            'submodel' => $item->submodel,
            'ram_type' => $item->ram_type,
            'rom_type' => $item->rom_type,
            'ram_slots' => $item->ram_slots,
            'product_type' => $item->product_type,
            'country_model' => $item->country_model,
            'with_charger' => (bool) $item->with_charger,
            'resolution' => $item->resolution,
            'grn_number' => $item->grn_number,
            'purchase' => $item->purchase_reference,
            'purchase_file_data' => $item->purchase_file_data ?? [],
            'created_date' => optional($item->created_at)?->toDateTimeString(),
            'encoded_date' => optional($item->encoded_at ?? $item->created_at)?->toDateTimeString(),
            'updated_at' => optional($item->updated_at)?->toDateTimeString(),
            'productName' => self::nullableString($item->getAttribute('product_name')) ?? '',
            'brandName' => self::nullableString($item->getAttribute('brand_name')) ?? '',
            'masterModel' => self::nullableString($item->getAttribute('master_model')) ?? '',
            'warehouseName' => self::nullableString($item->getAttribute('warehouse_name')) ?? 'N/A',
            'barcode' => collect([$item->imei, $item->imei2, $item->serial_number])->filter()->implode(' '),
            'brandId' => self::nullableInt($item->getAttribute('brand_id')),
            'categoryId' => self::nullableInt($item->getAttribute('category_id')),
            'categoryName' => self::nullableString($item->getAttribute('category_name')) ?? '',
            'subcategoryId' => self::nullableInt($item->getAttribute('subcategory_id')),
            'subcategoryName' => self::nullableString($item->getAttribute('subcategory_name')) ?? '',
            'variantCondition' => self::nullableString($item->getAttribute('variant_condition')),
            'attrRAM' => self::nullableString($item->getAttribute('attr_ram')) ?? '',
            'attrROM' => self::nullableString($item->getAttribute('attr_rom')) ?? '',
            'attrColor' => self::nullableString($item->getAttribute('attr_color')) ?? '',
        ];
    }

    public static function transformProductMaster(ProductMaster $productMaster): array
    {
        $productMaster->loadMissing(self::PRODUCT_MASTER_RELATIONS);

        return [
            'id' => $productMaster->id,
            'master_sku' => $productMaster->master_sku,
            'product_name' => $productMaster->product_name,
            'brand_id' => $productMaster->model?->brand?->id,
            'brand_name' => $productMaster->model?->brand?->name,
            'model' => $productMaster->model?->model_name,
            'model_id' => $productMaster->model_id,
            'category_id' => $productMaster->subcategory?->parent?->id,
            'category_name' => $productMaster->subcategory?->parent?->name,
            'subcategory_id' => $productMaster->subcategory?->id,
            'subcategory_name' => $productMaster->subcategory?->name,
            'description' => $productMaster->description,
            'fixed_specifications' => $productMaster->specValues
                ->mapWithKeys(fn ($value) => [$value->definition->key => $value->value])
                ->all(),
            'created_at' => optional($productMaster->created_at)?->toDateTimeString(),
            'updated_at' => optional($productMaster->updated_at)?->toDateTimeString(),
        ];
    }

    public static function transformVariant(ProductVariant $variant): array
    {
        $variant->loadMissing(self::VARIANT_RELATIONS);

        return [
            'id' => $variant->id,
            'product_master_id' => $variant->product_master_id,
            'variant_name' => $variant->variant_name,
            'variant_sku' => $variant->sku,
            'sku' => $variant->sku,
            'condition' => $variant->condition,
            'is_active' => $variant->is_active,
            'attributes' => self::variantAttributes($variant),
            'created_at' => optional($variant->created_at)?->toDateTimeString(),
            'updated_at' => optional($variant->updated_at)?->toDateTimeString(),
        ];
    }

    public static function transformWarehouse(Warehouse $warehouse): array
    {
        return [
            'id' => $warehouse->id,
            'name' => $warehouse->name,
            'warehouse_type' => $warehouse->warehouse_type,
            'city' => $warehouse->city,
            'province' => $warehouse->province,
            'country' => $warehouse->country,
            'sort_order' => $warehouse->sort_order,
            'address' => [
                'street' => $warehouse->street,
                'city' => $warehouse->city,
                'province' => $warehouse->province,
                'zip_code' => $warehouse->zip_code,
                'country' => $warehouse->country,
            ],
            'contact_info' => [
                'phone_number' => $warehouse->phone_number,
                'email' => $warehouse->email,
            ],
        ];
    }

    public static function transformBrand(ProductBrand $brand): array
    {
        return [
            'id' => $brand->id,
            'name' => $brand->name,
        ];
    }

    public static function transformCategory(ProductCategory $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'parent_category_id' => $category->parent_category_id,
        ];
    }

    public static function normalizeStatus(?string $status): string
    {
        $status = trim((string) $status);

        if ($status === '' || $status === 'active') {
            return 'available';
        }

        return $status;
    }

    public static function transformInventoryLog(InventoryItemLog $log): array
    {
        return [
            'id' => $log->id,
            'timestamp' => optional($log->logged_at)?->toDateTimeString(),
            'action' => $log->action,
            'actor_id' => $log->actor_id,
            'actor_name' => $log->actor?->name,
            'notes' => $log->notes,
            'meta' => $log->meta ?? [],
        ];
    }

    public static function variantAttributes(?ProductVariant $variant): array
    {
        if ($variant === null) {
            return [];
        }

        $variant->loadMissing('values.attribute');

        return $variant->values
            ->sortBy(fn (ProductVariantValue $value) => $value->attribute->sort_order)
            ->mapWithKeys(fn (ProductVariantValue $value) => [$value->attribute->key => $value->value])
            ->all();
    }

    private static function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    private static function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
