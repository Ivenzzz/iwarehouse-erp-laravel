<?php

namespace Database\Seeders;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\ProductVariantAttribute;
use App\Models\ProductVariantValue;
use App\Support\ProductVariantDefinitions;
use Illuminate\Database\Seeder;

class PosCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $phonesCategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Phones', 'parent_category_id' => null],
            [],
        );

        $smartphonesSubcategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Smartphones', 'parent_category_id' => $phonesCategory->id],
            [],
        );

        $accessoriesCategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Accessories', 'parent_category_id' => null],
            [],
        );

        $mobileAccessoriesSubcategory = ProductCategory::query()->updateOrCreate(
            ['name' => 'Mobile Accessories', 'parent_category_id' => $accessoriesCategory->id],
            [],
        );

        $iphoneVariant = $this->seedVariant(
            brandName: 'Apple',
            modelName: 'iPhone 15',
            masterSku: 'APPLE-IP15',
            subcategoryId: $smartphonesSubcategory->id,
            variantName: '8GB / 256GB Black',
            sku: 'APPLE-IP15-8GB-256GB-BLACK',
            condition: ProductVariantDefinitions::CONDITION_BRAND_NEW,
            attributes: [
                'color' => 'Black',
                'ram' => '8GB',
                'storage' => '256GB',
            ],
        );

        $samsungVariant = $this->seedVariant(
            brandName: 'Samsung',
            modelName: 'Galaxy A55 5G',
            masterSku: 'SAMSUNG-A55',
            subcategoryId: $smartphonesSubcategory->id,
            variantName: '8GB / 256GB Iceblue',
            sku: 'SAMSUNG-A55-8GB-256GB-ICEBLUE',
            condition: ProductVariantDefinitions::CONDITION_BRAND_NEW,
            attributes: [
                'color' => 'Iceblue',
                'ram' => '8GB',
                'storage' => '256GB',
            ],
        );

        $chargerVariant = $this->seedVariant(
            brandName: 'Anker',
            modelName: 'Nano 20W Charger',
            masterSku: 'ANKER-NANO-20W',
            subcategoryId: $mobileAccessoriesSubcategory->id,
            variantName: 'White',
            sku: 'ANKER-NANO-20W-WHITE',
            condition: ProductVariantDefinitions::CONDITION_BRAND_NEW,
            attributes: [
                'color' => 'White',
            ],
        );

        foreach ([$smartphonesSubcategory, $mobileAccessoriesSubcategory] as $subcategory) {
            foreach (ProductVariantDefinitions::commonKeys() as $attributeKey) {
                $attribute = ProductVariantAttribute::query()->where('key', $attributeKey)->first();

                if ($attribute === null) {
                    continue;
                }

                $subcategory->variantAttributes()->syncWithoutDetaching([$attribute->id]);
            }
        }
    }

    private function seedVariant(
        string $brandName,
        string $modelName,
        string $masterSku,
        int $subcategoryId,
        string $variantName,
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
                'variant_name' => $variantName,
                'condition' => $condition,
                'is_active' => true,
            ],
        );

        foreach ($attributes as $key => $value) {
            $attribute = ProductVariantAttribute::query()->where('key', $key)->first();

            if ($attribute === null) {
                continue;
            }

            ProductVariantValue::query()->updateOrCreate(
                [
                    'product_variant_id' => $variant->id,
                    'product_variant_attribute_id' => $attribute->id,
                ],
                ['value' => $value],
            );
        }

        return $variant;
    }
}
