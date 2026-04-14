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

class DeliveryReceiptsSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_delivery_receipt_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('delivery_receipts'));
        $this->assertTrue(Schema::hasTable('delivery_receipt_logistics'));
        $this->assertTrue(Schema::hasTable('delivery_receipt_uploads'));
        $this->assertTrue(Schema::hasTable('delivery_receipt_box_photos'));
        $this->assertTrue(Schema::hasTable('delivery_receipt_items'));
        $this->assertTrue(Schema::hasTable('delivery_receipt_item_specs'));
    }

    public function test_dr_number_must_be_unique_per_supplier(): void
    {
        $context = $this->createDeliveryReceiptContext();

        $this->createDeliveryReceipt($context, 'DR-000001', $context['supplier_id']);

        $this->expectException(QueryException::class);

        $this->createDeliveryReceipt($context, 'DR-000001', $context['supplier_id']);
    }

    public function test_duplicate_dr_number_is_allowed_for_different_suppliers(): void
    {
        $context = $this->createDeliveryReceiptContext();

        $otherSupplierId = Supplier::create([
            'supplier_code' => 'SUP-DR-ALT-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'legal_business_name' => 'Supplier DR Alt '.random_int(1, 99999),
            'trade_name' => 'Supplier DR Alt',
            'status' => 'Active',
        ])->id;

        $this->createDeliveryReceipt($context, 'DR-000002', $context['supplier_id']);
        $this->createDeliveryReceipt($context, 'DR-000002', $otherSupplierId);

        $this->assertSame(2, DB::table('delivery_receipts')->where('dr_number', 'DR-000002')->count());
    }

    public function test_one_po_can_link_to_multiple_delivery_receipts(): void
    {
        $context = $this->createDeliveryReceiptContext();

        $poId = $this->createPurchaseOrder($context, 'PO-DR-000001');

        $firstDrId = $this->createDeliveryReceipt($context, 'DR-000003', $context['supplier_id'], $poId);
        $secondDrId = $this->createDeliveryReceipt($context, 'DR-000004', $context['supplier_id'], $poId);

        $this->assertNotSame($firstDrId, $secondDrId);
        $this->assertSame(2, DB::table('delivery_receipts')->where('po_id', $poId)->count());
    }

    public function test_delivery_receipt_allows_null_po_for_direct_purchase(): void
    {
        $context = $this->createDeliveryReceiptContext();

        $drId = $this->createDeliveryReceipt($context, 'DR-000005', $context['supplier_id'], null);

        $this->assertDatabaseHas('delivery_receipts', [
            'id' => $drId,
            'po_id' => null,
        ]);
    }

    public function test_uploads_support_one_to_one_upload_record_and_many_box_photos(): void
    {
        $context = $this->createDeliveryReceiptContext();
        $drId = $this->createDeliveryReceipt($context, 'DR-000006', $context['supplier_id']);

        $uploadId = DB::table('delivery_receipt_uploads')->insertGetId([
            'delivery_receipt_id' => $drId,
            'vendor_dr_url' => 'https://example.com/vendor-dr.pdf',
            'waybill_url' => 'https://example.com/waybill.pdf',
            'freight_invoice_url' => null,
            'driver_id_url' => null,
            'purchase_file_url' => null,
            'uploads_complete' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('delivery_receipt_box_photos')->insert([
            [
                'delivery_receipt_upload_id' => $uploadId,
                'photo_url' => 'https://example.com/photos/box-1.jpg',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'delivery_receipt_upload_id' => $uploadId,
                'photo_url' => 'https://example.com/photos/box-2.jpg',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->assertSame(2, DB::table('delivery_receipt_box_photos')->where('delivery_receipt_upload_id', $uploadId)->count());

        $this->expectException(QueryException::class);

        DB::table('delivery_receipt_uploads')->insert([
            'delivery_receipt_id' => $drId,
            'vendor_dr_url' => null,
            'waybill_url' => null,
            'freight_invoice_url' => null,
            'driver_id_url' => null,
            'purchase_file_url' => null,
            'uploads_complete' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_item_specs_are_one_to_one_without_purchase_order_item_link(): void
    {
        $context = $this->createDeliveryReceiptContext();

        $poId = $this->createPurchaseOrder($context, 'PO-DR-000002');
        $drId = $this->createDeliveryReceipt($context, 'DR-000007', $context['supplier_id'], $poId);

        $itemId = DB::table('delivery_receipt_items')->insertGetId([
            'delivery_receipt_id' => $drId,
            'product_master_id' => $context['product_master_id'],
            'expected_quantity' => 2,
            'actual_quantity' => 2,
            'unit_cost' => 900,
            'cash_price' => 1000,
            'srp_price' => 1100,
            'total_value' => 1800,
            'variance_flag' => false,
            'variance_notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('delivery_receipt_item_specs')->insert([
            'delivery_receipt_item_id' => $itemId,
            'ram' => '8GB',
            'rom' => '256GB',
            'condition' => 'Brand New',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $secondItemId = DB::table('delivery_receipt_items')->insertGetId([
            'delivery_receipt_id' => $drId,
            'product_master_id' => $context['second_product_master_id'],
            'expected_quantity' => 1,
            'actual_quantity' => 1,
            'unit_cost' => 850,
            'cash_price' => 950,
            'srp_price' => 1050,
            'total_value' => 850,
            'variance_flag' => false,
            'variance_notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseHas('delivery_receipt_items', [
            'id' => $secondItemId,
        ]);

        $this->expectException(QueryException::class);

        DB::table('delivery_receipt_item_specs')->insert([
            'delivery_receipt_item_id' => $itemId,
            'ram' => '16GB',
            'rom' => '512GB',
            'condition' => 'Brand New',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createDeliveryReceiptContext(): array
    {
        $warehouse = Warehouse::create([
            'name' => 'DR Warehouse '.random_int(1, 99999),
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-DR-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'warehouse_id' => $warehouse->id,
            'required_at' => now()->addDay(),
            'purpose' => 'DR replenishment',
            'status' => 'pending',
        ]);

        $rfqId = DB::table('request_for_quotations')->insertGetId([
            'rfq_number' => 'RFQ-DR-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'stock_request_id' => $stockRequest->id,
            'stock_request_approval_id' => null,
            'created_by_id' => null,
            'status' => 'receiving_quotes',
            'selected_supplier_quote_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $supplier = Supplier::create([
            'supplier_code' => 'SUP-DR-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'legal_business_name' => 'Supplier DR '.random_int(1, 99999),
            'trade_name' => 'Supplier DR',
            'status' => 'Active',
        ]);

        $productMaster = $this->createProductMaster('DR');
        $secondProductMaster = $this->createProductMaster('DR2');

        $rfqItemId = DB::table('request_for_quotation_items')->insertGetId([
            'request_for_quotation_id' => $rfqId,
            'variant_id' => $this->createProductVariant($productMaster->id)->id,
            'quantity' => 5,
            'description' => 'RFQ item for DR schema test',
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

        $supplierQuoteItemId = DB::table('request_for_quotation_supplier_quote_items')->insertGetId([
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
            'name' => 'Net 30 DR '.random_int(1, 99999),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $shippingMethodId = DB::table('shipping_methods')->insertGetId([
            'name' => 'Ground DR '.random_int(1, 99999),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->insertGetId([
            'name' => 'DR User '.random_int(1, 99999),
            'username' => 'dr_user_'.random_int(1000, 999999),
            'email' => 'dr_user_'.random_int(1000, 999999).'@example.com',
            'password' => bcrypt('secret'),
            'status' => 'active',
            'created_by_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'rfq_id' => $rfqId,
            'supplier_id' => $supplier->id,
            'selected_supplier_quote_id' => $supplierQuoteId,
            'supplier_quote_item_id' => $supplierQuoteItemId,
            'payment_term_id' => $paymentTermId,
            'shipping_method_id' => $shippingMethodId,
            'received_by_user_id' => $userId,
            'encoded_by_user_id' => $userId,
            'product_master_id' => $productMaster->id,
            'second_product_master_id' => $secondProductMaster->id,
        ];
    }

    private function createPurchaseOrder(array $context, string $poNumber): int
    {
        return DB::table('purchase_orders')->insertGetId([
            'po_number' => $poNumber,
            'rfq_id' => $context['rfq_id'],
            'supplier_id' => $context['supplier_id'],
            'selected_supplier_quote_id' => $context['selected_supplier_quote_id'],
            'shipping_method_id' => $context['shipping_method_id'],
            'payment_term_id' => $context['payment_term_id'],
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'status' => 'pending',
            'has_delivery_receipt' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createDeliveryReceipt(array $context, string $drNumber, int $supplierId, ?int $poId = null): int
    {
        return DB::table('delivery_receipts')->insertGetId([
            'supplier_id' => $supplierId,
            'po_id' => $poId,
            'dr_number' => $drNumber,
            'reference_number' => 'REF-'.random_int(1000, 9999),
            'date_received' => now()->subHour(),
            'date_encoded' => now(),
            'received_by_user_id' => $context['received_by_user_id'],
            'encoded_by_user_id' => $context['encoded_by_user_id'],
            'payment_term_id' => $context['payment_term_id'],
            'box_count_declared' => 10,
            'box_count_received' => 10,
            'has_variance' => false,
            'variance_notes' => null,
            'dr_value' => 12000,
            'total_landed_cost' => 12300,
            'has_goods_receipt' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createProductMaster(string $prefix): ProductMaster
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

        return ProductMaster::create([
            'master_sku' => $prefix.'-MASTER-'.random_int(100000, 999999),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
    }

    private function createProductVariant(int $productMasterId): ProductVariant
    {
        return ProductVariant::create([
            'product_master_id' => $productMasterId,
            'variant_name' => 'DR Variant '.random_int(1, 99999),
            'sku' => 'DR-VARIANT-'.random_int(100000, 999999),
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
    }
}
