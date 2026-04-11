<?php

namespace App\Features\Inventory\Queries;

use App\Models\ProductVariant;
use Illuminate\Http\Request;

class ListInventoryVariantOptions
{
    /**
     * @return array{variants: array<string, mixed>, filters: array{search: string}}
     */
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $productMasterId = $request->query('productMasterId');

        $variants = ProductVariant::query()
            ->with('productMaster.model.brand')
            ->when($productMasterId !== null && $productMasterId !== '', function ($query) use ($productMasterId) {
                $query->where('product_master_id', (int) $productMasterId);
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('variant_name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('condition', 'like', "%{$search}%")
                        ->orWhereHas('productMaster.model', function ($query) use ($search) {
                            $query->where('model_name', 'like', "%{$search}%")
                                ->orWhereHas('brand', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                        });
                });
            })
            ->orderBy('variant_name')
            ->paginate(15)
            ->through(function (ProductVariant $variant) {
                $brandName = $variant->productMaster?->model?->brand?->name;
                $modelName = $variant->productMaster?->model?->model_name;

                return [
                    'id' => $variant->id,
                    'product_master_id' => $variant->product_master_id,
                    'variant_name' => $variant->variant_name,
                    'sku' => $variant->sku,
                    'condition' => $variant->condition,
                    'label' => $variant->variant_name ?: $variant->sku,
                    'description' => collect([$brandName, $modelName, $variant->condition])->filter()->implode(' | '),
                ];
            });

        return [
            'variants' => $variants,
            'filters' => [
                'search' => $search,
                'productMasterId' => $productMasterId !== null && $productMasterId !== '' ? (int) $productMasterId : null,
            ],
        ];
    }
}
