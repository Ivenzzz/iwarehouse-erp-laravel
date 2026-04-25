<?php

namespace App\Features\GoodsReceipts\Queries;

use App\Features\GoodsReceipts\Support\GoodsReceiptDataTransformer;
use App\Features\GoodsReceipts\Support\GoodsReceiptListQuery;
use App\Models\CompanyInfo;
use App\Models\Supplier;
use App\Models\Warehouse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ListGoodsReceiptPageData
{
    public function __construct(private readonly GoodsReceiptListQuery $listQuery)
    {
    }

    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'active_tab' => ['nullable', 'string', 'in:delivery-receipts,goods-receipts'],
            'dr_search' => ['nullable', 'string', 'max:100'],
            'dr_page' => ['nullable', 'integer', 'min:1'],
            'dr_per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
            'dr_sort' => ['nullable', 'string', 'in:date_received,dr_number,supplier_name,status'],
            'dr_direction' => ['nullable', 'string', 'in:asc,desc'],
            'grn_search' => ['nullable', 'string', 'max:100'],
            'grn_supplier' => ['nullable', 'string', 'max:30'],
            'grn_page' => ['nullable', 'integer', 'min:1'],
            'grn_per_page' => ['nullable', 'integer', 'in:10,25,50,100,500,1000,5000'],
            'grn_sort' => ['nullable', 'string', 'in:created_at,grn_number,status,supplier_name'],
            'grn_direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $drSearch = trim((string) ($validated['dr_search'] ?? ''));
        $drPerPage = (int) ($validated['dr_per_page'] ?? 25);
        $drSort = (string) ($validated['dr_sort'] ?? 'date_received');
        $drDirection = (string) ($validated['dr_direction'] ?? 'desc');

        $grnSearch = trim((string) ($validated['grn_search'] ?? ''));
        $grnSupplier = (string) ($validated['grn_supplier'] ?? 'all');
        $grnPerPage = (int) ($validated['grn_per_page'] ?? 100);
        $grnSort = (string) ($validated['grn_sort'] ?? 'created_at');
        $grnDirection = (string) ($validated['grn_direction'] ?? 'desc');

        $pendingDrPaginator = $this->listQuery
            ->pendingDeliveryReceipts($drSearch, $drSort, $drDirection)
            ->with([
                'supplier:id,supplier_code,legal_business_name,trade_name',
                'supplier.contact:id,supplier_id,email,mobile',
                'purchaseOrder:id,po_number',
                'items:id,delivery_receipt_id,product_master_id,expected_quantity,actual_quantity,unit_cost,cash_price,srp_price',
                'items.spec:id,delivery_receipt_item_id,model_code,ram,rom,condition',
                'items.productMaster:id,model_id,master_sku,subcategory_id',
                'items.productMaster.model:id,brand_id,model_name',
                'items.productMaster.model.brand:id,name',
                'logistics:id,delivery_receipt_id,logistics_company,waybill_number,destination',
            ])
            ->paginate($drPerPage, ['*'], 'dr_page')
            ->withQueryString();

        $grnPaginator = $this->listQuery
            ->goodsReceipts($grnSearch, $grnSupplier, $grnSort, $grnDirection)
            ->with(GoodsReceiptDataTransformer::$DETAIL_RELATIONS)
            ->paginate($grnPerPage, ['goods_receipts.*'], 'grn_page')
            ->withQueryString();

        return [
            'goods_receipt_page' => [
                'pending_delivery_receipts' => [
                    'data' => $pendingDrPaginator->getCollection()
                        ->map(fn ($dr) => GoodsReceiptDataTransformer::transformPendingDeliveryReceipt($dr))
                        ->values()->all(),
                    'pagination' => $this->pagination($pendingDrPaginator),
                    'filters' => [
                        'search' => $drSearch,
                        'sort' => $drSort,
                        'direction' => $drDirection,
                    ],
                ],
                'goods_receipts' => [
                    'data' => $grnPaginator->getCollection()
                        ->map(fn ($grn) => GoodsReceiptDataTransformer::transformReceiptSummary($grn))
                        ->values()->all(),
                    'pagination' => $this->pagination($grnPaginator),
                    'filters' => [
                        'search' => $grnSearch,
                        'supplier' => $grnSupplier,
                        'sort' => $grnSort,
                        'direction' => $grnDirection,
                    ],
                ],
                'lookups' => $this->lookups($request),
                'active_tab' => (string) ($validated['active_tab'] ?? 'delivery-receipts'),
            ],
        ];
    }

    private function lookups(Request $request): array
    {
        return [
            'current_user' => $request->user() ? [
                'id' => $request->user()->id,
                'full_name' => $request->user()->name,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ] : null,
            'suppliers' => Supplier::query()->with('contact:id,supplier_id,email,mobile')->orderBy('legal_business_name')->get(['id', 'supplier_code', 'legal_business_name', 'trade_name'])
                ->map(fn (Supplier $s) => [
                    'id' => $s->id,
                    'supplier_code' => $s->supplier_code,
                    'master_profile' => [
                        'legal_business_name' => $s->legal_business_name,
                        'trade_name' => $s->trade_name,
                    ],
                    'contact_details' => [
                        'email' => $s->contact?->email,
                        'mobile_landline' => $s->contact?->mobile,
                    ],
                ])->values()->all(),
            'warehouses' => Warehouse::query()->orderBy('name')->get(['id', 'name', 'warehouse_type'])
                ->map(fn (Warehouse $w) => [
                    'id' => $w->id,
                    'name' => $w->name,
                    'warehouse_type' => $w->warehouse_type,
                    'parent_warehouse_id' => null,
                ])->values()->all(),
            'company_info' => CompanyInfo::query()->first(),
        ];
    }

    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }
}
