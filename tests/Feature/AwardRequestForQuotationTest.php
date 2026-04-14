<?php

namespace Tests\Feature;

use App\Features\RequestForQuotations\Actions\AwardRequestForQuotation;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationItem;
use App\Models\RequestForQuotationSupplierQuote;
use App\Models\RequestForQuotationSupplierQuoteItem;
use App\Models\StockRequest;
use App\Models\StockRequestApproval;
use App\Models\StockRequestStatusHistory;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AwardRequestForQuotationTest extends TestCase
{
    use RefreshDatabase;

    public function test_award_writes_purchase_order_item_specs_from_variant_snapshot(): void
    {
        [$rfq, $quote, $quoteItem] = $this->createAwardContext();

        $action = app(AwardRequestForQuotation::class);
        $poNumber = $action->handle($rfq->id, $quote->id, null);

        $this->assertNotEmpty($poNumber);

        $purchaseOrder = DB::table('purchase_orders')
            ->where('selected_supplier_quote_id', $quote->id)
            ->first();
        $this->assertNotNull($purchaseOrder);

        $purchaseOrderItem = DB::table('purchase_order_items')
            ->where('purchase_order_id', $purchaseOrder->id)
            ->where('supplier_quote_item_id', $quoteItem->id)
            ->first();
        $this->assertNotNull($purchaseOrderItem);

        $this->assertSame(1, DB::table('purchase_order_item_specs')
            ->where('purchase_order_item_id', $purchaseOrderItem->id)
            ->count());

        $this->assertDatabaseHas('purchase_order_item_specs', [
            'purchase_order_item_id' => $purchaseOrderItem->id,
            'ram' => '8GB',
            'rom' => '256GB',
            'condition' => 'Brand New',
        ]);
    }

    private function createAwardContext(): array
    {
        $user = User::factory()->create();
        $warehouse = Warehouse::create([
            'name' => 'Award Warehouse',
            'warehouse_type' => 'store',
        ]);

        $stockRequest = StockRequest::create([
            'request_number' => 'SR-AWARD-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
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

        $variant = $this->createVariant();
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-AWARD-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'legal_business_name' => 'Award Supplier '.random_int(1, 99999),
            'trade_name' => 'Award Supplier',
            'status' => 'Active',
        ]);

        $rfq = RequestForQuotation::create([
            'rfq_number' => 'RFQ-AWARD-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'stock_request_id' => $stockRequest->id,
            'stock_request_approval_id' => $approval->id,
            'created_by_id' => $user->id,
            'status' => 'receiving_quotes',
        ]);

        $rfqItem = RequestForQuotationItem::create([
            'request_for_quotation_id' => $rfq->id,
            'variant_id' => $variant->id,
            'quantity' => 3,
            'description' => 'Award RFQ item',
        ]);

        $quote = RequestForQuotationSupplierQuote::create([
            'request_for_quotation_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'quote_date' => now(),
            'tax_amount' => 0,
            'shipping_cost' => 0,
            'payment_terms' => 'Net 30',
            'eta' => now()->addDays(7)->toDateString(),
        ]);

        $quoteItem = RequestForQuotationSupplierQuoteItem::create([
            'supplier_quote_id' => $quote->id,
            'rfq_item_id' => $rfqItem->id,
            'quoted_quantity' => 3,
            'unit_price' => 1000,
            'discount' => 2,
        ]);

        return [$rfq, $quote, $quoteItem];
    }

    private function createVariant(): ProductVariant
    {
        $brand = ProductBrand::create(['name' => 'Award Brand '.random_int(1, 99999)]);
        $category = ProductCategory::create(['name' => 'Award Category '.random_int(1, 99999), 'parent_category_id' => null]);
        $subcategory = ProductCategory::create(['name' => 'Award Subcategory '.random_int(1, 99999), 'parent_category_id' => $category->id]);
        $model = ProductModel::create(['brand_id' => $brand->id, 'model_name' => 'Award Model '.random_int(1, 99999)]);
        $productMaster = ProductMaster::create([
            'master_sku' => 'AWARD-MASTER-'.random_int(100000, 999999),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        return ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'sku' => 'AWARD-VARIANT-'.random_int(100000, 999999),
            'condition' => 'Brand New',
            'ram' => '8GB',
            'rom' => '256GB',
            'is_active' => true,
        ]);
    }
}
