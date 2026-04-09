<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class PosSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProductSpecDefinitionSeeder::class,
            ProductVariantAttributeSeeder::class,
            PosLookupSeeder::class,
            PosCatalogSeeder::class,
            PosCustomerSeeder::class,
            PosInventorySeeder::class,
            PosSalesHistorySeeder::class,
        ]);
    }
}
