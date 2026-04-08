<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductCategory;
use App\Models\ProductVariantAttribute;
use App\Support\ProductVariantDefinitions;

class SyncCategoryVariantAttributes
{
    public function __construct(
        private readonly EnsureProductVariantAttributes $ensureProductVariantAttributes,
    ) {}

    public function handle(ProductCategory $category): void
    {
        $allowedKeys = ProductVariantDefinitions::allowedKeysForCategory($category);
        $attributeIds = array_values($this->ensureProductVariantAttributes->handle($allowedKeys));

        $category->variantAttributes()->sync($attributeIds);
    }
}
