<?php

namespace App\Features\Categories\Actions;

use App\Models\ProductCategory;

class SaveCategory
{
    /**
     * @param  array{name: string, parent_category_id: int|null}  $payload
     */
    public function handle(array $payload, ?ProductCategory $category = null): ProductCategory
    {
        if ($category === null) {
            return ProductCategory::create($payload);
        }

        $category->update($payload);

        return $category;
    }
}
