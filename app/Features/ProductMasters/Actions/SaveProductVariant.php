<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductVariant;
use App\Models\ProductVariantAttribute;
use App\Support\GeneratesProductVariantName;
use App\Support\GeneratesProductVariantSku;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveProductVariant
{
    public function __construct(
        private readonly GeneratesProductVariantSku $skuGenerator,
        private readonly GeneratesProductVariantName $nameGenerator,
    ) {}

    /**
     * @param  array{
     *     variant_name: string|null,
     *     sku: string|null,
     *     condition: string,
     *     attributes: array<string, string>
     * }  $payload
     */
    public function handle(ProductVariant $productVariant, array $payload): ProductVariant
    {
        return DB::transaction(function () use ($productVariant, $payload) {
            $productVariant->loadMissing('productMaster.model.brand', 'productMaster.subcategory.parent');

            $canonicalAttributes = [
                'color' => $payload['attributes']['color'] ?? '',
                'ram' => $payload['attributes']['ram'] ?? '',
                'storage' => $payload['attributes']['storage'] ?? '',
            ];

            $sku = $this->skuGenerator->fromAttributes(
                $productVariant->productMaster,
                $payload['condition'],
                $canonicalAttributes,
            );

            $skuExists = ProductVariant::query()
                ->where('sku', $sku)
                ->whereKeyNot($productVariant->id)
                ->exists();

            if ($skuExists) {
                throw ValidationException::withMessages([
                    'sku' => "The generated variant SKU {$sku} is already in use.",
                ]);
            }

            $productVariant->update([
                'variant_name' => $this->nameGenerator->fromAttributes(
                    $productVariant->productMaster,
                    $payload['condition'],
                    $canonicalAttributes,
                ),
                'sku' => $sku,
                'condition' => $payload['condition'],
            ]);

            $this->syncValues($productVariant, $payload['attributes']);

            return $productVariant->fresh(['values.attribute', 'productMaster.model.brand']);
        });
    }

    /**
     * @param  array<string, string>  $values
     */
    private function syncValues(ProductVariant $productVariant, array $values): void
    {
        $attributeIds = ProductVariantAttribute::query()
            ->whereIn('key', array_keys($values))
            ->pluck('id', 'key');

        $allowedAttributeIds = $attributeIds->values();

        $productVariant->values()
            ->when(
                $allowedAttributeIds->isNotEmpty(),
                fn ($query) => $query->whereNotIn('product_variant_attribute_id', $allowedAttributeIds),
            )
            ->delete();

        foreach ($values as $key => $value) {
            $value = trim($value);
            $attributeId = $attributeIds->get($key);

            if ($attributeId === null) {
                continue;
            }

            if ($value === '') {
                $productVariant->values()
                    ->where('product_variant_attribute_id', $attributeId)
                    ->delete();

                continue;
            }

            $productVariant->values()->updateOrCreate(
                ['product_variant_attribute_id' => $attributeId],
                ['value' => $value],
            );
        }
    }
}
