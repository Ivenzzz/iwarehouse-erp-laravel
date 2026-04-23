<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductSpecDefinition;
use App\Models\ProductVariant;
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

    public function test_import_creates_product_masters_and_variants_and_reuses_existing_master(): void
    {
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        $brand->models()->create(['model_name' => 'iPhone 17']);
        $csv = <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,Color,Condition
Apple,iPhone 17 Pro Max,Phones,Smartphones,A3100,8GB,256GB,A17 Pro,Apple GPU,LPDDR5,NVMe,iOS 18,6.9 inch,Black,Brand New
Apple,iPhone 17 Pro Max,Phones,Smartphones,A3101,8GB,512GB,A17 Pro,Apple GPU,LPDDR5,NVMe,iOS 18,6.9 inch,Titanium,Brand New
Apple,iPhone 17,Phones,Smartphones,A3000,8GB,128GB,A17,Apple GPU,LPDDR5,NVMe,iOS 18,6.1 inch,Blue,Certified Pre-Owned
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'success'
                    && $summary['total_rows'] === 3
                    && $summary['masters_created'] === 2
                    && $summary['variants_created'] === 3;
            });

        $this->assertSame(2, ProductMaster::count());
        $this->assertSame(3, ProductVariant::count());
        $this->assertDatabaseHas('product_masters', ['master_sku' => 'APPLE-IPHONE17PROMAX', 'subcategory_id' => $subcategory->id]);
        $this->assertDatabaseHas('product_variants', ['sku' => 'APPLE-IPHONE17PROMAX-A3100-8GB-256GB-BLACK', 'condition' => 'Brand New']);
        $this->assertDatabaseHas('product_variants', ['sku' => 'CPO-APPLE-IPHONE17-A3000-8GB-128GB-BLUE', 'condition' => 'Certified Pre-Owned']);
    }

    public function test_import_skips_existing_variants_and_duplicate_variant_rows_from_same_csv(): void
    {
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        $productMaster = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'sku' => 'APPLE-IPHONE17PROMAX-A3100-8GB-256GB-BLACK',
            'model_code' => 'A3100',
            'ram' => '8GB',
            'rom' => '256GB',
            'color' => 'Black',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        $csv = <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,Color,Condition
Apple,iPhone 17 Pro Max,Phones,Smartphones,A3100,8GB,256GB,A17 Pro,Apple GPU,LPDDR5,NVMe,iOS 18,6.9 inch,Black,Brand New
Apple,iPhone 17 Pro Max,Phones,Smartphones,A3101,8GB,512GB,A17 Pro,Apple GPU,LPDDR5,NVMe,iOS 18,6.9 inch,Titanium,Brand New
Apple,iPhone 17 Pro Max,Phones,Smartphones,A3101,8GB,512GB,A17 Pro,Apple GPU,LPDDR5,NVMe,iOS 18,6.9 inch,Titanium,Brand New
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);
        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'success'
                    && $summary['total_rows'] === 3
                    && $summary['brands_created'] === 0
                    && $summary['models_created'] === 0
                    && $summary['masters_created'] === 0
                    && $summary['masters_reused'] === 3
                    && $summary['variants_created'] === 1
                    && $summary['variants_skipped'] === 2
                    && $summary['failed_rows'] === 0;
            });

        $this->assertSame(1, ProductMaster::count());
        $this->assertSame(2, ProductVariant::count());
    }

    public function test_import_creates_missing_brand_and_model_using_uppercase_names(): void
    {
        $user = User::factory()->create();
        [, $category, $subcategory] = $this->catalogRefs('Apple', 'Phones', 'Smartphones');

        $csv = <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,Color,Condition
  asus  ,zenbook 14,Phones,Smartphones,UX3405,16GB,512GB,Intel Core Ultra,Intel Arc,LPDDR5X,SSD,Windows 11,14 inch,Blue,Brand New
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'success'
                    && $summary['total_rows'] === 1
                    && $summary['brands_created'] === 1
                    && $summary['models_created'] === 1
                    && $summary['variants_created'] === 1;
            });

        $brand = ProductBrand::query()->where('name', 'ASUS')->first();
        $this->assertNotNull($brand);
        $this->assertDatabaseHas('product_models', [
            'brand_id' => $brand->id,
            'model_name' => 'ZENBOOK 14',
        ]);
        $this->assertDatabaseHas('product_masters', [
            'subcategory_id' => $subcategory->id,
        ]);
        $this->assertSame('Phones', $category->name);
    }

    public function test_import_dedupes_trailing_model_code_from_model_name_and_reuses_same_model(): void
    {
        $user = User::factory()->create();
        $this->catalogRefs('Apple', 'Phones', 'Smartphones');

        $csv = <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,Color,Condition
ACER,ASPIRE LITE AL15-33P-338H,Phones,Smartphones,AL15-33P-338H,8GB,512GB,Intel Core 3-N350,Intel UHD Graphics,DDR5,PCIe NVMe SSD,Windows 11 Home Single Language,15.6 FHD IPS,Nude Pink,Brand New
ACER,ASPIRE LITE,Phones,Smartphones,AL15-33P-338H,16GB,512GB,Intel Core 3-N350,Intel UHD Graphics,DDR5,PCIe NVMe SSD,Windows 11 Home Single Language,15.6 FHD IPS,Nude Pink,Brand New
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'success'
                    && $summary['total_rows'] === 2
                    && $summary['brands_created'] === 1
                    && $summary['models_created'] === 1
                    && $summary['masters_created'] === 1
                    && $summary['masters_reused'] === 1
                    && $summary['variants_created'] === 2;
            });

        $this->assertDatabaseHas('product_brands', ['name' => 'ACER']);
        $this->assertDatabaseCount('product_models', 1);
        $this->assertDatabaseHas('product_models', ['model_name' => 'ASPIRE LITE']);
    }

    public function test_import_normalizes_numeric_ram_and_rom_values_for_storage_and_sku(): void
    {
        $user = User::factory()->create();
        [$brand] = $this->catalogRefs();
        $brand->models()->create(['model_name' => 'iPhone 18']);

        $csv = <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,Color,Condition
Apple,iPhone 18,Phones,Smartphones,A4000,8,256,Black,Brand New
Apple,iPhone 18,Phones,Smartphones,A4001,1024,2048,Blue,Brand New
Apple,iPhone 18,Phones,Smartphones,A4002,1536,1024,Silver,Brand New
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'success'
                    && $summary['total_rows'] === 3
                    && $summary['variants_created'] === 3;
            });

        $this->assertDatabaseHas('product_variants', [
            'model_code' => 'A4000',
            'ram' => '8GB',
            'rom' => '256GB',
            'sku' => 'APPLE-IPHONE18-A4000-8GB-256GB-BLACK',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'model_code' => 'A4001',
            'ram' => '1TB',
            'rom' => '2TB',
            'sku' => 'APPLE-IPHONE18-A4001-1TB-2TB-BLUE',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'model_code' => 'A4002',
            'ram' => '1TB',
            'rom' => '1TB',
            'sku' => 'APPLE-IPHONE18-A4002-1TB-1TB-SILVER',
        ]);
    }

    public function test_import_keeps_non_numeric_and_unit_bearing_ram_rom_values_unchanged(): void
    {
        $user = User::factory()->create();
        [$brand] = $this->catalogRefs();
        $brand->models()->create(['model_name' => 'iPhone 19']);

        $csv = <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,Color,Condition
Apple,iPhone 19,Phones,Smartphones,A5000,16GB,1TB,Black,Brand New
Apple,iPhone 19,Phones,Smartphones,A5001,8 gb,N/A,Blue,Brand New
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'success'
                    && $summary['total_rows'] === 2
                    && $summary['variants_created'] === 2;
            });

        $this->assertDatabaseHas('product_variants', [
            'model_code' => 'A5000',
            'ram' => '16GB',
            'rom' => '1TB',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'model_code' => 'A5001',
            'ram' => '8 gb',
            'rom' => 'N/A',
        ]);
    }

    public function test_import_rejects_missing_headers_invalid_subcategory_invalid_condition_and_keeps_database_unchanged(): void
    {
        $user = User::factory()->create();
        [$brand, , $subcategory] = $this->catalogRefs();
        $model = $brand->models()->create(['model_name' => 'iPhone 17 Pro Max']);
        ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17PROMAX',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        $initialMasters = ProductMaster::count();
        $initialVariants = ProductVariant::count();
        $initialBrands = ProductBrand::count();
        $initialModels = $brand->models()->count();

        $missingHeaders = UploadedFile::fake()->createWithContent('product-masters.csv', "Brand,Model\nApple,iPhone 17\n");
        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $missingHeaders])
            ->assertSessionHasErrors('file')
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'failed'
                    && $summary['failed_rows'] === 0;
            });

        $invalidSubcategory = UploadedFile::fake()->createWithContent('product-masters.csv', <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,Color,Condition
Unknown,iPhone 17,Phones,NotARealSubcategory,A3000,8GB,128GB,A17,Apple GPU,LPDDR5,NVMe,iOS 18,6.1 inch,Blue,Brand New
CSV);
        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $invalidSubcategory])
            ->assertSessionHasErrors('file')
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'failed'
                    && $summary['failed_rows'] === 1;
            });

        $invalidCondition = UploadedFile::fake()->createWithContent('product-masters.csv', <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,Color,Condition
Apple,iPhone 17 Pro Max,Phones,Smartphones,A3001,8GB,128GB,A17,Apple GPU,LPDDR5,NVMe,iOS 18,6.1 inch,Blue,TotallyInvalidCondition
CSV);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $invalidCondition])
            ->assertSessionHasErrors('file')
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'failed'
                    && $summary['failed_rows'] === 1;
            });

        $this->assertSame($initialMasters, ProductMaster::count());
        $this->assertSame($initialVariants, ProductVariant::count());
        $this->assertSame($initialBrands, ProductBrand::count());
        $this->assertSame($initialModels, $brand->models()->count());
    }

    public function test_import_accepts_os_header_alias(): void
    {
        $user = User::factory()->create();
        [$brand, , ] = $this->catalogRefs();
        $brand->models()->create(['model_name' => 'iPhone 17']);

        $csv = <<<'CSV'
Brand,Model,Category,Subcategory,Model Code,RAM,ROM,CPU,GPU,RAM Type,ROM Type,OS,Screen,Color,Condition
Apple,iPhone 17,Phones,Smartphones,A3000,8GB,128GB,A17,Apple GPU,LPDDR5,NVMe,iOS 18,6.1 inch,Blue,Brand New
CSV;

        $file = UploadedFile::fake()->createWithContent('product-masters.csv', $csv);

        $this->actingAs($user)
            ->post(route('product-masters.import'), ['file' => $file])
            ->assertRedirect(route('product-masters.index', absolute: false))
            ->assertSessionHas('import_summary', function (array $summary) {
                return $summary['status'] === 'success'
                    && $summary['total_rows'] === 1
                    && $summary['variants_created'] === 1;
            });

        $this->assertDatabaseHas('product_variants', [
            'sku' => 'APPLE-IPHONE17-A3000-8GB-128GB-BLUE',
            'operating_system' => 'iOS 18',
        ]);
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
        ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'sku' => 'APPLE-IPHONE17PROMAX-A3100-8GB-256GB-BLACK',
            'model_code' => 'A3100',
            'condition' => 'Brand New',
            'ram' => '8GB',
            'rom' => '256GB',
            'cpu' => 'A17 Pro',
            'gpu' => 'Apple GPU',
            'ram_type' => 'LPDDR5',
            'rom_type' => 'NVMe',
            'operating_system' => 'iOS 18',
            'screen' => '6.9 inch',
            'color' => 'Black',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->get(route('product-masters.export'));

        $response->assertOk();
        $response->assertDownload('product-variants.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('Brand,Model,Category,Subcategory,RAM,ROM,Color,Model Code,CPU,GPU,RAM Type,ROM Type,"Operating System",Screen', $content);
        $this->assertStringContainsString('Apple,"iPhone 17 Pro Max",Phones,Smartphones,8GB,256GB,Black,A3100,"A17 Pro","Apple GPU",LPDDR5,NVMe,"iOS 18","6.9 inch"', $content);
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
