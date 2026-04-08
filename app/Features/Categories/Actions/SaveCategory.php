<?php

namespace App\Features\Categories\Actions;

use App\Features\ProductMasters\Actions\SyncCategoryVariantAttributes;
use App\Models\ProductCategory;

class SaveCategory
{
    public function __construct(
        private readonly SyncCategoryVariantAttributes $syncCategoryVariantAttributes,
    ) {}

    /**
     * @param  array{name: string, parent_category_id: int|null}  $payload
     */
    public function handle(array $payload, ?ProductCategory $category = null): ProductCategory
    {
        if ($category === null) {
            $category = ProductCategory::create($payload);
            $this->syncCategoryVariantAttributes->handle($category);

            if ($category->parent_category_id === null) {
                $category->load('children');

                foreach ($category->children as $child) {
                    $this->syncCategoryVariantAttributes->handle($child);
                }
            }

            return $category;
        }

        $category->update($payload);
        $this->syncCategoryVariantAttributes->handle($category);

        if ($category->parent_category_id === null) {
            $category->load('children');

            foreach ($category->children as $child) {
                $this->syncCategoryVariantAttributes->handle($child);
            }
        }

        return $category;
    }
}
