<?php

namespace App\Features\Brands\Actions;

use App\Models\ProductBrand;

class SyncBrandModels
{
    /**
     * @param  array<int, array{id: int|null, model_name: string}>  $rows
     */
    public function handle(ProductBrand $brand, array $rows): void
    {
        $existingIds = collect($rows)
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        $brand->models()
            ->when($existingIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $existingIds))
            ->when($existingIds->isEmpty(), fn ($query) => $query)
            ->delete();

        foreach ($rows as $row) {
            if ($row['id']) {
                $brand->models()->whereKey($row['id'])->update([
                    'model_name' => $row['model_name'],
                ]);

                continue;
            }

            $brand->models()->create([
                'model_name' => $row['model_name'],
            ]);
        }
    }
}
