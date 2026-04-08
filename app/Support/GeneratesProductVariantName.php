<?php

namespace App\Support;

use App\Models\ProductMaster;

class GeneratesProductVariantName
{
    /**
     * @param  array{color?: string|null, ram?: string|null, storage?: string|null}  $attributes
     */
    public function fromAttributes(ProductMaster $productMaster, string $condition, array $attributes): string
    {
        $productMaster->loadMissing('model.brand');

        $parts = array_filter([
            trim((string) $productMaster->model->brand->name),
            trim((string) $productMaster->model->model_name),
            $this->clean($attributes['ram'] ?? null),
            $this->clean($attributes['storage'] ?? null),
            $this->clean($attributes['color'] ?? null),
        ]);

        return implode(' ', $parts);
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }
}
