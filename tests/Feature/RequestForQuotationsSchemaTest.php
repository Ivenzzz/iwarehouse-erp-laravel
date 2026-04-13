<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationItem;
use App\Models\RequestForQuotationStatusHistory;
use App\Models\StockRequest;
use App\Models\StockRequestApproval;
use App\Models\StockRequestItem;
use App\Models\StockRequestStatusHistory;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RequestForQuotationsSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_rfq_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('request_for_quotations'));
        $this->assertTrue(Schema::hasTable('request_for_quotation_items'));
        $this->assertTrue(Schema::hasTable('request_for_quotation_supplier_quotes'));
        $this->assertTrue(Schema::hasTable('request_for_quotation_supplier_quote_items'));
        $this->assertTrue(Schema::hasTable('request_for_quotation_status_histories'));
        $this->assertTrue(Schema::hasTable('request_for_quotation_sources'));
    }

    public function test_multiple_rfqs_per_stock_request_are_allowed_for_consolidation(): void
    {
        [$stockRequest, $approval, $user] = $this->createApprovedStockRequest();

        RequestForQuotation::create([
            'rfq_number' => 'RFQ-000001',
            'stock_request_id' => $stockRequest->id,
            'stock_request_approval_id' => $approval->id,
            'created_by_id' => $user->id,
            'status' => 'draft',
        ]);

        $second = RequestForQuotation::create([
            'rfq_number' => 'RFQ-000002',
            'stock_request_id' => $stockRequest->id,
            'created_by_id' => $user->id,
            'status' => 'draft',
        ]);

        $this->assertNotNull($second->id);
    }

    public function test_one_quote_per_supplier_per_rfq_is_enforced(): void
    {
        [$rfq] = $this->createRfqWithItem();
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-A',
            'legal_business_name' => 'Supplier A, Inc.',
            'trade_name' => 'Supplier A',
        ]);

        \App\Models\RequestForQuotationSupplierQuote::create([
            'request_for_quotation_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'quote_date' => now(),
        ]);

        $this->expectException(QueryException::class);

        \App\Models\RequestForQuotationSupplierQuote::create([
            'request_for_quotation_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'quote_date' => now()->addMinute(),
        ]);
    }

    public function test_quote_item_uniqueness_per_supplier_quote_and_rfq_item_is_enforced(): void
    {
        [$rfq, $rfqItem] = $this->createRfqWithItem();
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-B',
            'legal_business_name' => 'Supplier B, Inc.',
            'trade_name' => 'Supplier B',
        ]);

        $quote = \App\Models\RequestForQuotationSupplierQuote::create([
            'request_for_quotation_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'quote_date' => now(),
        ]);

        \App\Models\RequestForQuotationSupplierQuoteItem::create([
            'supplier_quote_id' => $quote->id,
            'rfq_item_id' => $rfqItem->id,
            'quoted_quantity' => 1,
            'unit_price' => 100,
            'discount' => 0,
        ]);

        $this->expectException(QueryException::class);

        \App\Models\RequestForQuotationSupplierQuoteItem::create([
            'supplier_quote_id' => $quote->id,
            'rfq_item_id' => $rfqItem->id,
            'quoted_quantity' => 2,
            'unit_price' => 90,
            'discount' => 0,
        ]);
    }

    public function test_deleting_rfq_cascades_to_related_rows(): void
    {
        [$rfq, $rfqItem] = $this->createRfqWithItem();
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-C',
            'legal_business_name' => 'Supplier C, Inc.',
            'trade_name' => 'Supplier C',
        ]);

        $quote = \App\Models\RequestForQuotationSupplierQuote::create([
            'request_for_quotation_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'quote_date' => now(),
        ]);

        $quoteItem = \App\Models\RequestForQuotationSupplierQuoteItem::create([
            'supplier_quote_id' => $quote->id,
            'rfq_item_id' => $rfqItem->id,
            'quoted_quantity' => 1,
            'unit_price' => 100,
            'discount' => 0,
        ]);

        $history = RequestForQuotationStatusHistory::create([
            'request_for_quotation_id' => $rfq->id,
            'status' => 'draft',
            'occurred_at' => now(),
        ]);

        $rfq->delete();

        $this->assertDatabaseMissing('request_for_quotation_items', ['id' => $rfqItem->id]);
        $this->assertDatabaseMissing('request_for_quotation_supplier_quotes', ['id' => $quote->id]);
        $this->assertDatabaseMissing('request_for_quotation_supplier_quote_items', ['id' => $quoteItem->id]);
        $this->assertDatabaseMissing('request_for_quotation_status_histories', ['id' => $history->id]);
    }

    public function test_rfq_tables_are_normalized_without_duplicate_name_or_total_columns(): void
    {
        $this->assertFalse(Schema::hasColumn('request_for_quotations', 'selected_supplier_id'));
        $this->assertFalse(Schema::hasColumn('request_for_quotation_status_histories', 'changed_by_name'));
        $this->assertFalse(Schema::hasColumn('request_for_quotation_supplier_quote_items', 'variant_id'));
        $this->assertFalse(Schema::hasColumn('request_for_quotation_supplier_quote_items', 'total_price'));
    }

    public function test_selected_supplier_is_derived_from_selected_supplier_quote(): void
    {
        [$rfq, $rfqItem] = $this->createRfqWithItem();
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-D',
            'legal_business_name' => 'Supplier D, Inc.',
            'trade_name' => 'Supplier D',
        ]);

        $quote = \App\Models\RequestForQuotationSupplierQuote::create([
            'request_for_quotation_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'quote_date' => now(),
        ]);

        \App\Models\RequestForQuotationSupplierQuoteItem::create([
            'supplier_quote_id' => $quote->id,
            'rfq_item_id' => $rfqItem->id,
            'quoted_quantity' => 1,
            'unit_price' => 100,
            'discount' => 0,
        ]);

        $rfq->update(['selected_supplier_quote_id' => $quote->id]);

        $freshRfq = RequestForQuotation::query()->with('selectedSupplierQuote')->findOrFail($rfq->id);

        $this->assertSame($supplier->id, $freshRfq->selectedSupplierQuote->supplier_id);
    }

    private function createApprovedStockRequest(): array
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'RFQ Warehouse',
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-RFQ-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'warehouse_id' => $warehouse->id,
            'requestor_id' => $user->id,
            'required_at' => now()->addDay(),
            'status' => 'rfq_created',
        ]);

        $statusHistory = StockRequestStatusHistory::create([
            'stock_request_id' => $stockRequest->id,
            'status' => 'rfq_created',
            'actor_id' => $user->id,
            'occurred_at' => now(),
        ]);

        $approval = StockRequestApproval::create([
            'stock_request_id' => $stockRequest->id,
            'status_history_id' => $statusHistory->id,
            'approver_id' => $user->id,
            'approval_date' => now(),
            'action' => 'rfq_created',
        ]);

        return [$stockRequest, $approval, $user];
    }

    private function createRfqWithItem(): array
    {
        [$stockRequest, $approval, $user] = $this->createApprovedStockRequest();
        $variant = $this->createVariant();

        $rfq = RequestForQuotation::create([
            'rfq_number' => 'RFQ-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'stock_request_id' => $stockRequest->id,
            'stock_request_approval_id' => $approval->id,
            'created_by_id' => $user->id,
            'status' => 'draft',
        ]);

        StockRequestItem::create([
            'stock_request_id' => $stockRequest->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
            'reason' => 'Need stock',
        ]);

        $rfqItem = RequestForQuotationItem::create([
            'request_for_quotation_id' => $rfq->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
            'description' => 'Requested qty',
        ]);

        return [$rfq, $rfqItem];
    }

    private function createVariant(): ProductVariant
    {
        $brand = ProductBrand::create(['name' => 'RFQ Brand']);
        $category = ProductCategory::create(['name' => 'RFQ Category', 'parent_category_id' => null]);
        $subcategory = ProductCategory::create(['name' => 'RFQ Subcategory', 'parent_category_id' => $category->id]);
        $model = ProductModel::create(['brand_id' => $brand->id, 'model_name' => 'RFQ Model']);
        $productMaster = ProductMaster::create([
            'master_sku' => 'RFQ-MASTER-001',
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'RFQ Variant',
            'sku' => 'RFQ-VARIANT-001',
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
    }
}
