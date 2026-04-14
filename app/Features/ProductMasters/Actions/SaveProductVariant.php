<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductVariant;
use App\Support\GeneratesProductVariantSku;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveProductVariant
{
    public function __construct(
        private readonly GeneratesProductVariantSku $skuGenerator,
    ) {}

    /**
     * @param  array{
     *     model_code: string|null,
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
                'model_code' => $payload['attributes']['model_code'] ?? '',
                'color' => $payload['attributes']['color'] ?? '',
                'ram' => $payload['attributes']['ram'] ?? '',
                'rom' => $payload['attributes']['rom'] ?? '',
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
                'sku' => $sku,
                'condition' => $payload['condition'],
                ...$this->variantColumns($payload['attributes']),
            ]);

            return $productVariant->fresh(['productMaster.model.brand']);
        });
    }

    /** @param array<string, string> $attributes */
    private function variantColumns(array $attributes): array
    {
        return collect([
            'model_code',
            'color',
            'ram',
            'rom',
            'cpu',
            'gpu',
            'ram_type',
            'rom_type',
            'operating_system',
            'screen',
        ])->mapWithKeys(fn (string $key) => [
            $key => trim((string) ($attributes[$key] ?? '')) ?: null,
        ])->all();
    }
}
