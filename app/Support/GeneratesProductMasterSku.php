<?php

namespace App\Support;

use App\Models\ProductModel;

class GeneratesProductMasterSku
{
    public function fromModel(ProductModel $model): string
    {
        $model->loadMissing('brand');

        return $this->normalize($model->brand->name).'-'.$this->normalize($model->model_name);
    }

    private function normalize(string $value): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $value));
    }
}
