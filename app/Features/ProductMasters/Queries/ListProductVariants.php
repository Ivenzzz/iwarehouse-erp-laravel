<?php

namespace App\Features\ProductMasters\Queries;

use App\Models\ProductMaster;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class ListProductVariants
{
    public function __invoke(Request $request, ProductMaster $productMaster): array
    {
        $search = trim((string) $request->query('search', ''));

        $variants = ProductVariant::query()
            ->where('product_master_id', $productMaster->id)
            ->with(['values.attribute'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('sku', 'like', "%{$search}%")
                        ->orWhere('variant_name', 'like', "%{$search}%")
                        ->orWhere('condition', 'like', "%{$search}%")
                        ->orWhereHas('values', fn ($query) => $query->where('value', 'like', "%{$search}%"));
                });
            })
            ->orderBy('variant_name')
            ->paginate(10)
            ->through(fn (ProductVariant $variant) => self::transformVariant($variant));

        return [
            'variants' => $variants,
            'filters' => [
                'search' => $search,
            ],
        ];
    }

    public static function transformVariant(ProductVariant $variant): array
    {
        $attributes = $variant->values
            ->sortBy(fn ($value) => $value->attribute->sort_order)
            ->mapWithKeys(fn ($value) => [$value->attribute->key => $value->value])
            ->all();
        $tags = $variant->values
            ->sortBy(fn ($value) => $value->attribute->sort_order)
            ->map(fn ($value) => [
                'key' => $value->attribute->key,
                'label' => $value->attribute->label,
                'value' => $value->value,
            ])
            ->values()
            ->all();

        return [
            'id' => $variant->id,
            'variant_name' => $variant->variant_name,
            'sku' => $variant->sku,
            'condition' => $variant->condition,
            'is_active' => $variant->is_active,
            'attributes' => $attributes,
            'tags' => $tags,
            'created_at' => optional($variant->created_at)?->toDateTimeString(),
            'updated_at' => optional($variant->updated_at)?->toDateTimeString(),
        ];
    }
}
