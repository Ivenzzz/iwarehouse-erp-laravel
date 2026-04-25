<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\StockRequest;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GoodsReceiptDetailAttributesTest extends TestCase
{
    use RefreshDatabase;

    public function test_goods_receipt_show_includes_variant_attributes_per_item(): void
    {
        $user = User::factory()->create();
        $context = $this->createGoodsReceiptContextWithVariantAttributes();

        $response = $this->actingAs($user)->getJson(route('goods-receipts.show', $context['goods_receipt_id']));

        $response->assertOk();
        $response->assertJsonPath('goods_receipt.items.0.variant_id', $context['variant_id']);
        $response->assertJsonPath('goods_receipt.items.0.attributes.RAM', '16GB');
        $response->assertJsonPath('goods_receipt.items.0.attributes.ROM', '512GB');
        $response->assertJsonPath('goods_receipt.items.0.attributes.Storage', '512GB');
        $response->assertJsonPath('goods_receipt.items.0.attributes.Color', 'Onyx Black');
        $response->assertJsonPath('goods_receipt.items.0.attributes.CPU', 'Intel Core i7');
        $response->assertJsonPath('goods_receipt.items.0.attributes.GPU', 'RTX 4060');
        $response->assertJsonPath('goods_receipt.items.0.attributes.RAM Type', 'DDR5');
        $response->assertJsonPath('goods_receipt.items.0.attributes.ROM Type', 'NVMe');
        $response->assertJsonPath('goods_receipt.items.0.attributes.Operating System', 'Windows 11');
        $response->assertJsonPath('goods_receipt.items.0.attributes.Screen', '15.6\" FHD');
        $response->assertJsonPath('goods_receipt.items.0.attributes.Condition', 'Brand New');
    }

    private function createGoodsReceiptContextWithVariantAttributes(): array
    {
        $warehouse = Warehouse::create([
            'name' => 'GR Attr Warehouse '.random_int(1, 99999),
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-GRA-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'warehouse_id' => $warehouse->id,
            'required_at' => now()->addDay(),
            'purpose' => 'Replenishment',
            'status' => 'pending',
        ]);

        $rfqId = DB::table('request_for_quotations')->insertGetId([
            'rfq_number' => 'RFQ-GRA-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'stock_request_id' => $stockRequest->id,
            'stock_request_approval_id' => null,
            'created_by_id' => null,
            'status' => 'receiving_quotes',
            'selected_supplier_quote_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $supplier = Supplier::create([
            'supplier_code' => 'SUP-GRA-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'legal_business_name' => 'Supplier GRA '.random_int(1, 99999),
            'trade_name' => 'Supplier GRA',
            'status' => 'Active',
        ]);

        $variant = $this->createProductVariantWithSpecs();

        $rfqItemId = DB::table('request_for_quotation_items')->insertGetId([
            'request_for_quotation_id' => $rfqId,
            'variant_id' => $variant->id,
            'quantity' => 2,
            'description' => 'RFQ item for GR detail attrs test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $supplierQuoteId = DB::table('request_for_quotation_supplier_quotes')->insertGetId([
            'request_for_quotation_id' => $rfqId,
            'supplier_id' => $supplier->id,
            'quote_date' => now(),
            'tax_amount' => 0,
            'shipping_cost' => 0,
            'payment_terms' => 'Net 30',
            'eta' => now()->addDays(7)->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('request_for_quotation_supplier_quote_items')->insertGetId([
            'supplier_quote_id' => $supplierQuoteId,
            'rfq_item_id' => $rfqItemId,
            'quoted_quantity' => 2,
            'unit_price' => 50000,
            'discount' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('request_for_quotations')->where('id', $rfqId)->update([
            'selected_supplier_quote_id' => $supplierQuoteId,
            'updated_at' => now(),
        ]);

        $paymentTermId = DB::table('payment_terms')->insertGetId([
            'name' => 'Net 30 GRA '.random_int(1, 99999),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $shippingMethodId = DB::table('shipping_methods')->insertGetId([
            'name' => 'Ground GRA '.random_int(1, 99999),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $encodedByUserId = DB::table('users')->insertGetId([
            'name' => 'GR Attr User '.random_int(1, 99999),
            'username' => 'gr_attr_user_'.random_int(1000, 999999),
            'email' => 'gr_attr_user_'.random_int(1000, 999999).'@example.com',
            'password' => bcrypt('secret'),
            'status' => 'active',
            'created_by_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $purchaseOrderId = DB::table('purchase_orders')->insertGetId([
            'po_number' => 'PO-GRA-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'rfq_id' => $rfqId,
            'supplier_id' => $supplier->id,
            'selected_supplier_quote_id' => $supplierQuoteId,
            'shipping_method_id' => $shippingMethodId,
            'payment_term_id' => $paymentTermId,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'shipping_amount' => 0,
            'status' => 'pending',
            'has_delivery_receipt' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $deliveryReceiptId = DB::table('delivery_receipts')->insertGetId([
            'supplier_id' => $supplier->id,
            'po_id' => $purchaseOrderId,
            'dr_number' => 'DR-GRA-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'reference_number' => 'REF-GRA-'.random_int(1000, 9999),
            'date_received' => now()->subHour(),
            'date_encoded' => now(),
            'received_by_user_id' => $encodedByUserId,
            'encoded_by_user_id' => $encodedByUserId,
            'payment_term_id' => $paymentTermId,
            'box_count_declared' => 1,
            'box_count_received' => 1,
            'has_variance' => false,
            'variance_notes' => null,
            'dr_value' => 100000,
            'total_landed_cost' => 100000,
            'has_goods_receipt' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $goodsReceiptId = DB::table('goods_receipts')->insertGetId([
            'grn_number' => 'GRN-GRA-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'delivery_receipt_id' => $deliveryReceiptId,
            'status' => 'completed',
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $goodsReceiptItemId = DB::table('goods_receipt_items')->insertGetId([
            'goods_receipt_id' => $goodsReceiptId,
            'product_variant_id' => $variant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('goods_receipt_item_identifiers')->insert([
            'goods_receipt_item_id' => $goodsReceiptItemId,
            'serial_number' => 'SN-GRA-001',
            'imei1' => '351234567890123',
            'imei2' => '351234567890124',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('goods_receipt_item_details')->insert([
            'goods_receipt_item_id' => $goodsReceiptItemId,
            'package' => 'Box Unit',
            'warranty' => '1 Year',
            'cost_price' => 50000,
            'cash_price' => 55000,
            'srp' => 60000,
            'product_type' => 'Laptop',
            'country_model' => 'PH',
            'with_charger' => true,
            'item_notes' => 'Clean unit',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'goods_receipt_id' => $goodsReceiptId,
            'variant_id' => $variant->id,
        ];
    }

    private function createProductVariantWithSpecs(): ProductVariant
    {
        $brand = ProductBrand::create(['name' => 'ASUS']);
        $category = ProductCategory::create([
            'name' => 'Computers',
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Laptops',
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'ROG Zephyrus G16',
        ]);
        $productMaster = ProductMaster::create([
            'master_sku' => 'ASUS-ROG-G16-'.random_int(100, 999),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'model_code' => 'G16-2026',
            'sku' => 'ASUS-G16-16-512-BLK',
            'condition' => 'Brand New',
            'color' => 'Onyx Black',
            'ram' => '16GB',
            'rom' => '512GB',
            'cpu' => 'Intel Core i7',
            'gpu' => 'RTX 4060',
            'ram_type' => 'DDR5',
            'rom_type' => 'NVMe',
            'operating_system' => 'Windows 11',
            'screen' => '15.6\" FHD',
            'is_active' => true,
        ]);
    }
}
