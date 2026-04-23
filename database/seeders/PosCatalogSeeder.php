<?php

namespace Database\Seeders;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Support\ProductVariantDefinitions;
use Illuminate\Database\Seeder;

class PosCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $phonesCategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Mobile Devices', 'parent_category_id' => null],
            [],
        );

        $smartphonesSubcategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Smartphones', 'parent_category_id' => $phonesCategory->id],
            [],
        );

        $accessoriesCategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Accessories & Storage', 'parent_category_id' => null],
            [],
        );

        $mobileAccessoriesSubcategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Chargers & Powerbanks', 'parent_category_id' => $accessoriesCategory->id],
            [],
        );

        $iphoneVariant = $this->seedVariant(
            brandName: 'Apple',
            modelName: 'IPHONE 15',
            masterSku: 'APPLE-IPHONE15',
            subcategoryId: $smartphonesSubcategory->id,
            sku: 'APPLE-IPHONE15-8GB-256GB-BLACK',
            condition: ProductVariantDefinitions::CONDITION_BRAND_NEW,
            attributes: [
                'color' => 'BLACK',
                'ram' => '8GB',
                'rom' => '256GB',
            ],
        );

        $samsungVariant = $this->seedVariant(
            brandName: 'SAMSUNG',
            modelName: 'GALAXY A55 5G',
            masterSku: 'SAMSUNG-GALAXYA55',
            subcategoryId: $smartphonesSubcategory->id,
            sku: 'SAMSUNG-GALAXYA55-8GB-256GB-ICEBLUE',
            condition: ProductVariantDefinitions::CONDITION_BRAND_NEW,
            attributes: [
                'color' => 'ICE BLUE',
                'ram' => '8GB',
                'rom' => '256GB',
            ],
        );

        $chargerVariant = $this->seedVariant(
            brandName: 'ANKER',
            modelName: 'Nano 20W Charger',
            masterSku: 'ANKER-NANO-20W',
            subcategoryId: $mobileAccessoriesSubcategory->id,
            sku: 'ANKER-NANO20W-WHITE',
            condition: ProductVariantDefinitions::CONDITION_BRAND_NEW,
            attributes: [
                'color' => 'WHITE',
            ],
        );
    }

    private function seedVariant(
        string $brandName,
        string $modelName,
        string $masterSku,
        int $subcategoryId,
        string $sku,
        string $condition,
        array $attributes,
    ): ProductVariant {
        $brand = ProductBrand::query()->updateOrCreate(['name' => $brandName], []);

        $model = ProductModel::query()->updateOrCreate(
            ['brand_id' => $brand->id, 'model_name' => $modelName],
            [],
        );

        $master = ProductMaster::query()->updateOrCreate(
            ['master_sku' => $masterSku],
            [
                'model_id' => $model->id,
                'subcategory_id' => $subcategoryId,
                'description' => $modelName.' demo catalog entry for POS.',
            ],
        );

        $variant = ProductVariant::query()->updateOrCreate(
            ['sku' => $sku],
            [
                'product_master_id' => $master->id,
                'model_code' => $attributes['model_code'] ?? null,
                'condition' => $condition,
                'color' => $attributes['color'] ?? null,
                'ram' => $attributes['ram'] ?? null,
                'rom' => $attributes['rom'] ?? null,
                'cpu' => $attributes['cpu'] ?? null,
                'gpu' => $attributes['gpu'] ?? null,
                'ram_type' => $attributes['ram_type'] ?? null,
                'rom_type' => $attributes['rom_type'] ?? null,
                'operating_system' => $attributes['operating_system'] ?? null,
                'screen' => $attributes['screen'] ?? null,
                'is_active' => true,
            ],
        );

        return $variant;
    }
}
