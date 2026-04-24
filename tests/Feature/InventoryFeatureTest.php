<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use App\Models\InventoryItemLog;
use App\Models\DeliveryReceipt;
use App\Models\GoodsReceipt;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InventoryFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_page_and_supporting_endpoints_are_accessible(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '123456789012345',
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
            'cost_price' => 10000,
        ]);
        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '123456789012346',
            'serial_number' => 'INV-SN-002',
            'status' => 'sold',
            'cost_price' => 8000,
        ]);

        $this->actingAs($user)->get(route('inventory.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Inventory')
                ->has('inventory.data', 1)
                ->missing('inventory.data.0.supplier_id')
                ->missing('inventory.data.0.submodel')
                ->missing('inventory.data.0.ram_type')
                ->missing('inventory.data.0.rom_type')
                ->missing('inventory.data.0.ram_slots')
                ->missing('inventory.data.0.country_model')
                ->missing('inventory.data.0.resolution')
                ->missing('inventory.data.0.purchase')
                ->missing('inventory.data.0.purchase_file_data')
                ->where('filters.search', '')
                ->where('filters.location', 'all')
                ->where('filters.condition', 'all')
                ->where('filters.sort', 'encoded_date')
                ->where('filters.direction', 'desc')
                ->where('filters.perPage', 50)
                ->where('exactLookup.active', false)
                ->has('warehouses', 1)
                ->has('brands', 1)
                ->has('categories', 1)
                ->missing('productMasters')
                ->missing('variants')
                ->missing('subcategories')
            );
        $this->actingAs($user)->getJson(route('inventory.kpis'))
            ->assertOk()
            ->assertJson([
                'totalItems' => 2,
                'availableStock' => 1,
            ]);
        $this->actingAs($user)->getJson(route('inventory.kpis', ['status' => 'available']))
            ->assertOk()
            ->assertJson([
                'totalItems' => 1,
                'availableStock' => 1,
                'totalValuation' => 10000,
            ]);
        $this->actingAs($user)->getJson(route('inventory.exact-lookup', ['search' => '123456789012345']))
            ->assertOk()
            ->assertJsonPath('rows.0.imei1', '123456789012345');
        $this->actingAs($user)->get(route('inventory.export'))->assertOk();
    }

    public function test_inventory_index_filters_sorts_and_paginates_server_side(): void
    {
        $user = User::factory()->create();
        [$appleVariant, $mainWarehouse] = $this->createInventoryGraph();
        $branchWarehouse = Warehouse::create([
            'name' => 'Branch Warehouse',
            'warehouse_type' => 'warehouse',
        ]);

        $samsungBrand = ProductBrand::create(['name' => 'Samsung']);
        $samsungCategory = ProductCategory::create([
            'name' => 'Tablets',
            'parent_category_id' => null,
        ]);
        $samsungSubcategory = ProductCategory::create([
            'name' => 'Android Tablets',
            'parent_category_id' => $samsungCategory->id,
        ]);
        $samsungModel = ProductModel::create([
            'brand_id' => $samsungBrand->id,
            'model_name' => 'Galaxy Tab Ultra',
        ]);
        $samsungMaster = ProductMaster::create([
            'master_sku' => 'SAMSUNG-TAB-ULTRA',
            'model_id' => $samsungModel->id,
            'subcategory_id' => $samsungSubcategory->id,
        ]);
        $samsungVariant = ProductVariant::create([
            'product_master_id' => $samsungMaster->id,
            'variant_name' => 'Samsung Galaxy Tab Ultra 12GB 512GB Silver',
            'sku' => 'SAMSUNG-TAB-ULTRA-12GB-512GB-SILVER',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        foreach (range(1, 12) as $index) {
            InventoryItem::create([
                'product_variant_id' => $index <= 6 ? $appleVariant->id : $samsungVariant->id,
                'warehouse_id' => $index <= 6 ? $mainWarehouse->id : $branchWarehouse->id,
                'imei' => sprintf('990000000000%03d', $index),
                'serial_number' => sprintf('INV-%03d', $index),
                'status' => $index <= 6 ? 'available' : 'sold',
                'cost_price' => 1000 + $index,
                'cash_price' => 1500 + $index,
                'srp_price' => 1700 + $index,
                'encoded_at' => now()->subDays($index),
            ]);
        }

        $this->actingAs($user)
            ->get(route('inventory.index', [
                'search' => 'Samsung',
                'location' => $branchWarehouse->id,
                'status' => 'sold',
                'brand' => $samsungBrand->id,
                'category' => $samsungCategory->id,
                'condition' => 'Brand New',
                'stockAge' => '1-7',
                'sort' => 'cost_price',
                'direction' => 'asc',
                'perPage' => 10,
                'page' => 1,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.search', 'Samsung')
                ->where('filters.location', (string) $branchWarehouse->id)
                ->where('filters.status', 'sold')
                ->where('filters.brand', (string) $samsungBrand->id)
                ->where('filters.category', (string) $samsungCategory->id)
                ->where('filters.condition', 'Brand New')
                ->where('filters.stockAge', '1-7')
                ->where('filters.sort', 'cost_price')
                ->where('filters.direction', 'asc')
                ->where('filters.perPage', 10)
                ->where('inventory.total', 1)
                ->where('inventory.per_page', 10)
                ->where('inventory.data.0.brandName', 'Samsung')
                ->where('inventory.data.0.warehouseName', 'Branch Warehouse')
                ->where('inventory.data.0.categoryName', 'Tablets')
                ->where('inventory.data.0.subcategoryName', 'Android Tablets')
                ->where('inventory.data.0.variantCondition', 'Brand New')
                ->missing('inventory.data.0.logs')
                ->missing('productMasters')
                ->missing('variants')
                ->missing('subcategories')
            );

        $this->actingAs($user)
            ->get(route('inventory.index', ['perPage' => 10, 'page' => 2]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('inventory.data', 2)
                ->where('inventory.total', 12)
                ->where('inventory.current_page', 2)
                ->where('inventory.per_page', 10)
            );

        foreach ([500, 1000, 5000] as $perPage) {
            $this->actingAs($user)
                ->get(route('inventory.index', ['perPage' => $perPage]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('filters.perPage', $perPage)
                    ->where('inventory.per_page', $perPage)
                );
        }

        $this->actingAs($user)
            ->get(route('inventory.index', ['perPage' => 999]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.perPage', 50)
                ->where('inventory.per_page', 50)
            );
    }

    public function test_inventory_index_uses_exact_identifier_fallback_when_filtered_result_is_empty(): void
    {
        $user = User::factory()->create();
        [$variant, $mainWarehouse] = $this->createInventoryGraph();
        $otherWarehouse = Warehouse::create([
            'name' => 'Overflow Warehouse',
            'warehouse_type' => 'warehouse',
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $mainWarehouse->id,
            'imei' => '123456789012345',
            'serial_number' => 'FALLBACK-001',
            'status' => 'available',
            'encoded_at' => now()->subDays(3),
        ]);

        $this->actingAs($user)
            ->get(route('inventory.index', [
                'search' => '123456789012345',
                'location' => $otherWarehouse->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('inventory.total', 1)
                ->where('inventory.data.0.imei1', '123456789012345')
                ->where('exactLookup.active', true)
                ->where('exactLookup.matchedCount', 1)
                ->where('exactLookup.outsideCurrentFiltersCount', 1)
            );
    }

    public function test_inventory_search_treats_numeric_token_as_product_context_for_mixed_queries(): void
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'main_warehouse',
        ]);
        $brand = ProductBrand::create(['name' => 'Apple']);
        $category = ProductCategory::create([
            'name' => 'Phones',
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Smartphones',
            'parent_category_id' => $category->id,
        ]);

        $iphone13Model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'iPhone 13',
        ]);
        $iphone13Master = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE13',
            'model_id' => $iphone13Model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $iphone13Variant = ProductVariant::create([
            'product_master_id' => $iphone13Master->id,
            'variant_name' => 'Apple iPhone 13 128GB Black',
            'sku' => 'APPLE-IPHONE13-128GB-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        $iphone15Model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'iPhone 15',
        ]);
        $iphone15Master = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE15',
            'model_id' => $iphone15Model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $iphone15Variant = ProductVariant::create([
            'product_master_id' => $iphone15Master->id,
            'variant_name' => 'Apple iPhone 15 128GB Pink',
            'sku' => 'APPLE-IPHONE15-128GB-PINK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        $iphone16Model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'iPhone 16',
        ]);
        $iphone16Master = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE16',
            'model_id' => $iphone16Model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $iphone16Variant = ProductVariant::create([
            'product_master_id' => $iphone16Master->id,
            'variant_name' => 'Apple iPhone 16 128GB Black',
            'sku' => 'APPLE-IPHONE16-128GB-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        InventoryItem::create([
            'product_variant_id' => $iphone13Variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '880000000000001',
            'serial_number' => 'IPH13-SERIAL-001',
            'status' => 'available',
        ]);
        InventoryItem::create([
            'product_variant_id' => $iphone15Variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '913000000000001',
            'serial_number' => 'IPH15-SERIAL-001',
            'status' => 'available',
        ]);
        InventoryItem::create([
            'product_variant_id' => $iphone16Variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '990000000000003',
            'serial_number' => 'IPH16-SERIAL-13',
            'status' => 'available',
        ]);

        $this->actingAs($user)
            ->get(route('inventory.index', ['search' => 'iphone 13']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('inventory.total', 1)
                ->where('inventory.data.0.masterModel', 'iPhone 13')
                ->where('inventory.data.0.serial_number', 'IPH13-SERIAL-001')
            );

        $this->actingAs($user)
            ->get(route('inventory.index', ['search' => 'iphone 15']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('inventory.total', 1)
                ->where('inventory.data.0.masterModel', 'iPhone 15')
            );

        $this->actingAs($user)
            ->get(route('inventory.index', ['search' => '913000000000001']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('inventory.total', 1)
                ->where('inventory.data.0.masterModel', 'iPhone 15')
                ->where('inventory.data.0.imei1', '913000000000001')
            );

        $exportResponse = $this->actingAs($user)->get(route('inventory.export', [
            'search' => 'iphone 13',
        ]));
        $exportResponse->assertOk();
        $csv = $exportResponse->streamedContent();
        $this->assertStringContainsString('IPH13-SERIAL-001', $csv);
        $this->assertStringNotContainsString('IPH15-SERIAL-001', $csv);
        $this->assertStringNotContainsString('IPH16-SERIAL-13', $csv);
    }

    public function test_inventory_export_respects_server_side_filters(): void
    {
        $user = User::factory()->create();
        [$appleVariant, $mainWarehouse] = $this->createInventoryGraph();
        $branchWarehouse = Warehouse::create([
            'name' => 'Branch Warehouse',
            'warehouse_type' => 'warehouse',
        ]);

        InventoryItem::create([
            'product_variant_id' => $appleVariant->id,
            'warehouse_id' => $mainWarehouse->id,
            'imei' => '111111111111111',
            'serial_number' => 'APPLE-001',
            'status' => 'available',
        ]);

        InventoryItem::create([
            'product_variant_id' => $appleVariant->id,
            'warehouse_id' => $branchWarehouse->id,
            'imei' => '222222222222222',
            'serial_number' => 'APPLE-002',
            'status' => 'sold',
        ]);

        $response = $this->actingAs($user)->get(route('inventory.export', [
            'location' => $branchWarehouse->id,
            'status' => 'sold',
            'search' => 'APPLE-002',
        ]));

        $response->assertOk();
        $response->assertDownload('inventory.csv');

        $content = $response->streamedContent();

        $expectedHeader = 'Brand,Model,"Model Code",Category,Subcategory,RAM,ROM,Color,Condition,CPU,GPU,"RAM Type","ROM Type","Operating System",Screen,"Warehouse Name",IMEI1,IMEI2,"Serial Number",Status,"Cost Price","Cash Price","SRP Price",Warranty,"Encoded At","GRN Number",Supplier';
        $this->assertStringStartsWith($expectedHeader, $content);
        $this->assertStringContainsString('APPLE-002', $content);
        $this->assertStringNotContainsString('APPLE-001', $content);
        $this->assertStringContainsString('Branch Warehouse', $content);
        $this->assertStringNotContainsString('Purchase Reference', $content);
    }

    public function test_inventory_export_includes_spec_columns_and_supplier_by_grn_with_fallback(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $variant->update([
            'model_code' => 'A2890',
            'ram' => '8GB',
            'rom' => '256GB',
            'color' => 'Midnight',
            'condition' => 'Brand New',
            'cpu' => 'A17 Pro',
            'gpu' => 'Apple GPU',
            'ram_type' => 'LPDDR5',
            'rom_type' => 'NVMe',
            'operating_system' => 'iOS',
            'screen' => '6.1-inch',
        ]);

        $supplierWithLegalName = Supplier::create([
            'supplier_code' => 'SUP-LGL',
            'legal_business_name' => 'Acme Devices Incorporated',
            'trade_name' => 'Acme Gadgets',
            'address' => 'Manila',
            'status' => 'active',
        ]);
        $supplierTradeOnly = Supplier::create([
            'supplier_code' => 'SUP-TRD',
            'legal_business_name' => '',
            'trade_name' => 'Trade Only Supplier',
            'address' => 'Cebu',
            'status' => 'active',
        ]);

        $deliveryReceiptWithLegalName = DeliveryReceipt::create([
            'supplier_id' => $supplierWithLegalName->id,
            'dr_number' => 'DR-LEGAL',
            'date_received' => now(),
            'date_encoded' => now(),
        ]);
        $deliveryReceiptTradeOnly = DeliveryReceipt::create([
            'supplier_id' => $supplierTradeOnly->id,
            'dr_number' => 'DR-TRADE',
            'date_received' => now(),
            'date_encoded' => now(),
        ]);

        GoodsReceipt::create([
            'grn_number' => 'GRN-LEGAL',
            'delivery_receipt_id' => $deliveryReceiptWithLegalName->id,
            'status' => 'completed',
        ]);
        GoodsReceipt::create([
            'grn_number' => 'GRN-TRADE',
            'delivery_receipt_id' => $deliveryReceiptTradeOnly->id,
            'status' => 'completed',
        ]);

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '900000000000001',
            'imei2' => '900000000000002',
            'serial_number' => 'INV-EXPORT-001',
            'status' => 'available',
            'cost_price' => 10000,
            'cash_price' => 12000,
            'srp_price' => 14000,
            'warranty' => '12 months',
            'grn_number' => 'GRN-LEGAL',
        ]);
        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '900000000000011',
            'imei2' => '900000000000012',
            'serial_number' => 'INV-EXPORT-002',
            'status' => 'available',
            'grn_number' => 'GRN-TRADE',
        ]);
        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '900000000000021',
            'imei2' => '900000000000022',
            'serial_number' => 'INV-EXPORT-003',
            'status' => 'available',
            'grn_number' => 'GRN-NO-MATCH',
        ]);

        $response = $this->actingAs($user)->get(route('inventory.export'));

        $response->assertOk();
        $response->assertDownload('inventory.csv');

        $csvRows = str_getcsv($response->streamedContent(), "\n");
        $header = str_getcsv($csvRows[0]);

        $this->assertSame([
            'Brand',
            'Model',
            'Model Code',
            'Category',
            'Subcategory',
            'RAM',
            'ROM',
            'Color',
            'Condition',
            'CPU',
            'GPU',
            'RAM Type',
            'ROM Type',
            'Operating System',
            'Screen',
            'Warehouse Name',
            'IMEI1',
            'IMEI2',
            'Serial Number',
            'Status',
            'Cost Price',
            'Cash Price',
            'SRP Price',
            'Warranty',
            'Encoded At',
            'GRN Number',
            'Supplier',
        ], $header);

        $rowsBySerial = collect(array_slice($csvRows, 1))
            ->map(fn (string $line) => str_getcsv($line))
            ->mapWithKeys(fn (array $row) => [$row[18] => $row]);

        $this->assertSame('A2890', $rowsBySerial['INV-EXPORT-001'][2]);
        $this->assertSame('8GB', $rowsBySerial['INV-EXPORT-001'][5]);
        $this->assertSame('256GB', $rowsBySerial['INV-EXPORT-001'][6]);
        $this->assertSame('Midnight', $rowsBySerial['INV-EXPORT-001'][7]);
        $this->assertSame('LPDDR5', $rowsBySerial['INV-EXPORT-001'][11]);
        $this->assertSame('NVMe', $rowsBySerial['INV-EXPORT-001'][12]);
        $this->assertSame('iOS', $rowsBySerial['INV-EXPORT-001'][13]);
        $this->assertSame('6.1-inch', $rowsBySerial['INV-EXPORT-001'][14]);
        $this->assertSame('GRN-LEGAL', $rowsBySerial['INV-EXPORT-001'][25]);
        $this->assertSame('Acme Devices Incorporated', $rowsBySerial['INV-EXPORT-001'][26]);
        $this->assertSame('Trade Only Supplier', $rowsBySerial['INV-EXPORT-002'][26]);
        $this->assertSame('', $rowsBySerial['INV-EXPORT-003'][26]);
    }

    public function test_inventory_import_validation_rejects_missing_required_columns(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->createWithContent('inventory.csv', "Brand,Warehouse\nApple,Main Warehouse");

        $this->actingAs($user)
            ->post(route('inventory.import.validate'), [
                'file' => $file,
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Missing required columns: Model, Condition');
    }

    public function test_inventory_import_validation_is_read_only_and_import_creates_item_and_log(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse, $productMaster] = $this->createInventoryGraph();

        $variant->delete();

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,RAM,ROM,Color,CPU,GPU,RAM Type,ROM Type,Submodel,RAM Slot,Country Model,Resolution,Purchase,Operating System,Screen,IMEI 1,Serial Number,Cost,Cash,SRP',
            'Apple,iPhone 17,Main Warehouse,Brand New,8,256,Black,M3,Integrated,LPDDR5,NVMe,Pro,2x,PH,1179x2556,PO-123,macOS,15-inch,991122334455667,SN-NEW-001,10000,12000,13000',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $validationResponse = $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->assertSame(1, $validationResponse['variantsCreated']);
        $this->assertArrayHasKey('importToken', $validationResponse);
        $this->assertDatabaseCount('product_variants', 0);
        $this->assertDatabaseCount('inventory_items', 0);

        $this->actingAs($user)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJson([
                'created' => 1,
                'failed' => 0,
            ]);

        $createdVariant = ProductVariant::query()->first();

        $this->assertNotNull($createdVariant);
        $this->assertSame('8GB', $createdVariant->ram);
        $this->assertSame('256GB', $createdVariant->rom);
        $this->assertSame('Black', $createdVariant->color);
        $this->assertSame('M3', $createdVariant->cpu);
        $this->assertSame('Integrated', $createdVariant->gpu);
        $this->assertSame('LPDDR5', $createdVariant->ram_type);
        $this->assertSame('NVMe', $createdVariant->rom_type);
        $this->assertSame('macOS', $createdVariant->operating_system);
        $this->assertSame('15-inch', $createdVariant->screen);
        $this->assertDatabaseHas('inventory_items', [
            'product_variant_id' => $createdVariant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '991122334455667',
            'serial_number' => 'SN-NEW-001',
        ]);
        $this->assertDatabaseHas('inventory_item_logs', [
            'action' => 'CSV_IMPORT',
            'actor_id' => $user->id,
        ]);
        $this->assertSame($productMaster->id, $createdVariant->product_master_id);
    }

    public function test_inventory_import_maps_purchase_to_grn_number_with_grn_priority(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,Purchase,GRN Number,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,PO-123,,900000000000111,SN-PURCHASE-ONLY',
            'Apple,iPhone 17,Main Warehouse,Brand New,PO-999,GRN-999,900000000000112,SN-BOTH',
            'Apple,iPhone 17,Main Warehouse,Brand New,,,900000000000113,SN-EMPTY',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $validationResponse = $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->assertSame(0, $validationResponse['variantsCreated']);

        $this->actingAs($user)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJson([
                'created' => 3,
                'failed' => 0,
            ]);

        $this->assertDatabaseHas('inventory_items', [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'SN-PURCHASE-ONLY',
            'grn_number' => 'PO-123',
        ]);

        $this->assertDatabaseHas('inventory_items', [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'SN-BOTH',
            'grn_number' => 'GRN-999',
        ]);

        $this->assertDatabaseHas('inventory_items', [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'SN-EMPTY',
            'grn_number' => '',
        ]);
    }

    public function test_inventory_import_falls_back_to_barcode_for_serial_number_and_preserves_serial_priority(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,Barcode,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,BAR-ONLY-001,900000000000201,',
            'Apple,iPhone 17,Main Warehouse,Brand New,BAR-SECONDARY-001,900000000000202,SN-PRIMARY-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $validationResponse = $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->assertSame(0, $validationResponse['variantsCreated']);

        $this->actingAs($user)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJson([
                'created' => 2,
                'failed' => 0,
            ]);

        $this->assertDatabaseHas('inventory_items', [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '900000000000201',
            'serial_number' => 'BAR-ONLY-001',
        ]);

        $this->assertDatabaseHas('inventory_items', [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '900000000000202',
            'serial_number' => 'SN-PRIMARY-001',
        ]);
    }

    public function test_inventory_import_accepts_legacy_ram_and_rom_capacity_columns(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $variant->delete();

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,RAM Capacity,ROM Capacity,Color,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,16,512,Midnight,988877766655544,SN-LEGACY-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $validationResponse = $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->assertSame(1, $validationResponse['variantsCreated']);

        $this->actingAs($user)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJsonPath('created', 1);

        $this->assertDatabaseHas('product_variants', [
            'ram' => '16GB',
            'rom' => '512GB',
            'color' => 'Midnight',
        ]);
        $this->assertDatabaseHas('inventory_items', [
            'warehouse_id' => $warehouse->id,
            'imei' => '988877766655544',
            'serial_number' => 'SN-LEGACY-001',
        ]);
    }

    public function test_inventory_import_uses_full_variant_attribute_match(): void
    {
        $user = User::factory()->create();
        [$existingVariant, $warehouse, $productMaster] = $this->createInventoryGraph();
        $existingVariant->update([
            'ram' => '8GB',
            'rom' => '256GB',
            'color' => 'Black',
            'cpu' => 'Ryzen 7',
            'gpu' => 'RTX 4060',
            'ram_type' => 'DDR5',
            'rom_type' => 'NVMe',
            'operating_system' => 'Windows 11',
            'screen' => '15.6"',
        ]);

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,RAM,ROM,Color,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,8,256,Black,Ryzen 7,RTX 4060,DDR5,NVMe,Ubuntu,15.6",900000000000001,SN-FULL-ATTR-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $validationResponse = $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->assertSame(1, $validationResponse['variantsCreated']);

        $this->actingAs($user)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJsonPath('created', 1);

        $this->assertDatabaseCount('product_variants', 2);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $productMaster->id,
            'cpu' => 'Ryzen 7',
            'gpu' => 'RTX 4060',
            'operating_system' => 'Ubuntu',
        ]);
        $this->assertDatabaseHas('inventory_items', [
            'warehouse_id' => $warehouse->id,
            'imei' => '900000000000001',
            'serial_number' => 'SN-FULL-ATTR-001',
        ]);
    }

    public function test_inventory_import_supports_os_and_display_alias_headers(): void
    {
        $user = User::factory()->create();
        [$variant] = $this->createInventoryGraph();
        $variant->delete();

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,RAM,ROM,Color,CPU,GPU,RAM Type,ROM Type,OS,Display,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,8,256,Black,Intel i7,RTX 4050,DDR5,NVMe,Windows 11,14-inch,911111111111111,SN-ALIAS-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $validationResponse = $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->assertSame(1, $validationResponse['variantsCreated']);

        $this->actingAs($user)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJsonPath('created', 1);

        $this->assertDatabaseHas('product_variants', [
            'operating_system' => 'Windows 11',
            'screen' => '14-inch',
        ]);
    }

    public function test_inventory_import_auto_creates_brand_model_master_and_variant_with_model_code_cleanup(): void
    {
        $user = User::factory()->create();
        Warehouse::create([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'main_warehouse',
        ]);
        $noCategory = ProductCategory::create([
            'name' => 'No Category',
            'parent_category_id' => null,
        ]);
        ProductCategory::create([
            'name' => 'No Subcategory',
            'parent_category_id' => $noCategory->id,
        ]);

        $csv = implode("\n", [
            'Brand,Model,Model Code,Warehouse,Condition,RAM,ROM,Color,CPU,GPU,RAM Type,ROM Type,Operating System,Screen,IMEI 1,Serial Number',
            'Apple,iPhone 17 A2890,A2890,Main Warehouse,Brand New,8,256,Black,M3,Integrated,LPDDR5,NVMe,iOS,6.1-inch,988888888888881,SN-AUTO-GRAPH-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $brandCount = ProductBrand::count();
        $modelCount = ProductModel::count();
        $masterCount = ProductMaster::count();
        $variantCount = ProductVariant::count();
        $inventoryCount = InventoryItem::count();

        $validationResponse = $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->assertSame(1, $validationResponse['variantsCreated']);
        $this->assertSame($brandCount, ProductBrand::count());
        $this->assertSame($modelCount, ProductModel::count());
        $this->assertSame($masterCount, ProductMaster::count());
        $this->assertSame($variantCount, ProductVariant::count());
        $this->assertSame($inventoryCount, InventoryItem::count());

        $this->actingAs($user)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJson([
                'created' => 1,
                'failed' => 0,
            ]);

        $brand = ProductBrand::query()->where('name', 'APPLE')->first();
        $this->assertNotNull($brand);
        $model = ProductModel::query()
            ->where('brand_id', $brand->id)
            ->where('model_name', 'IPHONE 17')
            ->first();
        $this->assertNotNull($model);
        $master = ProductMaster::query()->where('model_id', $model->id)->first();
        $this->assertNotNull($master);
        $this->assertDatabaseHas('product_variants', [
            'product_master_id' => $master->id,
            'model_code' => 'A2890',
            'operating_system' => 'iOS',
            'screen' => '6.1-inch',
        ]);
    }

    public function test_inventory_import_validation_fails_when_fallback_no_subcategory_is_missing(): void
    {
        $user = User::factory()->create();
        Warehouse::create([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'main_warehouse',
        ]);
        ProductCategory::create([
            'name' => 'No Category',
            'parent_category_id' => null,
        ]);

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,IMEI 1,Serial Number',
            'New Brand,New Model,Main Warehouse,Brand New,977777777777771,SN-NO-FALLBACK-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('skippedItems.0.reason', 'Fallback subcategory containing "No Subcategory" was not found under "No Category".');
    }

    public function test_inventory_import_validation_fails_when_fallback_no_subcategory_is_ambiguous(): void
    {
        $user = User::factory()->create();
        Warehouse::create([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'main_warehouse',
        ]);
        $noCategory = ProductCategory::create([
            'name' => 'No Category',
            'parent_category_id' => null,
        ]);
        ProductCategory::create([
            'name' => 'No Subcategory',
            'parent_category_id' => $noCategory->id,
        ]);
        ProductCategory::create([
            'name' => 'No Subcategory Default',
            'parent_category_id' => $noCategory->id,
        ]);

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,IMEI 1,Serial Number',
            'New Brand,New Model,Main Warehouse,Brand New,966666666666661,SN-AMBIG-FALLBACK-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('skippedItems.0.reason', 'Fallback subcategory containing "No Subcategory" is ambiguous under "No Category".');
    }

    public function test_inventory_import_validation_detects_duplicate_identifier(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '123456789012345',
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
        ]);

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,123456789012345,SN-NEW-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('skippedItems.0.reason', 'Duplicate imei1 already exists: 123456789012345');
    }

    public function test_inventory_import_validation_detects_duplicate_serial_via_barcode_fallback(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'BAR-DUP-001',
            'status' => 'available',
        ]);

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,Barcode,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,BAR-DUP-001,123456789012399,',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $this->actingAs($user)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('skippedItems.0.reason', 'Duplicate serial_number already exists: BAR-DUP-001');
    }

    public function test_inventory_import_rejects_reused_or_foreign_token(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $this->createInventoryGraph();

        $csv = implode("\n", [
            'Brand,Model,Warehouse,Condition,IMEI 1,Serial Number',
            'Apple,iPhone 17,Main Warehouse,Brand New,123123123123123,SN-IMPORT-001',
        ]);
        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csv);

        $validationResponse = $this->actingAs($firstUser)
            ->post(route('inventory.import.validate'), ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->json();

        $this->actingAs($secondUser)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This import token belongs to another user. Validate the file again.');

        $this->actingAs($firstUser)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertOk()
            ->assertJsonPath('created', 1);

        $this->actingAs($firstUser)
            ->postJson(route('inventory.import'), [
                'importToken' => $validationResponse['importToken'],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Import token is invalid or expired. Validate the file again.');
    }

    public function test_inventory_batch_update_allows_only_supported_fields_for_same_product_master(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse, $productMaster] = $this->createInventoryGraph();
        $targetVariant = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 512GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-512GB-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
        $targetWarehouse = Warehouse::create([
            'name' => 'Branch Warehouse',
            'warehouse_type' => 'warehouse',
        ]);

        $firstItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '111111111111111',
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
        ]);

        $secondItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => '222222222222222',
            'serial_number' => 'INV-SN-002',
            'status' => 'available',
        ]);

        $this->actingAs($user)
            ->postJson(route('inventory.batch.update'), [
                'itemIds' => [$firstItem->id, $secondItem->id],
                'updateFields' => [
                    'variant_id' => $targetVariant->id,
                    'warehouse_id' => $targetWarehouse->id,
                    'status' => 'on_hold',
                    'warranty_description' => 'Updated warranty',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('succeeded.0', $firstItem->id)
            ->assertJsonPath('succeeded.1', $secondItem->id)
            ->assertJsonPath('skippedConflicts', []);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $firstItem->id,
            'product_variant_id' => $targetVariant->id,
            'warehouse_id' => $targetWarehouse->id,
            'status' => 'on_hold',
            'warranty' => 'Updated warranty',
        ]);
        $this->assertDatabaseHas('inventory_items', [
            'id' => $secondItem->id,
            'product_variant_id' => $targetVariant->id,
            'warehouse_id' => $targetWarehouse->id,
            'status' => 'on_hold',
            'warranty' => 'Updated warranty',
        ]);
    }

    public function test_inventory_batch_update_rejects_unsupported_fields(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $item = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
        ]);

        $this->actingAs($user)
            ->postJson(route('inventory.batch.update'), [
                'itemIds' => [$item->id],
                'updateFields' => [
                    'imei1' => '222222222222222',
                    'cost_price' => 123,
                    'encoded_date' => '2026-04-08 10:00:00',
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['updateFields']);
    }

    public function test_inventory_batch_update_rejects_mixed_product_masters(): void
    {
        $user = User::factory()->create();
        [$appleVariant, $warehouse] = $this->createInventoryGraph();
        $samsungVariant = $this->createSamsungVariant();

        $firstItem = InventoryItem::create([
            'product_variant_id' => $appleVariant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
        ]);
        $secondItem = InventoryItem::create([
            'product_variant_id' => $samsungVariant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-SN-002',
            'status' => 'available',
        ]);

        $this->actingAs($user)
            ->postJson(route('inventory.batch.update'), [
                'itemIds' => [$firstItem->id, $secondItem->id],
                'updateFields' => ['status' => 'on_hold'],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Batch update requires all selected items to belong to the same product master.');
    }

    public function test_inventory_batch_update_rejects_missing_selected_items(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $item = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
        ]);

        $this->actingAs($user)
            ->postJson(route('inventory.batch.update'), [
                'itemIds' => [$item->id, 999999],
                'updateFields' => ['status' => 'on_hold'],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'One or more selected inventory items could not be found.');
    }

    public function test_inventory_batch_update_rejects_variant_from_another_product_master(): void
    {
        $user = User::factory()->create();
        [$appleVariant, $warehouse] = $this->createInventoryGraph();
        $samsungVariant = $this->createSamsungVariant();

        $item = InventoryItem::create([
            'product_variant_id' => $appleVariant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
        ]);

        $this->actingAs($user)
            ->postJson(route('inventory.batch.update'), [
                'itemIds' => [$item->id],
                'updateFields' => ['variant_id' => $samsungVariant->id],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Selected variant must belong to the same product master as the selected inventory items.');
    }

    public function test_inventory_batch_delete_removes_items(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $item = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-SN-001',
            'status' => 'available',
        ]);

        $this->actingAs($user)
            ->deleteJson(route('inventory.batch.delete'), [
                'itemIds' => [$item->id],
            ])
            ->assertOk()
            ->assertJson([
                'deleted' => 1,
                'failed' => 0,
            ]);

        $this->assertDatabaseMissing('inventory_items', ['id' => $item->id]);
    }

    public function test_inventory_logs_endpoint_returns_only_selected_item_logs(): void
    {
        $user = User::factory()->create();
        [$variant, $warehouse] = $this->createInventoryGraph();

        $item = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-LOG-001',
            'status' => 'available',
        ]);

        $otherItem = InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => 'INV-LOG-002',
            'status' => 'available',
        ]);

        InventoryItemLog::create([
            'inventory_item_id' => $item->id,
            'actor_id' => $user->id,
            'logged_at' => now(),
            'action' => 'TEST_LOG',
            'notes' => 'Selected item log',
            'meta' => ['scope' => 'selected'],
        ]);

        InventoryItemLog::create([
            'inventory_item_id' => $otherItem->id,
            'actor_id' => $user->id,
            'logged_at' => now(),
            'action' => 'OTHER_LOG',
            'notes' => 'Other item log',
            'meta' => ['scope' => 'other'],
        ]);

        $this->actingAs($user)
            ->getJson(route('inventory.logs', $item))
            ->assertOk()
            ->assertJsonCount(1, 'logs')
            ->assertJsonPath('logs.0.action', 'TEST_LOG')
            ->assertJsonPath('logs.0.actor_name', $user->name)
            ->assertJsonPath('logs.0.notes', 'Selected item log');
    }

    public function test_inventory_variant_options_endpoint_supports_search_and_pagination(): void
    {
        $user = User::factory()->create();
        [$appleVariant] = $this->createInventoryGraph();

        $samsungBrand = ProductBrand::create(['name' => 'Samsung']);
        $samsungCategory = ProductCategory::create([
            'name' => 'Tablets',
            'parent_category_id' => null,
        ]);
        $samsungSubcategory = ProductCategory::create([
            'name' => 'Android Tablets',
            'parent_category_id' => $samsungCategory->id,
        ]);
        $samsungModel = ProductModel::create([
            'brand_id' => $samsungBrand->id,
            'model_name' => 'Galaxy Tab Ultra',
        ]);
        $samsungMaster = ProductMaster::create([
            'master_sku' => 'SAMSUNG-TAB-ULTRA',
            'model_id' => $samsungModel->id,
            'subcategory_id' => $samsungSubcategory->id,
        ]);

        foreach (range(1, 16) as $index) {
            ProductVariant::create([
                'product_master_id' => $samsungMaster->id,
                'variant_name' => sprintf('Samsung Variant %02d', $index),
                'sku' => sprintf('SAMSUNG-VARIANT-%02d', $index),
                'condition' => 'Brand New',
                'is_active' => true,
            ]);
        }

        $this->actingAs($user)
            ->getJson(route('inventory.variant-options', ['search' => 'Samsung']))
            ->assertOk()
            ->assertJsonPath('filters.search', 'Samsung')
            ->assertJsonPath('variants.total', 16)
            ->assertJsonPath('variants.per_page', 15)
            ->assertJsonPath('variants.current_page', 1)
            ->assertJsonPath('variants.data.0.description', 'Samsung | Galaxy Tab Ultra | Brand New');

        $this->actingAs($user)
            ->getJson(route('inventory.variant-options', ['search' => 'Samsung', 'page' => 2]))
            ->assertOk()
            ->assertJsonPath('variants.current_page', 2)
            ->assertJsonCount(1, 'variants.data');

        $this->actingAs($user)
            ->getJson(route('inventory.variant-options', ['search' => $appleVariant->sku]))
            ->assertOk()
            ->assertJsonPath('variants.total', 1)
            ->assertJsonPath('variants.data.0.id', $appleVariant->id);

        $this->actingAs($user)
            ->getJson(route('inventory.variant-options', [
                'search' => 'Samsung',
                'productMasterId' => $appleVariant->product_master_id,
            ]))
            ->assertOk()
            ->assertJsonPath('filters.productMasterId', $appleVariant->product_master_id)
            ->assertJsonPath('variants.total', 0);
    }

    private function createSamsungVariant(): ProductVariant
    {
        $brand = ProductBrand::create(['name' => 'Samsung']);
        $category = ProductCategory::create([
            'name' => 'Tablets',
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Android Tablets',
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'Galaxy Tab Ultra',
        ]);
        $productMaster = ProductMaster::create([
            'master_sku' => 'SAMSUNG-TAB-ULTRA',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Samsung Galaxy Tab Ultra 12GB 512GB Silver',
            'sku' => 'SAMSUNG-TAB-ULTRA-12GB-512GB-SILVER',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
    }

    /**
     * @return array{0: ProductVariant, 1: Warehouse, 2: ProductMaster}
     */
    private function createInventoryGraph(): array
    {
        $brand = ProductBrand::create(['name' => 'Apple']);
        $category = ProductCategory::create([
            'name' => 'Phones',
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Smartphones',
            'parent_category_id' => $category->id,
        ]);
        $model = $brand->models()->create(['model_name' => 'iPhone 17']);
        $productMaster = ProductMaster::create([
            'master_sku' => 'APPLE-IPHONE17',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $variant = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Apple iPhone 17 8GB 256GB Black',
            'sku' => 'APPLE-IPHONE17-8GB-256GB-BLACK',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);

        $warehouse = Warehouse::create([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'main_warehouse',
        ]);

        return [$variant, $warehouse, $productMaster];
    }
}
