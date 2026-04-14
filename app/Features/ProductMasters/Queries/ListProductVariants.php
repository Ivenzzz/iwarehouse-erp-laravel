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
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('sku', 'like', "%{$search}%")
                        ->orWhere('variant_name', 'like', "%{$search}%")
                        ->orWhere('condition', 'like', "%{$search}%")
                        ->orWhere('color', 'like', "%{$search}%")
                        ->orWhere('ram', 'like', "%{$search}%")
                        ->orWhere('rom', 'like', "%{$search}%")
                        ->orWhere('cpu', 'like', "%{$search}%")
                        ->orWhere('gpu', 'like', "%{$search}%")
                        ->orWhere('ram_type', 'like', "%{$search}%")
                        ->orWhere('rom_type', 'like', "%{$search}%")
                        ->orWhere('operating_system', 'like', "%{$search}%")
                        ->orWhere('screen', 'like', "%{$search}%");
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
        return [
            'id' => $variant->id,
            'variant_name' => $variant->variant_name,
            'sku' => $variant->sku,
            'condition' => $variant->condition,
            'is_active' => $variant->is_active,
            'attributes' => $variant->attributesMap(),
            'tags' => $variant->attributeTags(),
            'created_at' => optional($variant->created_at)?->toDateTimeString(),
            'updated_at' => optional($variant->updated_at)?->toDateTimeString(),
        ];
    }
}
