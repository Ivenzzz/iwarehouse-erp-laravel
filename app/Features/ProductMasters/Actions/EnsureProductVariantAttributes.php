<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductVariantAttribute;
use App\Support\ProductVariantDefinitions;

class EnsureProductVariantAttributes
{
    /**
     * @param  array<int, string>  $keys
     * @return array<string, int>
     */
    public function handle(array $keys): array
    {
        $keys = collect($keys)
            ->map(fn ($key) => trim((string) $key))
            ->filter(fn ($key) => $key !== '' && $key !== 'condition')
            ->unique()
            ->values()
            ->all();

        if ($keys === []) {
            return [];
        }

        $definitions = collect(ProductVariantDefinitions::all())
            ->keyBy('key');

        foreach ($keys as $key) {
            $definition = $definitions->get($key);

            if ($definition === null) {
                continue;
            }

            ProductVariantAttribute::query()->firstOrCreate(
                ['key' => $key],
                [
                    'label' => $definition['label'],
                    'group' => $definition['group'],
                    'data_type' => $definition['data_type'],
                    'sort_order' => $definition['sort_order'],
                    'is_computer_only' => $definition['is_computer_only'],
                    'is_dimension' => $definition['is_dimension'],
                ],
            );
        }

        return ProductVariantAttribute::query()
            ->whereIn('key', $keys)
            ->pluck('id', 'key')
            ->all();
    }
}
