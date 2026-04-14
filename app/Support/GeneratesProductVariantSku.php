<?php

namespace App\Support;

use App\Models\ProductMaster;

class GeneratesProductVariantSku
{
    /**
     * @param  array{color?: string|null, ram?: string|null, rom?: string|null}  $attributes
     */
    public function fromAttributes(ProductMaster $productMaster, string $condition, array $attributes): string
    {
        $productMaster->loadMissing('model.brand');

        $parts = [
            $this->normalize($productMaster->model->brand->name),
            $this->normalize($productMaster->model->model_name),
            $this->normalize($attributes['ram'] ?? null),
            $this->normalize($attributes['rom'] ?? null),
            $this->normalize($attributes['color'] ?? null),
        ];

        $sku = implode('-', array_values(array_filter($parts, fn ($part) => $part !== '')));

        if ($condition === ProductVariantDefinitions::CONDITION_CERTIFIED_PRE_OWNED) {
            return 'CPO-'.$sku;
        }

        return $sku;
    }

    private function normalize(?string $value): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return '';
        }

        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $value));
    }
}
