<?php

namespace App\Features\GoodsReceipts\Queries;

use App\Models\DeliveryReceipt;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class GetGoodsReceiptCatalog
{
    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'dr_id' => ['required', 'integer', 'exists:delivery_receipts,id'],
        ]);

        $deliveryReceipt = DeliveryReceipt::query()
            ->with([
                'items:id,delivery_receipt_id,product_master_id',
                'items.spec:id,delivery_receipt_item_id,ram,rom,condition',
                'items.productMaster:id,model_id,master_sku,subcategory_id',
                'items.productMaster.model:id,brand_id,model_name',
                'items.productMaster.model.brand:id,name',
                'items.productMaster.subcategory:id,name,parent_category_id',
                'items.productMaster.subcategory.parent:id,name',
            ])
            ->findOrFail((int) $validated['dr_id']);

        $declaredItems = $deliveryReceipt->items;
        $productMasterIds = $declaredItems->pluck('product_master_id')->filter()->unique()->values();

        $variants = ProductVariant::query()
            ->with([
                'productMaster:id,model_id,subcategory_id',
                'productMaster.model:id,brand_id,model_name',
                'productMaster.model.brand:id,name',
                'productMaster.subcategory:id,name,parent_category_id',
                'productMaster.subcategory.parent:id,name',
            ])
            ->whereIn('product_master_id', $productMasterIds)
            ->where('is_active', true)
            ->get()
            ->filter(function (ProductVariant $variant) use ($declaredItems) {
                return $declaredItems->contains(function ($item) use ($variant) {
                    if ((int) $item->product_master_id !== (int) $variant->product_master_id) {
                        return false;
                    }

                    $requestedRam = $this->normalizeSpec($item->spec?->ram);
                    $requestedRom = $this->normalizeSpec($item->spec?->rom);
                    $requestedCondition = $this->normalizeSpec($item->spec?->condition);

                    $variantRam = $this->normalizeSpec($variant->ram);
                    $variantRom = $this->normalizeSpec($variant->rom);
                    $variantCondition = $this->normalizeSpec($variant->condition);

                    if ($requestedRam !== '' && $variantRam !== $requestedRam) {
                        return false;
                    }
                    if ($requestedRom !== '' && $variantRom !== $requestedRom) {
                        return false;
                    }
                    if ($requestedCondition !== '' && $variantCondition !== $requestedCondition) {
                        return false;
                    }

                    return true;
                });
            })
            ->values();

        $usedProductMasterIds = $variants->pluck('product_master_id')->filter()->unique()->values();
        $productMasters = $declaredItems
            ->map->productMaster
            ->filter()
            ->whereIn('id', $usedProductMasterIds)
            ->unique('id')
            ->values()
            ->map(fn ($pm) => [
                'id' => $pm->id,
                'master_sku' => $pm->master_sku,
                'name' => $pm->product_name,
                'model' => $pm->model?->model_name,
                'brand_id' => $pm->model?->brand_id,
                'brand_name' => $pm->model?->brand?->name,
                'category_id' => $pm->subcategory?->parent?->id,
                'category_name' => $pm->subcategory?->parent?->name,
                'subcategory_id' => $pm->subcategory?->id,
                'subcategory_name' => $pm->subcategory?->name,
            ])
            ->all();

        return [
            'dr_id' => $deliveryReceipt->id,
            'product_masters' => $productMasters,
            'variants' => $variants->map(fn (ProductVariant $variant) => [
                'id' => $variant->id,
                'product_master_id' => $variant->product_master_id,
                'variant_name' => $variant->variant_name,
                'condition' => $variant->condition,
                'model_code' => $variant->model_code,
                'ram' => $variant->ram,
                'rom' => $variant->rom,
                'cpu' => $variant->cpu,
                'gpu' => $variant->gpu,
                'ram_type' => $variant->ram_type,
                'rom_type' => $variant->rom_type,
                'category_name' => $variant->productMaster?->subcategory?->parent?->name,
                'subcategory_name' => $variant->productMaster?->subcategory?->name,
                'brand_name' => $variant->productMaster?->model?->brand?->name,
                'model' => $variant->productMaster?->model?->model_name,
                'attributes' => [
                    'RAM' => $variant->ram,
                    'ROM' => $variant->rom,
                    'Storage' => $variant->rom,
                    'Color' => $variant->color,
                    'CPU' => $variant->cpu,
                    'GPU' => $variant->gpu,
                    'RAM Type' => $variant->ram_type,
                    'ROM Type' => $variant->rom_type,
                    'Model Code' => $variant->model_code,
                ],
            ])->all(),
        ];
    }

    private function normalizeSpec(?string $value): string
    {
        return strtolower(trim((string) $value));
    }
}

