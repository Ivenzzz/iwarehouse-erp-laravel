<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\ProductVariantAttribute;
use App\Models\User;
use Database\Seeders\ProductSpecDefinitionSeeder;
use Database\Seeders\ProductVariantAttributeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductVariantsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ProductSpecDefinitionSeeder::class);
        $this->seed(ProductVariantAttributeSeeder::class);
    }

    public function test_product_masters_page_includes_variant_counts_and_variant_definitions(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();
        ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
        ]);

        $this->actingAs($user)
            ->get(route('product-masters.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProductMasters')
                ->has('variantDefinitions.groups')
                ->where('productMasters.data.0.variants_count', 1)
            );
    }

    public function test_guests_cannot_generate_variants(): void
    {
        $productMaster = $this->createProductMaster();

        $this->postJson(route('product-masters.variants.generate', $productMaster), [
            'conditions' => ['Brand New'],
        ])->assertUnauthorized();
    }

    public function test_user_can_generate_variants_and_skip_duplicates(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New', 'Certified Pre-Owned'],
                'colors' => ['Black'],
                'rams' => ['8GB'],
                'storages' => ['256GB'],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 2)
            ->assertJsonPath('summary.created', 2)
            ->assertJsonPath('summary.skipped', 0);

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New', 'Certified Pre-Owned'],
                'colors' => ['Black'],
                'rams' => ['8GB'],
                'storages' => ['256GB'],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 2)
            ->assertJsonPath('summary.created', 0)
            ->assertJsonPath('summary.skipped', 2);

        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'condition' => 'Brand New',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'sku' => 'CPO-APPLE-IPHONE17-8GB-256GB-BLACK',
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'condition' => 'Certified Pre-Owned',
        ]);
    }

    public function test_computer_shared_attributes_apply_without_changing_combination_count(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster(
            brandName: 'Dell',
            modelName: 'Latitude 7440',
            categoryName: 'Computers',
            subcategoryName: 'Laptops',
        );

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New'],
                'colors' => ['Silver', 'Black'],
                'rams' => ['16GB', '32GB'],
                'storages' => ['512GB'],
                'shared_attributes' => [
                    'cpu' => 'Intel Core Ultra 7',
                    'gpu' => 'Intel Arc',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 4)
            ->assertJsonPath('summary.created', 4)
            ->assertJsonPath('summary.skipped', 0);

        $this->assertSame(4, ProductVariant::count());

        $cpuAttribute = ProductVariantAttribute::where('key', 'cpu')->firstOrFail();
        $gpuAttribute = ProductVariantAttribute::where('key', 'gpu')->firstOrFail();

        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_attribute_id' => $cpuAttribute->id,
            'value' => 'Intel Core Ultra 7',
        ]);
        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_attribute_id' => $gpuAttribute->id,
            'value' => 'Intel Arc',
        ]);
    }

    public function test_generation_auto_creates_missing_dimension_attributes_and_values(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();

        ProductVariantAttribute::query()
            ->whereIn('key', ['color', 'ram', 'storage'])
            ->delete();

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New'],
                'colors' => ['Black'],
                'rams' => ['8GB'],
                'storages' => ['256GB'],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 1)
            ->assertJsonPath('summary.created', 1)
            ->assertJsonPath('summary.skipped', 0);

        $colorAttribute = ProductVariantAttribute::where('key', 'color')->firstOrFail();
        $ramAttribute = ProductVariantAttribute::where('key', 'ram')->firstOrFail();
        $storageAttribute = ProductVariantAttribute::where('key', 'storage')->firstOrFail();

        $this->assertSame('Color', $colorAttribute->label);
        $this->assertSame('Core', $colorAttribute->group);
        $this->assertSame('RAM', $ramAttribute->label);
        $this->assertSame('Storage', $storageAttribute->label);

        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_attribute_id' => $colorAttribute->id,
            'value' => 'Black',
        ]);
        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_attribute_id' => $ramAttribute->id,
            'value' => '8GB',
        ]);
        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_attribute_id' => $storageAttribute->id,
            'value' => '256GB',
        ]);
    }

    public function test_generation_auto_creates_missing_shared_attributes_for_allowed_category(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster(
            brandName: 'Dell',
            modelName: 'Latitude 7440',
            categoryName: 'Computers',
            subcategoryName: 'Laptops',
        );

        ProductVariantAttribute::query()
            ->whereIn('key', ['cpu', 'gpu'])
            ->delete();

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New'],
                'colors' => ['Silver'],
                'rams' => ['16GB'],
                'storages' => ['512GB'],
                'shared_attributes' => [
                    'cpu' => 'Intel Core Ultra 7',
                    'gpu' => 'Intel Arc',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 1)
            ->assertJsonPath('summary.created', 1)
            ->assertJsonPath('summary.skipped', 0);

        $cpuAttribute = ProductVariantAttribute::where('key', 'cpu')->firstOrFail();
        $gpuAttribute = ProductVariantAttribute::where('key', 'gpu')->firstOrFail();

        $this->assertSame('Computer Specs', $cpuAttribute->group);
        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_attribute_id' => $cpuAttribute->id,
            'value' => 'Intel Core Ultra 7',
        ]);
        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_attribute_id' => $gpuAttribute->id,
            'value' => 'Intel Arc',
        ]);
    }

    public function test_generation_rejects_attributes_not_allowed_for_category(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();

        ProductVariantAttribute::query()
            ->where('key', 'cpu')
            ->delete();

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New'],
                'shared_attributes' => [
                    'cpu' => 'Apple M4',
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('shared_attributes');

        $this->assertDatabaseMissing('product_variant_attributes', [
            'key' => 'cpu',
        ]);
    }

    public function test_user_can_list_update_and_delete_variants(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();
        $variant = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
        ]);
        $this->attachVariantValue($variant, 'color', 'Black');
        $this->attachVariantValue($variant, 'ram', '8GB');
        $this->attachVariantValue($variant, 'storage', '256GB');

        $this->actingAs($user)
            ->getJson(route('product-masters.variants.index', $productMaster).'?search=256GB')
            ->assertOk()
            ->assertJsonPath('variants.data.0.sku', 'APPLE-IPHONE17-8GB-256GB-BLACK');

        $this->actingAs($user)
            ->patchJson(route('product-masters.variants.update', [$productMaster, $variant]), [
                'variant_name' => 'ignored',
                'sku' => 'ignored',
                'condition' => 'Certified Pre-Owned',
                'attributes' => [
                    'color' => 'Blue',
                    'ram' => '16GB',
                    'storage' => '512GB',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('variant.sku', 'CPO-APPLE-IPHONE17-16GB-512GB-BLUE')
            ->assertJsonPath('variant.variant_name', 'Apple iPhone 17 16GB 512GB Blue');

        $this->assertDatabaseHas('product_variant_values', [
            'product_variant_id' => $variant->id,
            'value' => 'Blue',
        ]);

        $this->actingAs($user)
            ->deleteJson(route('product-masters.variants.destroy', [$productMaster, $variant]))
            ->assertNoContent();

        $this->assertDatabaseMissing('product_variants', ['id' => $variant->id]);
    }

    public function test_variant_generation_uses_brand_and_model_instead_of_master_sku(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster(brandName: 'Nothing', modelName: 'Phone (3a) Pro');

        $productMaster->update(['master_sku' => 'CUSTOM-SKU-BASE']);

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New', 'Certified Pre-Owned'],
                'colors' => ['Blue Gray'],
                'rams' => ['12GB'],
                'storages' => ['256GB'],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 2)
            ->assertJsonPath('summary.created', 2)
            ->assertJsonPath('summary.skipped', 0);

        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Nothing Phone (3a) Pro 12GB 256GB Blue Gray',
            'sku' => 'NOTHING-PHONE3APRO-12GB-256GB-BLUEGRAY',
            'condition' => 'Brand New',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Nothing Phone (3a) Pro 12GB 256GB Blue Gray',
            'sku' => 'CPO-NOTHING-PHONE3APRO-12GB-256GB-BLUEGRAY',
            'condition' => 'Certified Pre-Owned',
        ]);
    }

    public function test_variant_generation_skips_blank_dimension_values_in_name_and_sku(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New'],
                'colors' => ['Black'],
                'rams' => [],
                'storages' => [],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 1)
            ->assertJsonPath('summary.created', 1)
            ->assertJsonPath('summary.skipped', 0);

        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 Black',
            'sku' => 'APPLE-IPHONE17-BLACK',
            'condition' => 'Brand New',
        ]);
    }

    public function test_variant_update_rejects_duplicate_generated_sku_under_new_format(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();

        $existingVariant = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 16GB 512GB Blue',
            'sku' => 'CPO-APPLE-IPHONE17-16GB-512GB-BLUE',
            'condition' => 'Certified Pre-Owned',
        ]);
        $this->attachVariantValue($existingVariant, 'color', 'Blue');
        $this->attachVariantValue($existingVariant, 'ram', '16GB');
        $this->attachVariantValue($existingVariant, 'storage', '512GB');

        $variantToUpdate = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
        ]);
        $this->attachVariantValue($variantToUpdate, 'color', 'Black');
        $this->attachVariantValue($variantToUpdate, 'ram', '8GB');
        $this->attachVariantValue($variantToUpdate, 'storage', '256GB');

        $this->actingAs($user)
            ->patchJson(route('product-masters.variants.update', [$productMaster, $variantToUpdate]), [
                'variant_name' => 'ignored',
                'sku' => 'ignored',
                'condition' => 'Certified Pre-Owned',
                'attributes' => [
                    'color' => 'Blue',
                    'ram' => '16GB',
                    'storage' => '512GB',
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('sku');
    }

    private function createProductMaster(
        string $brandName = 'Apple',
        string $modelName = 'iPhone 17',
        string $categoryName = 'Phones',
        string $subcategoryName = 'Smartphones',
    ): ProductMaster {
        $brand = ProductBrand::firstOrCreate(['name' => $brandName]);
        $category = ProductCategory::firstOrCreate([
            'name' => $categoryName,
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::firstOrCreate([
            'name' => $subcategoryName,
            'parent_category_id' => $category->id,
        ]);
        $model = $brand->models()->firstOrCreate([
            'model_name' => $modelName,
        ]);

        return ProductMaster::create([
            'master_sku' => strtoupper($brandName).'-'.strtoupper(str_replace(' ', '', $modelName)),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
    }

    private function attachVariantValue(ProductVariant $variant, string $key, string $value): void
    {
        $attribute = ProductVariantAttribute::where('key', $key)->firstOrFail();

        $variant->values()->create([
            'product_variant_attribute_id' => $attribute->id,
            'value' => $value,
        ]);
    }
}
