<?php

namespace Tests\Feature;

use App\Features\GoodsReceipts\Actions\ResolvePurchaseBrandConflicts;
use App\Features\GoodsReceipts\Actions\ValidatePurchaseCsv;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseCsvVariantResolutionTest extends TestCase
{
    use RefreshDatabase;

    private const CSV_HEADERS = [
        'Model', 'Barcode', 'Serial Number', 'IMEI 1', 'IMEI 2', 'IMEI 3',
        'Model Code', 'SKU Code', 'Submodel', 'Ram Capacity', 'Ram Type',
        'Rom Capacity', 'Rom Type', 'Ram Slots', 'Color', 'Sim Slot',
        'Network 1', 'Network 2', 'Network Type', 'Product Type', 'With Charger',
        'Package', 'Code', 'Country Model', 'CPU', 'GPU', 'OS', 'Software',
        'Resolution', 'Warranty', 'Cost', 'Cash Price', 'SRP', '12 Months CC',
        '3 Months CC', 'DP 30%', 'Condition', 'Intro', 'Details', 'Product Details',
    ];

    public function test_validate_csv_auto_creates_variant_when_none_exist(): void
    {
        $master = $this->createProductMaster(modelName: 'Legion Pro 7', brandName: 'Lenovo');
        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('Legion Pro 7', [
                'Model Code' => '82WQ',
                'Condition' => 'Brand New',
                'Ram Capacity' => '16GB',
                'Rom Capacity' => '1TB',
                'Color' => 'Onyx Grey',
                'CPU' => 'Intel i9',
                'GPU' => 'RTX 4080',
                'Ram Type' => 'DDR5',
                'Rom Type' => 'NVMe',
                'OS' => 'Windows 11',
                'Resolution' => '2560x1600',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertSame([], $result['brandConflicts']);
        $this->assertCount(1, $result['validatedRows']);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $master->id,
            'model_code' => '82WQ',
            'condition' => 'Brand New',
            'ram' => '16GB',
            'rom' => '1TB',
            'color' => 'Onyx Grey',
            'cpu' => 'Intel i9',
            'gpu' => 'RTX 4080',
            'ram_type' => 'DDR5',
            'rom_type' => 'NVMe',
            'operating_system' => 'Windows 11',
            'screen' => '2560x1600',
        ]);
    }

    public function test_validate_csv_creates_missing_variant_when_existing_variants_do_not_match(): void
    {
        $master = $this->createProductMaster(modelName: 'ROG Zephyrus G16', brandName: 'ASUS');
        ProductVariant::create([
            'product_master_id' => $master->id,
            'sku' => 'ASUS-ROGZEPHYRUSG16-G16A-16GB-512GB-WHITE',
            'condition' => 'Brand New',
            'model_code' => 'G16A',
            'ram' => '16GB',
            'rom' => '512GB',
            'color' => 'White',
            'cpu' => 'Intel i7',
            'gpu' => 'RTX 4060',
            'ram_type' => 'DDR5',
            'rom_type' => 'NVMe',
            'operating_system' => 'Windows 11',
            'screen' => '1920x1200',
            'is_active' => true,
        ]);

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('ROG Zephyrus G16', [
                'Model Code' => 'G16B',
                'Condition' => 'Brand New',
                'Ram Capacity' => '32GB',
                'Rom Capacity' => '1TB',
                'Color' => 'Black',
                'CPU' => 'Intel i9',
                'GPU' => 'RTX 4070',
                'Ram Type' => 'LPDDR5X',
                'Rom Type' => 'NVMe',
                'OS' => 'Windows 11',
                'Resolution' => '2560x1600',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertCount(1, $result['validatedRows']);
        $this->assertSame(2, ProductVariant::query()->where('product_master_id', $master->id)->count());
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $master->id,
            'model_code' => 'G16B',
            'ram' => '32GB',
            'rom' => '1TB',
            'color' => 'Black',
            'cpu' => 'Intel i9',
            'gpu' => 'RTX 4070',
            'ram_type' => 'LPDDR5X',
            'screen' => '2560x1600',
        ]);
    }

    public function test_validate_csv_matches_existing_variant_with_new_keys_without_creating_duplicate(): void
    {
        $master = $this->createProductMaster(modelName: 'MacBook Pro 16', brandName: 'Apple');
        $variant = ProductVariant::create([
            'product_master_id' => $master->id,
            'sku' => 'APPLE-MACBOOKPRO16-MBP16-36GB-1TB-SPACEBLACK',
            'condition' => 'Brand New',
            'model_code' => 'MBP16',
            'ram' => '36GB',
            'rom' => '1TB',
            'color' => 'Space Black',
            'cpu' => 'Apple M3 Max',
            'gpu' => '40-core GPU',
            'ram_type' => 'Unified',
            'rom_type' => 'NVMe',
            'operating_system' => 'macOS',
            'screen' => '3456x2234',
            'is_active' => true,
        ]);

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('MacBook Pro 16', [
                'Model Code' => 'MBP16',
                'Condition' => 'Brand New',
                'Ram Capacity' => '36GB',
                'Rom Capacity' => '1TB',
                'Color' => 'Space-Black',
                'CPU' => 'Apple M3 Max',
                'GPU' => '40 core GPU',
                'Ram Type' => 'Unified',
                'Rom Type' => 'NVMe',
                'OS' => 'macOS',
                'Resolution' => '3456x2234',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertCount(1, $result['validatedRows']);
        $this->assertSame($variant->id, $result['validatedRows'][0]['variant_id']);
        $this->assertSame(1, ProductVariant::query()->where('product_master_id', $master->id)->count());
    }

    public function test_validate_csv_defaults_condition_to_brand_new_when_empty(): void
    {
        $master = $this->createProductMaster(modelName: 'ThinkPad X1 Carbon', brandName: 'Lenovo');

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('ThinkPad X1 Carbon', [
                'Model Code' => 'X1C',
                'Condition' => '',
                'Ram Capacity' => '16GB',
                'Rom Capacity' => '512GB',
                'Color' => 'Black',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $master->id,
            'model_code' => 'X1C',
            'condition' => 'Brand New',
        ]);
    }

    public function test_validate_csv_rejects_row_with_no_identifiers(): void
    {
        $this->createProductMaster(modelName: 'Pavilion 15', brandName: 'HP');

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('Pavilion 15', [
                'Model Code' => 'PV15',
                'Condition' => 'Brand New',
                'Ram Capacity' => '8GB',
                'Rom Capacity' => '256GB',
                'Color' => 'Silver',
                'Serial Number' => '',
                'Barcode' => '',
                'IMEI 1' => '',
                'IMEI 2' => '',
            ]),
        ]));

        $this->assertCount(0, $result['validatedRows']);
        $this->assertCount(1, $result['errors']);
        $this->assertStringContainsString(
            'Provide at least one',
            (string) ($result['errors'][0]['message'] ?? '')
        );
    }

    public function test_resolve_brand_conflicts_uses_same_auto_create_logic(): void
    {
        $asusMaster = $this->createProductMaster(modelName: 'Nitro V', brandName: 'Acer');
        $msiMaster = $this->createProductMaster(modelName: 'Nitro V', brandName: 'MSI');
        $csvRow = $this->rowFor('Nitro V', [
            'Model Code' => 'ANV15',
            'Condition' => 'Brand New',
            'Ram Capacity' => '16GB',
            'Rom Capacity' => '512GB',
            'Color' => 'Black',
            'CPU' => 'Intel i5',
            'GPU' => 'RTX 4050',
            'Ram Type' => 'DDR5',
            'Rom Type' => 'NVMe',
            'OS' => 'Windows 11',
            'Resolution' => '1920x1080',
        ]);

        $validateResult = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([$csvRow]));
        $this->assertCount(1, $validateResult['brandConflicts']);

        $selectedConflict = $validateResult['brandConflicts'][0];
        $selectedConflict['selectedBrandId'] = (string) $msiMaster->model->brand->id;
        $selectedConflict['selectedBrandMode'] = 'existing';

        $resolved = app(ResolvePurchaseBrandConflicts::class)->handle([$selectedConflict]);

        $this->assertSame([], $resolved['errors']);
        $this->assertCount(1, $resolved['resolved']);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $msiMaster->id,
            'model_code' => 'ANV15',
            'cpu' => 'Intel i5',
            'screen' => '1920x1080',
        ]);
        $this->assertDatabaseMissing('product_variants', [
            'product_master_id' => $asusMaster->id,
            'model_code' => 'ANV15',
        ]);
    }

    public function test_validate_csv_returns_no_brand_match_conflict_when_model_missing(): void
    {
        ProductBrand::create(['name' => 'Lenovo']);

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('Phantom X Pro', [
                'Model Code' => 'PXP',
                'Condition' => 'Brand New',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertCount(1, $result['brandConflicts']);
        $this->assertSame('no_brand_match', $result['brandConflicts'][0]['type']);
        $this->assertFalse((bool) ($result['brandConflicts'][0]['allowCreateBrand'] ?? true));
    }

    public function test_resolve_conflicts_returns_error_when_model_missing_under_selected_brand(): void
    {
        $this->createFallbackCategoryTree();
        $brand = ProductBrand::create(['name' => 'MSI']);
        $conflict = [
            'type' => 'no_brand_match',
            'rowIndex' => 0,
            'modelName' => 'Titan 17',
            'row' => $this->rowFor('Titan 17', [
                'Model Code' => 'T17',
                'Condition' => 'Brand New',
                'Ram Capacity' => '32GB',
                'Rom Capacity' => '1TB',
                'Color' => 'Black',
                'CPU' => 'Intel i9',
                'GPU' => 'RTX 4080',
                'OS' => 'Windows 11',
                'Resolution' => '2560x1600',
            ]),
            'brands' => [[
                'brandId' => (string) $brand->id,
                'brandName' => $brand->name,
                'productMasterId' => null,
            ]],
            'selectedBrandId' => (string) $brand->id,
            'allowCreateBrand' => false,
        ];

        $resolved = app(ResolvePurchaseBrandConflicts::class)->handle([$conflict]);

        $this->assertCount(1, $resolved['errors']);
        $this->assertStringContainsString(
            'Model Titan 17 was not found under selected brand MSI.',
            (string) ($resolved['errors'][0]['message'] ?? '')
        );
        $this->assertCount(0, $resolved['resolved']);
        $this->assertDatabaseMissing('product_models', ['model_name' => 'TITAN 17']);
        $this->assertDatabaseMissing('product_variants', ['model_code' => 'T17']);
    }

    public function test_resolve_conflicts_existing_model_creates_missing_master_then_variant(): void
    {
        $this->createFallbackCategoryTree();
        $brand = ProductBrand::create(['name' => 'Acer']);
        ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'NITRO 18',
        ]);
        $conflict = [
            'type' => 'no_brand_match',
            'rowIndex' => 0,
            'modelName' => 'Nitro 18',
            'row' => $this->rowFor('Nitro 18', [
                'Model Code' => 'N18',
                'Condition' => 'Brand New',
                'Ram Capacity' => '16GB',
                'Rom Capacity' => '512GB',
                'Color' => 'Black',
            ]),
            'brands' => [[
                'brandId' => (string) $brand->id,
                'brandName' => $brand->name,
                'productMasterId' => null,
            ]],
            'selectedBrandId' => (string) $brand->id,
            'allowCreateBrand' => false,
        ];

        $resolved = app(ResolvePurchaseBrandConflicts::class)->handle([$conflict]);

        $this->assertSame([], $resolved['errors']);
        $this->assertCount(1, $resolved['resolved']);
        $this->assertDatabaseHas('product_models', [
            'brand_id' => $brand->id,
            'model_name' => 'NITRO 18',
        ]);
        $this->assertDatabaseHas('product_masters', [
            'master_sku' => 'ACER-NITRO18',
        ]);
        $this->assertDatabaseHas('product_variants', ['model_code' => 'N18']);
    }

    public function test_resolve_conflicts_returns_error_when_fallback_subcategory_missing(): void
    {
        $brand = ProductBrand::create(['name' => 'Lenovo']);
        ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'YOGA ULTRA',
        ]);
        $conflict = [
            'type' => 'no_brand_match',
            'rowIndex' => 0,
            'modelName' => 'Yoga Ultra',
            'row' => $this->rowFor('Yoga Ultra'),
            'brands' => [[
                'brandId' => (string) $brand->id,
                'brandName' => $brand->name,
                'productMasterId' => null,
            ]],
            'selectedBrandId' => (string) $brand->id,
            'allowCreateBrand' => false,
        ];

        $resolved = app(ResolvePurchaseBrandConflicts::class)->handle([$conflict]);

        $this->assertCount(1, $resolved['errors']);
        $this->assertStringContainsString('Fallback category "No Category" was not found.', (string) ($resolved['errors'][0]['message'] ?? ''));
    }

    public function test_resolve_conflicts_returns_error_on_generated_master_sku_conflict(): void
    {
        $this->createFallbackCategoryTree();
        $targetBrand = ProductBrand::create(['name' => 'Acer']);
        $targetModel = ProductModel::create([
            'brand_id' => $targetBrand->id,
            'model_name' => 'NITRO 16',
        ]);
        $otherBrand = ProductBrand::create(['name' => 'Ac er']);
        $otherModel = ProductModel::create([
            'brand_id' => $otherBrand->id,
            'model_name' => 'Nitro 16',
        ]);
        $fallbackSubcategory = ProductCategory::query()
            ->whereNotNull('parent_category_id')
            ->where('name', 'No Subcategory')
            ->firstOrFail();
        ProductMaster::create([
            'master_sku' => 'ACER-NITRO16',
            'model_id' => $otherModel->id,
            'subcategory_id' => $fallbackSubcategory->id,
        ]);

        $conflict = [
            'type' => 'no_brand_match',
            'rowIndex' => 0,
            'modelName' => 'Nitro 16',
            'row' => $this->rowFor('Nitro 16'),
            'brands' => [[
                'brandId' => (string) $targetBrand->id,
                'brandName' => $targetBrand->name,
                'productMasterId' => null,
            ]],
            'selectedBrandId' => (string) $targetBrand->id,
            'allowCreateBrand' => false,
        ];

        $resolved = app(ResolvePurchaseBrandConflicts::class)->handle([$conflict]);

        $this->assertCount(1, $resolved['errors']);
        $this->assertStringContainsString('Generated master SKU ACER-NITRO16 is already in use', (string) ($resolved['errors'][0]['message'] ?? ''));
        $this->assertDatabaseMissing('product_masters', [
            'model_id' => $targetModel->id,
        ]);
    }

    public function test_validate_csv_response_shape_is_unchanged(): void
    {
        $this->createProductMaster(modelName: 'Swift 14', brandName: 'Acer');

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('Swift 14', [
                'Model Code' => 'S14',
                'Condition' => 'Brand New',
                'Ram Capacity' => '16GB',
                'Rom Capacity' => '512GB',
            ]),
        ]));

        $this->assertArrayHasKey('validatedRows', $result);
        $this->assertArrayHasKey('errors', $result);
        $this->assertArrayHasKey('brandConflicts', $result);
    }

    public function test_validate_csv_matches_exact_model_name_only_not_accessory_names(): void
    {
        $exactMaster = $this->createProductMaster(modelName: 'IPHONE 14', brandName: 'Apple');
        $this->createProductMaster(modelName: 'IPHONE 14 CASE', brandName: 'Apple');
        $this->createProductMaster(modelName: 'IPHONE 14 TEMPERED GLASS', brandName: 'Apple');

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('IPHONE 14', [
                'Model Code' => 'A2882',
                'Condition' => 'Brand New',
                'Ram Capacity' => '6GB',
                'Rom Capacity' => '128GB',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertSame([], $result['brandConflicts']);
        $this->assertCount(1, $result['validatedRows']);
        $this->assertSame($exactMaster->id, (int) $result['validatedRows'][0]['product_master_id']);
    }

    public function test_validate_csv_model_matching_normalizes_case_and_whitespace(): void
    {
        $master = $this->createProductMaster(modelName: 'IPHONE 14', brandName: 'Apple');

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('  iphone   14 ', [
                'Model Code' => 'A2882',
                'Condition' => 'Brand New',
                'Ram Capacity' => '6GB',
                'Rom Capacity' => '128GB',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertSame([], $result['brandConflicts']);
        $this->assertCount(1, $result['validatedRows']);
        $this->assertSame($master->id, (int) $result['validatedRows'][0]['product_master_id']);
    }

    public function test_validate_csv_no_longer_uses_partial_model_match(): void
    {
        $this->createProductMaster(modelName: 'IPHONE 14 CASE', brandName: 'Apple');
        $this->createProductMaster(modelName: 'IPHONE 14 TEMPERED GLASS', brandName: 'Apple');

        $result = app(ValidatePurchaseCsv::class)->handle($this->csvWithRows([
            $this->rowFor('IPHONE 14', [
                'Model Code' => 'A2882',
                'Condition' => 'Brand New',
            ]),
        ]));

        $this->assertSame([], $result['errors']);
        $this->assertCount(1, $result['brandConflicts']);
        $this->assertSame('no_brand_match', $result['brandConflicts'][0]['type']);
    }

    private function csvWithRows(array $rows): string
    {
        $lines = [implode(',', self::CSV_HEADERS)];

        foreach ($rows as $row) {
            $values = [];
            foreach (self::CSV_HEADERS as $header) {
                $values[] = (string) ($row[$header] ?? '');
            }
            $lines[] = implode(',', $values);
        }

        return implode("\n", $lines);
    }

    private function rowFor(string $model, array $overrides = []): array
    {
        $row = array_fill_keys(self::CSV_HEADERS, '');
        $row['Model'] = $model;
        $row['Barcode'] = 'BAR-'.random_int(10000, 99999);
        $row['IMEI 1'] = '3500000000'.random_int(10000, 99999);
        $row['Cost'] = '50000';
        $row['Cash Price'] = '55000';
        $row['SRP'] = '60000';

        foreach ($overrides as $key => $value) {
            $row[$key] = $value;
        }

        return $row;
    }

    private function createProductMaster(
        string $modelName,
        string $brandName,
        string $categoryName = 'Computers',
        string $subcategoryName = 'Laptops',
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
        $model = ProductModel::firstOrCreate([
            'brand_id' => $brand->id,
            'model_name' => $modelName,
        ]);

        return ProductMaster::create([
            'master_sku' => strtoupper($brandName).'-'.strtoupper(str_replace(' ', '', $modelName)).'-'.random_int(10, 99),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
    }

    private function createFallbackCategoryTree(): void
    {
        $category = ProductCategory::firstOrCreate([
            'name' => 'No Category',
            'parent_category_id' => null,
        ]);

        ProductCategory::firstOrCreate([
            'name' => 'No Subcategory',
            'parent_category_id' => $category->id,
        ]);
    }
}
