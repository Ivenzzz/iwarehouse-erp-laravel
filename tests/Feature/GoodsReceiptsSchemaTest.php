<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\StockRequest;
use App\Models\Supplier;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GoodsReceiptsSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_goods_receipt_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('goods_receipts'));
        $this->assertTrue(Schema::hasTable('goods_receipt_discrepancies'));
        $this->assertTrue(Schema::hasTable('goods_receipt_items'));
        $this->assertTrue(Schema::hasTable('goods_receipt_item_identifiers'));
        $this->assertTrue(Schema::hasTable('goods_receipt_item_details'));
    }

    public function test_only_one_goods_receipt_per_delivery_receipt_is_allowed(): void
    {
        $context = $this->createGoodsReceiptContext();
        $this->createGoodsReceipt($context['delivery_receipt_id'], 'GRN-000001');

        $this->expectException(QueryException::class);

        $this->createGoodsReceipt($context['delivery_receipt_id'], 'GRN-000002');
    }

    public function test_grn_number_must_be_unique(): void
    {
        $first = $this->createGoodsReceiptContext();
        $second = $this->createGoodsReceiptContext();

        $this->createGoodsReceipt($first['delivery_receipt_id'], 'GRN-000003');

        $this->expectException(QueryException::class);

        $this->createGoodsReceipt($second['delivery_receipt_id'], 'GRN-000003');
    }

    public function test_global_uniqueness_of_identifiers_is_enforced(): void
    {
        $first = $this->createGoodsReceiptContext();
        $second = $this->createGoodsReceiptContext();

        $firstReceiptId = $this->createGoodsReceipt($first['delivery_receipt_id'], 'GRN-000004');
        $secondReceiptId = $this->createGoodsReceipt($second['delivery_receipt_id'], 'GRN-000005');

        $firstItemId = $this->createGoodsReceiptItem($firstReceiptId, $first['variant_id']);
        $secondItemId = $this->createGoodsReceiptItem($secondReceiptId, $second['variant_id']);

        DB::table('goods_receipt_item_identifiers')->insert([
            'goods_receipt_item_id' => $firstItemId,
            'serial_number' => 'SERIAL-UNIQ-001',
            'imei1' => 'IMEI1-UNIQ-001',
            'imei2' => 'IMEI2-UNIQ-001',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(QueryException::class);

        DB::table('goods_receipt_item_identifiers')->insert([
            'goods_receipt_item_id' => $secondItemId,
            'serial_number' => 'SERIAL-UNIQ-001',
            'imei1' => 'IMEI1-UNIQ-002',
            'imei2' => 'IMEI2-UNIQ-002',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_multiple_same_variant_items_are_allowed_within_one_receipt(): void
    {
        $context = $this->createGoodsReceiptContext();
        $receiptId = $this->createGoodsReceipt($context['delivery_receipt_id'], 'GRN-000006');

        $firstItemId = $this->createGoodsReceiptItem($receiptId, $context['variant_id']);
        $secondItemId = $this->createGoodsReceiptItem($receiptId, $context['variant_id']);

        $this->assertNotSame($firstItemId, $secondItemId);
        $this->assertSame(2, DB::table('goods_receipt_items')->where('goods_receipt_id', $receiptId)->count());
    }

    public function test_cascade_delete_from_goods_receipt_to_children(): void
    {
        $context = $this->createGoodsReceiptContext();
        $receiptId = $this->createGoodsReceipt($context['delivery_receipt_id'], 'GRN-000007');

        DB::table('goods_receipt_discrepancies')->insert([
            'goods_receipt_id' => $receiptId,
            'has_discrepancy' => true,
            'discrepancy_summary' => 'Screen mismatch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $itemId = $this->createGoodsReceiptItem($receiptId, $context['variant_id']);

        DB::table('goods_receipt_item_identifiers')->insert([
            'goods_receipt_item_id' => $itemId,
            'serial_number' => 'SERIAL-CASCADE-001',
            'imei1' => null,
            'imei2' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('goods_receipt_item_details')->insert([
            'goods_receipt_item_id' => $itemId,
            'package' => 'Box',
            'warranty' => '1 year',
            'cost_price' => 1000,
            'cash_price' => 1200,
            'srp' => 1300,
            'product_type' => 'Phone',
            'country_model' => 'PH',
            'with_charger' => true,
            'item_notes' => 'No issues',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('goods_receipts')->where('id', $receiptId)->delete();

        $this->assertDatabaseMissing('goods_receipt_discrepancies', ['goods_receipt_id' => $receiptId]);
        $this->assertDatabaseMissing('goods_receipt_items', ['id' => $itemId]);
        $this->assertDatabaseMissing('goods_receipt_item_identifiers', ['goods_receipt_item_id' => $itemId]);
        $this->assertDatabaseMissing('goods_receipt_item_details', ['goods_receipt_item_id' => $itemId]);
    }

    public function test_goods_receipt_schema_avoids_repeated_columns_across_related_tables(): void
    {
        $this->assertFalse(Schema::hasColumn('goods_receipts', 'serial_number'));
        $this->assertFalse(Schema::hasColumn('goods_receipts', 'imei1'));
        $this->assertFalse(Schema::hasColumn('goods_receipts', 'imei2'));
        $this->assertFalse(Schema::hasColumn('goods_receipts', 'discrepancy_summary'));
        $this->assertFalse(Schema::hasColumn('goods_receipt_items', 'cost_price'));
        $this->assertFalse(Schema::hasColumn('goods_receipt_items', 'cash_price'));
        $this->assertFalse(Schema::hasColumn('goods_receipt_items', 'srp'));
    }

    private function createGoodsReceiptContext(): array
    {
        $warehouse = Warehouse::create([
            'name' => 'GR Warehouse '.random_int(1, 99999),
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-GR-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'warehouse_id' => $warehouse->id,
            'required_at' => now()->addDay(),
            'purpose' => 'GR replenishment',
            'status' => 'pending',
        ]);

        $rfqId = DB::table('request_for_quotations')->insertGetId([
            'rfq_number' => 'RFQ-GR-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'stock_request_id' => $stockRequest->id,
            'stock_request_approval_id' => null,
            'created_by_id' => null,
            'status' => 'receiving_quotes',
            'selected_supplier_quote_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $supplier = Supplier::create([
            'supplier_code' => 'SUP-GR-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'legal_business_name' => 'Supplier GR '.random_int(1, 99999),
            'trade_name' => 'Supplier GR',
            'status' => 'Active',
        ]);

        $variant = $this->createProductVariant('GR');

        $rfqItemId = DB::table('request_for_quotation_items')->insertGetId([
            'request_for_quotation_id' => $rfqId,
            'variant_id' => $variant->id,
            'quantity' => 5,
            'description' => 'RFQ item for GR schema test',
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
            'quoted_quantity' => 5,
            'unit_price' => 900,
            'discount' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('request_for_quotations')->where('id', $rfqId)->update([
            'selected_supplier_quote_id' => $supplierQuoteId,
            'updated_at' => now(),
        ]);

        $paymentTermId = DB::table('payment_terms')->insertGetId([
            'name' => 'Net 30 GR '.random_int(1, 99999),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $shippingMethodId = DB::table('shipping_methods')->insertGetId([
            'name' => 'Ground GR '.random_int(1, 99999),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->insertGetId([
            'name' => 'GR User '.random_int(1, 99999),
            'username' => 'gr_user_'.random_int(1000, 999999),
            'email' => 'gr_user_'.random_int(1000, 999999).'@example.com',
            'password' => bcrypt('secret'),
            'status' => 'active',
            'created_by_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $purchaseOrderId = DB::table('purchase_orders')->insertGetId([
            'po_number' => 'PO-GR-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
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
            'dr_number' => 'DR-GR-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'reference_number' => 'REF-GR-'.random_int(1000, 9999),
            'date_received' => now()->subHour(),
            'date_encoded' => now(),
            'received_by_user_id' => $userId,
            'encoded_by_user_id' => $userId,
            'payment_term_id' => $paymentTermId,
            'box_count_declared' => 2,
            'box_count_received' => 2,
            'has_variance' => false,
            'variance_notes' => null,
            'dr_value' => 10000,
            'total_landed_cost' => 10100,
            'has_goods_receipt' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'delivery_receipt_id' => $deliveryReceiptId,
            'variant_id' => $variant->id,
        ];
    }

    private function createGoodsReceipt(int $deliveryReceiptId, string $grnNumber): int
    {
        return DB::table('goods_receipts')->insertGetId([
            'grn_number' => $grnNumber,
            'delivery_receipt_id' => $deliveryReceiptId,
            'status' => 'ongoing',
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createGoodsReceiptItem(int $goodsReceiptId, int $variantId): int
    {
        return DB::table('goods_receipt_items')->insertGetId([
            'goods_receipt_id' => $goodsReceiptId,
            'product_variant_id' => $variantId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createProductVariant(string $prefix): ProductVariant
    {
        $brand = ProductBrand::create(['name' => $prefix.' Brand '.random_int(1, 99999)]);
        $category = ProductCategory::create([
            'name' => $prefix.' Category '.random_int(1, 99999),
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => $prefix.' Subcategory '.random_int(1, 99999),
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => $prefix.' Model '.random_int(1, 99999),
        ]);
        $productMaster = ProductMaster::create([
            'master_sku' => $prefix.'-MASTER-'.random_int(100000, 999999),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'model_code' => $prefix.'-MC-'.random_int(100, 999),
            'sku' => $prefix.'-VAR-'.random_int(100000, 999999),
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
    }
}

