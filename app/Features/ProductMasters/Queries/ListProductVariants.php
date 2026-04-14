<?php

namespace App\Features\ProductMasters\Queries;

use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Support\ProductVariantNameSql;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ListProductVariants
{
    public function __invoke(Request $request, ProductMaster $productMaster): array
    {
        $search = trim((string) $request->query('search', ''));

        $variants = ProductVariant::query()
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->where('product_master_id', $productMaster->id)
            ->select('product_variants.*')
            ->selectRaw(ProductVariantNameSql::expression().' as variant_name')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('sku', 'like', "%{$search}%")
                        ->orWhere(DB::raw(ProductVariantNameSql::expression()), 'like', "%{$search}%")
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
            ->orderByRaw(ProductVariantNameSql::expression())
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
