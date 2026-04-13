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

class PurchaseOrdersSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_order_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('payment_terms'));
        $this->assertTrue(Schema::hasTable('shipping_methods'));
        $this->assertTrue(Schema::hasTable('purchase_orders'));
        $this->assertTrue(Schema::hasTable('purchase_order_items'));
        $this->assertTrue(Schema::hasTable('purchase_order_item_specs'));
        $this->assertTrue(Schema::hasTable('purchase_order_status_histories'));
        $this->assertTrue(Schema::hasTable('purchase_order_approvals'));
        $this->assertTrue(Schema::hasTable('purchase_order_approval_histories'));
        $this->assertTrue(Schema::hasTable('purchase_order_payables'));
        $this->assertTrue(Schema::hasTable('purchase_order_payable_documents'));
    }

    public function test_po_number_must_be_unique(): void
    {
        $context = $this->createPurchaseOrderContext();

        $this->createPurchaseOrder($context, 'PO-000001');

        $this->expectException(QueryException::class);

        $this->createPurchaseOrder($context, 'PO-000001');
    }

    public function test_one_purchase_order_per_selected_supplier_quote_is_enforced(): void
    {
        $context = $this->createPurchaseOrderContext();

        $this->createPurchaseOrder($context, 'PO-000002');

        $this->expectException(QueryException::class);

        DB::table('purchase_orders')->insert([
            'po_number' => 'PO-000003',
            'rfq_id' => $context['rfq_id'],
            'supplier_id' => $context['supplier_id'],
            'selected_supplier_quote_id' => $context['selected_supplier_quote_id'],
            'shipping_method_id' => $context['shipping_method_id'],
            'payment_term_id' => $context['payment_term_id'],
            'expected_delivery_date' => now()->toDateString(),
            'status' => 'pending',
            'has_delivery_receipt' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_purchase_order_item_requires_valid_supplier_quote_item_fk(): void
    {
        $context = $this->createPurchaseOrderContext();
        $purchaseOrderId = $this->createPurchaseOrder($context, 'PO-000004');

        $this->expectException(QueryException::class);

        DB::table('purchase_order_items')->insert([
            'purchase_order_id' => $purchaseOrderId,
            'supplier_quote_item_id' => 999999,
            'quantity' => 1,
            'unit_price' => 1000,
            'discount' => 0,
            'description' => 'Invalid FK test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_multiple_payable_documents_are_allowed_per_payable(): void
    {
        $context = $this->createPurchaseOrderContext();
        $purchaseOrderId = $this->createPurchaseOrder($context, 'PO-000005');

        $payableId = DB::table('purchase_order_payables')->insertGetId([
            'purchase_order_id' => $purchaseOrderId,
            'has_paid' => true,
            'paid_by_id' => null,
            'paid_at' => now(),
            'notes' => 'Paid in full',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('purchase_order_payable_documents')->insert([
            [
                'purchase_order_payable_id' => $payableId,
                'document_url' => 'https://example.com/docs/1.pdf',
                'document_name' => 'Receipt 1',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'purchase_order_payable_id' => $payableId,
                'document_url' => 'https://example.com/docs/2.pdf',
                'document_name' => 'Receipt 2',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->assertSame(2, DB::table('purchase_order_payable_documents')->where('purchase_order_payable_id', $payableId)->count());
    }

    public function test_purchase_order_tables_do_not_store_denormalized_actor_names(): void
    {
        $this->assertFalse(Schema::hasColumn('purchase_order_status_histories', 'changed_by_name'));
        $this->assertFalse(Schema::hasColumn('purchase_order_approvals', 'approver_name'));
        $this->assertFalse(Schema::hasColumn('purchase_order_payables', 'paid_by'));
    }

    private function createPurchaseOrderContext(): array
    {
        $warehouse = Warehouse::create([
            'name' => 'PO Warehouse',
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-PO-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'warehouse_id' => $warehouse->id,
            'required_at' => now()->addDay(),
            'purpose' => 'Replenishment',
            'status' => 'pending',
        ]);

        $rfqId = DB::table('request_for_quotations')->insertGetId([
            'rfq_number' => 'RFQ-PO-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'stock_request_id' => $stockRequest->id,
            'stock_request_approval_id' => null,
            'created_by_id' => null,
            'status' => 'receiving_quotes',
            'selected_supplier_quote_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $supplier = Supplier::create([
            'supplier_code' => 'SUP-PO-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'legal_business_name' => 'Supplier PO '.random_int(1, 99999),
            'trade_name' => 'Supplier PO',
            'status' => 'Active',
        ]);

        $variant = $this->createProductVariant();

        $rfqItemId = DB::table('request_for_quotation_items')->insertGetId([
            'request_for_quotation_id' => $rfqId,
            'variant_id' => $variant->id,
            'quantity' => 5,
            'description' => 'RFQ item for PO schema test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $supplierQuoteId = DB::table('request_for_quotation_supplier_quotes')->insertGetId([
            'request_for_quotation_id' => $rfqId,
            'supplier_id' => $supplier->id,
            'quote_date' => now(),
            'tax_amount' => 0,
            'shipping_cost' => 0,
            'payment_terms' => '30 days',
            'eta' => now()->addDays(7)->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $supplierQuoteItemId = DB::table('request_for_quotation_supplier_quote_items')->insertGetId([
            'supplier_quote_id' => $supplierQuoteId,
            'rfq_item_id' => $rfqItemId,
            'quoted_quantity' => 5,
            'unit_price' => 1200,
            'discount' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('request_for_quotations')->where('id', $rfqId)->update([
            'selected_supplier_quote_id' => $supplierQuoteId,
            'updated_at' => now(),
        ]);

        $paymentTermId = DB::table('payment_terms')->insertGetId([
            'name' => 'Net 30 '.random_int(1, 99999),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $shippingMethodId = DB::table('shipping_methods')->insertGetId([
            'name' => 'Ground '.random_int(1, 99999),
            'is_active' => true,
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

    private function createProductVariant(): ProductVariant
    {
        $brand = ProductBrand::create(['name' => 'PO Brand '.random_int(1, 99999)]);
        $category = ProductCategory::create([
            'name' => 'PO Category '.random_int(1, 99999),
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'PO Subcategory '.random_int(1, 99999),
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'PO Model '.random_int(1, 99999),
        ]);
        $productMaster = ProductMaster::create([
            'master_sku' => 'PO-MASTER-'.random_int(100000, 999999),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'PO Variant '.random_int(1, 99999),
            'sku' => 'PO-VARIANT-'.random_int(100000, 999999),
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
    }
}
