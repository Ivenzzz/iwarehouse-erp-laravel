<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\User;
use Database\Seeders\ProductSpecDefinitionSeeder;
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
    }

    public function test_product_masters_page_includes_variant_counts_and_static_variant_definitions(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();
        ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
            'ram' => '8GB',
            'rom' => '256GB',
            'color' => 'Black',
        ]);

        $this->actingAs($user)
            ->get(route('product-masters.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProductMasters')
                ->has('variantDefinitions.groups')
                ->where('variantDefinitions.generation_keys.3', 'rom')
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
        $payload = [
            'conditions' => ['Brand New', 'Certified Pre-Owned'],
            'colors' => ['Black'],
            'rams' => ['8GB'],
            'roms' => ['256GB'],
            'shared_attributes' => [
                'model_code' => 'A2890',
            ],
        ];

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), $payload)
            ->assertOk()
            ->assertJsonPath('summary.requested', 2)
            ->assertJsonPath('summary.created', 2)
            ->assertJsonPath('summary.skipped', 0);

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), $payload)
            ->assertOk()
            ->assertJsonPath('summary.requested', 2)
            ->assertJsonPath('summary.created', 0)
            ->assertJsonPath('summary.skipped', 2);

        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'model_code' => 'A2890',
            'sku' => 'APPLE-IPHONE17-A2890-8GB-256GB-BLACK',
            'condition' => 'Brand New',
            'ram' => '8GB',
            'rom' => '256GB',
            'color' => 'Black',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'model_code' => 'A2890',
            'sku' => 'CPO-APPLE-IPHONE17-A2890-8GB-256GB-BLACK',
            'condition' => 'Certified Pre-Owned',
            'ram' => '8GB',
            'rom' => '256GB',
            'color' => 'Black',
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
                'roms' => ['512GB'],
                'shared_attributes' => [
                    'model_code' => 'LAT7440',
                    'cpu' => 'Intel Core Ultra 7',
                    'gpu' => 'Intel Arc',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 4)
            ->assertJsonPath('summary.created', 4)
            ->assertJsonPath('summary.skipped', 0);

        $this->assertSame(4, ProductVariant::count());
        $this->assertDatabaseHas('product_variants', [
            'model_code' => 'LAT7440',
            'cpu' => 'Intel Core Ultra 7',
            'gpu' => 'Intel Arc',
            'rom' => '512GB',
        ]);
    }

    public function test_generation_rejects_computer_attributes_for_non_computer_category(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New'],
                'shared_attributes' => [
                    'cpu' => 'Apple M4',
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('shared_attributes');

        $this->assertDatabaseMissing('product_variants', [
            'cpu' => 'Apple M4',
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
            'color' => 'Black',
            'ram' => '8GB',
            'rom' => '256GB',
        ]);

        $this->actingAs($user)
            ->getJson(route('product-masters.variants.index', $productMaster).'?search=256GB')
            ->assertOk()
            ->assertJsonPath('variants.data.0.sku', 'APPLE-IPHONE17-8GB-256GB-BLACK')
            ->assertJsonPath('variants.data.0.attributes.rom', '256GB');

        $this->actingAs($user)
            ->patchJson(route('product-masters.variants.update', [$productMaster, $variant]), [
                'variant_name' => 'ignored',
                'sku' => 'ignored',
                'condition' => 'Certified Pre-Owned',
                'attributes' => [
                    'color' => 'Blue',
                    'ram' => '16GB',
                    'rom' => '512GB',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('variant.sku', 'CPO-APPLE-IPHONE17-16GB-512GB-BLUE')
            ->assertJsonPath('variant.variant_name', 'Apple iPhone 17 16GB 512GB Blue')
            ->assertJsonPath('variant.attributes.rom', '512GB');

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'color' => 'Blue',
            'ram' => '16GB',
            'rom' => '512GB',
        ]);

        $this->actingAs($user)
            ->deleteJson(route('product-masters.variants.destroy', [$productMaster, $variant]))
            ->assertNoContent();

        $this->assertDatabaseMissing('product_variants', ['id' => $variant->id]);
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
                'roms' => [],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 1)
            ->assertJsonPath('summary.created', 1)
            ->assertJsonPath('summary.skipped', 0);

        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'sku' => 'APPLE-IPHONE17-BLACK',
            'condition' => 'Brand New',
            'color' => 'Black',
            'ram' => null,
            'rom' => null,
        ]);

        $this->assertSame('Apple iPhone 17 Black', ProductVariant::query()->value('variant_name'));
    }

    public function test_generation_accepts_model_code_for_computer_category_and_includes_it_in_sku(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster(
            brandName: 'Lenovo',
            modelName: 'ThinkPad X1',
            categoryName: 'Computers',
            subcategoryName: 'Laptops',
        );

        $this->actingAs($user)
            ->postJson(route('product-masters.variants.generate', $productMaster), [
                'conditions' => ['Brand New'],
                'colors' => ['Black'],
                'rams' => ['16GB'],
                'roms' => ['1TB'],
                'shared_attributes' => [
                    'model_code' => 'X1G12',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.requested', 1)
            ->assertJsonPath('summary.created', 1)
            ->assertJsonPath('summary.skipped', 0);

        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'model_code' => 'X1G12',
            'sku' => 'LENOVO-THINKPADX1-X1G12-16GB-1TB-BLACK',
        ]);
    }

    public function test_variant_update_rejects_duplicate_generated_sku_under_new_format(): void
    {
        $user = User::factory()->create();
        $productMaster = $this->createProductMaster();

        ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 16GB 512GB Blue',
            'sku' => 'CPO-APPLE-IPHONE17-16GB-512GB-BLUE',
            'condition' => 'Certified Pre-Owned',
            'color' => 'Blue',
            'ram' => '16GB',
            'rom' => '512GB',
        ]);

        $variantToUpdate = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
            'color' => 'Black',
            'ram' => '8GB',
            'rom' => '256GB',
        ]);

        $this->actingAs($user)
            ->patchJson(route('product-masters.variants.update', [$productMaster, $variantToUpdate]), [
                'variant_name' => 'ignored',
                'sku' => 'ignored',
                'condition' => 'Certified Pre-Owned',
                'attributes' => [
                    'color' => 'Blue',
                    'ram' => '16GB',
                    'rom' => '512GB',
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
}
