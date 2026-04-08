<?php

namespace Database\Seeders;

use App\Models\ProductVariantAttribute;
use App\Support\ProductVariantDefinitions;
use Illuminate\Database\Seeder;

class ProductVariantAttributeSeeder extends Seeder
{
    public function run(): void
    {
        foreach (ProductVariantDefinitions::all() as $definition) {
            ProductVariantAttribute::query()->updateOrCreate(
                ['key' => $definition['key']],
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
    }
}
