<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductSpecDefinition;
use App\Models\User;
use Database\Seeders\ProductSpecDefinitionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductMastersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ProductSpecDefinitionSeeder::class);
    }

    public function test_guests_cannot_access_product_masters_page(): void
    {
        $this->get('/product-masters')->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_product_masters_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('product-masters.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProductMasters')
                ->has('productMasters.data')
                ->has('brands')
                ->has('categories')
                ->has('specDefinitions')
                ->has('variantDefinitions.groups')
                ->where('filters.search', '')
                ->where('filters.sort', 'master_sku')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_product_masters_index_is_paginated_to_ten_records(): void
    {
        $user = User::factory()->create();
        [$brand, $category, $subcategory] = $this->catalogRefs();

        foreach (range(1, 12) as $index) {
            $model = $brand->models()->create(['model_name' => sprintf('Model %02d', $index)]);
            ProductMaster::create([
                'master_sku' => sprintf('APPLE-MODEL%02d', $index),
                'model_id' => $model->id,
                'subcategory_id' => $subcategory->id,
            ]);
        }

        $this->actingAs($user)
            ->get(route('product-masters.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('productMasters.data', 10)
                ->where('productMasters.total', 12)
                ->where('productMasters.per_page', 10)
                ->where('productMasters.current_page', 1)
            );
    }

    public function test_product_masters_index_searches_sku_brand_model_category_and_subcategory(): void
    {
        $user = User::factory()->create();
        [$brand, $category, $subcategory] = $this->catalogRefs('Apple', 'Phones', 'Smartphones');
        $model = $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);

        ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        foreach (['IPHONE17', 'apple', 'pro max', 'phones', 'smartphones'] as $search) {
            $this->actingAs($user)
                ->get(route('product-masters.index', ['search' => $search]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->has('productMasters.data', 1)
                    ->where('productMasters.data.0.master_sku', 'APPLE-IPHONE17PROMAX')
                );
        }
    }

    public function test_product_masters_index_sorts_by_sku_name_and_category(): void
    {
        $user = User::factory()->create();
        [$apple, $phones, $smartphones] = $this->catalogRefs('Apple', 'Phones', 'Smartphones');
        [, $computers, $laptops] = $this->catalogRefs('Dell', 'Computers', 'Laptops');
        $iphone = $apple->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        $dell = ProductBrand::where('name', 'Dell')->firstOrFail();
        $latitude = $dell->models()->create(['model_name' => 'Latitude 7440']);

        ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'model_id' => $iphone->id,
            'subcategory_id' => $smartphones->id,
        ]);
        ProductMaster::create([
            'master_sku' => 'DELL-LATITUDE7440',
            'model_id' => $latitude->id,
            'subcategory_id' => $laptops->id,
        ]);

        $this->actingAs($user)
            ->get(route('product-masters.index', ['sort' => 'master_sku', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('productMasters.data.0.master_sku', 'DELL-LATITUDE7440')
                ->where('filters.sort', 'master_sku')
                ->where('filters.direction', 'desc')
            );

        $this->actingAs($user)
            ->get(route('product-masters.index', ['sort' => 'name', 'direction' => 'asc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('productMasters.data.0.product_name', 'Apple iPhone 17 Pro Max')
                ->where('filters.sort', 'name')
            );

        $this->actingAs($user)
            ->get(route('product-masters.index', ['sort' => 'category', 'direction' => 'asc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('productMasters.data.0.category.name', $computers->name)
                ->where('filters.sort', 'category')
            );
    }

    public function test_user_can_create_product_master_with_image_and_specs(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);

        $this->actingAs($user)
            ->post(route('product-masters.store'), [
                'model_id' => $model->id,
                'subcategory_id' => $subcategory->id,
                'description' => 'Flagship phone',
                'image' => UploadedFile::fake()->image('iphone.jpg'),
                'specs' => [
                    'display_size' => '6.9 inches',
                    'battery_capacity' => '4500 mAh',
                ],
            ])
            ->assertRedirect(route('product-masters.index', absolute: false));

        $productMaster = ProductMaster::where('master_sku', 'APPLE-IPHONE17PROMAX')->firstOrFail();

        $this->assertSame('Apple iPhone 17 Pro Max', $productMaster->product_name);
        $this->assertNotNull($productMaster->image_path);
        Storage::disk('public')->assertExists($productMaster->image_path);
        $this->assertDatabaseHas('product_master_spec_values', [
            'product_master_id' => $productMaster->id,
            'value' => '6.9 inches',
        ]);
        $this->assertDatabaseHas('product_master_spec_values', [
            'product_master_id' => $productMaster->id,
            'value' => '4500 mAh',
        ]);
    }

    public function test_user_can_update_product_master_and_replace_image_specs(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17']);
        $productMaster = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
            'image_path' => 'product-masters/old.jpg',
        ]);
        Storage::disk('public')->put('product-masters/old.jpg', 'old image');
        $definition = ProductSpecDefinition::where('key', 'display_size')->firstOrFail();
        $productMaster->specValues()->create([
            'product_spec_definition_id' => $definition->id,
            'value' => '6.1 inches',
        ]);

        $this->actingAs($user)
            ->post(route('product-masters.update', $productMaster), [
                '_method' => 'patch',
                'model_id' => $model->id,
                'subcategory_id' => $subcategory->id,
                'description' => 'Updated phone',
                'image' => UploadedFile::fake()->image('new-iphone.jpg'),
                'specs' => [
                    'display_size' => '6.3 inches',
                ],
            ])
            ->assertRedirect(route('product-masters.index', absolute: false));

        $productMaster->refresh();

        Storage::disk('public')->assertMissing('product-masters/old.jpg');
        Storage::disk('public')->assertExists($productMaster->image_path);
        $this->assertDatabaseHas('product_master_spec_values', [
            'product_master_id' => $productMaster->id,
            'value' => '6.3 inches',
        ]);
    }

    public function test_user_can_delete_product_master_and_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17']);
        $productMaster = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
            'image_path' => 'product-masters/iphone.jpg',
        ]);
        Storage::disk('public')->put('product-masters/iphone.jpg', 'image');

        $this->actingAs($user)
            ->delete(route('product-masters.destroy', $productMaster))
            ->assertRedirect(route('product-masters.index', absolute: false));

        $this->assertDatabaseMissing('product_masters', ['id' => $productMaster->id]);
        Storage::disk('public')->assertMissing('product-masters/iphone.jpg');
    }

    public function test_duplicate_model_and_generated_sku_are_rejected(): void
    {
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        $collidingModel = $brand->models()->create(['model_name' => 'iPhone17ProMax']);
        ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        $this->actingAs($user)
            ->post(route('product-masters.store'), [
                'model_id' => $model->id,
                'subcategory_id' => $subcategory->id,
            ])
            ->assertSessionHasErrors('model_id');

        $this->actingAs($user)
            ->post(route('product-masters.store'), [
                'model_id' => $collidingModel->id,
                'subcategory_id' => $subcategory->id,
            ])
            ->assertSessionHasErrors('model_id');
    }

    public function test_referenced_brand_model_and_subcategory_deletes_are_blocked(): void
    {
        $user = User::factory()->create();
        [$brand, $category, $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17']);
        ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        $this->actingAs($user)
            ->delete(route('brands.destroy', $brand))
            ->assertSessionHasErrors('brand');

        $this->actingAs($user)
            ->put(route('brands.update', $brand), [
                'name' => 'Apple',
                'models' => [],
            ])
            ->assertSessionHasErrors('models');

        $this->actingAs($user)
            ->delete(route('categories.destroy', $subcategory))
            ->assertSessionHasErrors('category');

        $this->actingAs($user)
            ->delete(route('categories.destroy', $category))
            ->assertSessionHasErrors('category');
    }

    public function test_import_creates_product_masters_with_specs_and_skips_existing_rows(): void
    {
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        $brand->models()->create(['model_name' => 'iPhone 17']);
        $csv = <<<'CSV'
brand,model,category,subcategory,description,image_url,display_size,battery_capacity
Apple,iPhone 17 Pro Max,Phones,Smartphones,Flagship,/ignored.jpg,6.9 inches,4500 mAh
Apple,iPhone 17 Pro Max,Phones,Smartphones,Duplicate,/ignored.jpg,6.9 inches,4500 mAh
Apple,iPhone 17,Phones,Smartphones,Base model,/ignored.jpg,6.1 inches,4000 mAh
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertSame(2, ProductMaster::count());
        $this->assertDatabaseHas('product_masters', [
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'subcategory_id' => $subcategory->id,
            'image_path' => null,
        ]);
        $this->assertDatabaseHas('product_master_spec_values', ['value' => '6.9 inches']);
    }

    public function test_import_rejects_missing_headers_missing_refs_and_sku_collisions_without_partial_inserts(): void
    {
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        $brand->models()->create(['model_name' => 'iPhone17ProMax']);
        ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        $missingHeaders = UploadedFile::fake()->createWithContent('product-masters.csv', "brand,model\nApple,iPhone 17\n");

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $missingHeaders])
            ->assertSessionHasErrors('file');

        $missingRefs = UploadedFile::fake()->createWithContent('product-masters.csv', "brand,model,subcategory\nMissing,iPhone 17,Smartphones\n");

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $missingRefs])
            ->assertSessionHasErrors('file');

        $skuCollision = UploadedFile::fake()->createWithContent('product-masters.csv', "brand,model,subcategory\nApple,iPhone17ProMax,Smartphones\n");

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $skuCollision])
            ->assertSessionHasErrors('file');

        $this->assertSame(1, ProductMaster::count());
    }

    public function test_export_returns_expected_csv_shape(): void
    {
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        $productMaster = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
            'description' => 'Flagship',
        ]);
        $definition = ProductSpecDefinition::where('key', 'display_size')->firstOrFail();
        $productMaster->specValues()->create([
            'product_spec_definition_id' => $definition->id,
            'value' => '6.9 inches',
        ]);

        $response = $this->actingAs($user)->get(route('product-masters.export'));

        $response->assertOk();
        $response->assertDownload('product-masters.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('master_sku,brand,model,category,subcategory,image_url,description,release_date', $content);
        $this->assertStringContainsString('APPLE-IPHONE17PROMAX,Apple,"iPhone 17 Pro Max",Phones,Smartphones,,Flagship', $content);
        $this->assertStringContainsString('6.9 inches', $content);
    }

    private function catalogRefs(string $brandName = 'Apple', string $categoryName = 'Phones', string $subcategoryName = 'Smartphones'): array
    {
        $brand = ProductBrand::firstOrCreate(['name' => $brandName]);
        $category = ProductCategory::firstOrCreate([
            'name' => $categoryName,
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::firstOrCreate([
            'name' => $subcategoryName,
            'parent_category_id' => $category->id,
        ]);

        return [$brand, $category, $subcategory];
    }
}
