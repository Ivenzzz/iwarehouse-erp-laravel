<?php

namespace Database\Seeders;

use App\Models\ProductSpecDefinition;
use App\Support\ProductMasterSpecDefinitions;
use Illuminate\Database\Seeder;

class ProductSpecDefinitionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (ProductMasterSpecDefinitions::all() as $definition) {
            ProductSpecDefinition::updateOrCreate(
                ['key' => $definition['key']],
                [
                    'label' => $definition['label'],
                    'group' => $definition['group'],
                    'sort_order' => $definition['sort_order'],
                ],
            );
        }
    }
}
