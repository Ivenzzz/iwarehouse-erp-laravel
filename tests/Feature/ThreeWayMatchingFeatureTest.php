<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\PurchaseOrder;
use App\Models\ShippingMethod;
use App\Models\Supplier;
use App\Models\User;
use App\Models\PaymentTerm;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ThreeWayMatchingFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_three_way_matching_index_returns_server_props(): void
    {
        $user = User::factory()->create();
        $this->createPurchaseOrderGraph('PO-TWM-0001', false);

        $this->actingAs($user)
            ->get(route('three-way-matching.index', ['status' => 'unpaid', 'page' => 1, 'per_page' => 10]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ThreeWayMatching')
                ->where('filters.status', 'unpaid')
                ->where('filters.page', 1)
                ->where('filters.per_page', 10)
                ->where('pagination.page', 1)
                ->where('pagination.per_page', 10)
                ->where('pagination.total', 1)
                ->has('matches', 1)
            );
    }

    public function test_three_way_matching_sanitizes_invalid_filters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('three-way-matching.index', [
                'status' => 'bad-status',
                'page' => -5,
                'per_page' => 999,
            ]))
            ->assertSessionHasErrors(['status', 'page', 'per_page']);
    }

    public function test_three_way_matching_csv_export_reuses_status_filter(): void
    {
        $user = User::factory()->create();
        $this->createPurchaseOrderGraph('PO-TWM-UNPAID', false);
        $this->createPurchaseOrderGraph('PO-TWM-PAID', true);

        $response = $this->actingAs($user)
            ->get(route('three-way-matching.export.csv', ['status' => 'paid']));

        $response->assertOk();
        $response->assertDownload('three-way-matching.csv');

        $content = $response->streamedContent();
        $this->assertStringContainsString('PO-TWM-PAID', $content);
        $this->assertStringNotContainsString('PO-TWM-UNPAID', $content);
    }

    public function test_mark_paid_updates_payable_and_stores_document(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $po = $this->createPurchaseOrderGraph('PO-TWM-PAY', false);

        $response = $this->actingAs($user)->post(route('three-way-matching.mark-paid', $po->id), [
            'invoice_document' => UploadedFile::fake()->create('invoice.pdf', 120, 'application/pdf'),
            'notes' => 'Paid via bank transfer',
            'status' => 'unpaid',
            'page' => 1,
            'per_page' => 20,
        ]);

        $response->assertRedirect(route('three-way-matching.index', [
            'status' => 'unpaid',
            'page' => 1,
            'per_page' => 20,
            'selected_match_id' => $po->id,
        ]));

        $this->assertDatabaseHas('purchase_order_payables', [
            'purchase_order_id' => $po->id,
            'has_paid' => 1,
            'paid_by_id' => $user->id,
            'notes' => 'Paid via bank transfer',
        ]);

        $payableId = (int) DB::table('purchase_order_payables')->where('purchase_order_id', $po->id)->value('id');
        $this->assertDatabaseCount('purchase_order_payable_documents', 1);
        $this->assertDatabaseHas('purchase_order_payable_documents', [
            'purchase_order_payable_id' => $payableId,
            'document_name' => 'invoice.pdf',
        ]);
    }

    private function createPurchaseOrderGraph(string $poNumber, bool $paid): PurchaseOrder
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-TWM-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'legal_business_name' => 'ThreeWay Supplier '.random_int(100, 999),
            'trade_name' => 'ThreeWay Supplier',
            'status' => 'Active',
        ]);

        $shippingMethod = ShippingMethod::create([
            'name' => 'Ground '.random_int(100, 999),
            'is_active' => true,
        ]);

        $paymentTerm = PaymentTerm::create([
            'name' => 'Net 30 '.random_int(100, 999),
            'is_active' => true,
        ]);

        $brand = ProductBrand::create(['name' => 'TWM Brand '.random_int(100, 999)]);
        $category = ProductCategory::create(['name' => 'TWM Cat '.random_int(100, 999)]);
        $subcategory = ProductCategory::create(['name' => 'TWM Sub '.random_int(100, 999), 'parent_category_id' => $category->id]);
        $model = ProductModel::create(['brand_id' => $brand->id, 'model_name' => 'TWM Model '.random_int(100, 999)]);
        $master = ProductMaster::create([
            'master_sku' => 'TWM-'.random_int(1000, 9999),
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);

        $po = PurchaseOrder::query()->create([
            'po_number' => $poNumber,
            'rfq_id' => null,
            'supplier_id' => $supplier->id,
            'selected_supplier_quote_id' => null,
            'shipping_method_id' => $shippingMethod->id,
            'payment_term_id' => $paymentTerm->id,
            'expected_delivery_date' => now()->addDays(3)->toDateString(),
            'status' => 'approved',
            'has_delivery_receipt' => false,
        ]);

        $itemId = DB::table('purchase_order_items')->insertGetId([
            'purchase_order_id' => $po->id,
            'product_master_id' => $master->id,
            'quantity' => 2,
            'unit_price' => 1000,
            'discount' => 0,
            'description' => 'Three-way item',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('purchase_order_item_specs')->insert([
            'purchase_order_item_id' => $itemId,
            'model_code' => 'TWM-CODE',
            'ram' => '8GB',
            'rom' => '256GB',
            'condition' => 'Brand New',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('purchase_order_payables')->insert([
            'purchase_order_id' => $po->id,
            'has_paid' => $paid,
            'paid_by_id' => null,
            'paid_at' => null,
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $po;
    }
}
