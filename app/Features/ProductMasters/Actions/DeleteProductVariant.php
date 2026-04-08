<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductVariant;

class DeleteProductVariant
{
    public function handle(ProductVariant $productVariant): void
    {
        $productVariant->delete();
    }
}
