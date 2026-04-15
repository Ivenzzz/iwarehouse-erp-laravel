<?php

namespace App\Features\DeliveryReceipts\Queries;

use App\Features\DeliveryReceipts\Support\DeliveryReceiptDataTransformer;
use App\Features\DeliveryReceipts\Support\DeliveryReceiptListQuery;
use App\Features\PurchaseOrders\Support\PurchaseOrderDataTransformer;
use App\Models\DeliveryReceipt;
use App\Models\PaymentTerm;
use App\Models\ProductBrand;
use App\Models\ProductMaster;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ListDeliveryReceiptPageData
{
    public function __construct(private readonly DeliveryReceiptListQuery $listQuery)
    {
    }

    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'active_tab' => ['nullable', 'string', 'in:confirmed_pos,all_drs'],
            'incoming_search' => ['nullable', 'string', 'max:100'],
            'incoming_time_filter' => ['nullable', 'string', 'in:all,this_week,overdue'],
            'incoming_warehouse_filter' => ['nullable', 'string', 'max:30'],
            'incoming_page' => ['nullable', 'integer', 'min:1'],
            'incoming_per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
            'incoming_sort' => ['nullable', 'string', 'in:expected_delivery_date,po_number,supplier_name,status'],
            'incoming_direction' => ['nullable', 'string', 'in:asc,desc'],
            'dr_search' => ['nullable', 'string', 'max:100'],
            'dr_status' => ['nullable', 'string', 'in:all,ready_for_warehouse,warehouse_encoding,completed,with_variance'],
            'dr_page' => ['nullable', 'integer', 'min:1'],
            'dr_per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
            'dr_sort' => ['nullable', 'string', 'in:date_received,dr_number,supplier_name,total_landed_cost,status'],
            'dr_direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $incomingSearch = trim((string) ($validated['incoming_search'] ?? ''));
        $incomingTimeFilter = (string) ($validated['incoming_time_filter'] ?? 'all');
        $incomingWarehouseFilter = (string) ($validated['incoming_warehouse_filter'] ?? 'all');
        $incomingPerPage = (int) ($validated['incoming_per_page'] ?? 10);
        $incomingSort = (string) ($validated['incoming_sort'] ?? 'expected_delivery_date');
        $incomingDirection = (string) ($validated['incoming_direction'] ?? 'asc');

        $drSearch = trim((string) ($validated['dr_search'] ?? ''));
        $drStatus = (string) ($validated['dr_status'] ?? 'all');
        $drPerPage = (int) ($validated['dr_per_page'] ?? 10);
        $drSort = (string) ($validated['dr_sort'] ?? 'date_received');
        $drDirection = (string) ($validated['dr_direction'] ?? 'desc');

        $incomingPaginator = $this->listQuery->incomingPurchaseOrders(
            $incomingSearch,
            $incomingTimeFilter,
            $incomingWarehouseFilter,
            $incomingSort,
            $incomingDirection
        )->with(PurchaseOrderDataTransformer::RELATIONS)
            ->paginate($incomingPerPage, ['*'], 'incoming_page')
            ->withQueryString();

        $drPaginator = $this->listQuery->deliveryReceipts(
            $drSearch,
            $drStatus,
            $drSort,
            $drDirection
        )->with(DeliveryReceiptDataTransformer::RELATIONS)
            ->paginate($drPerPage, ['*'], 'dr_page')
            ->withQueryString();

        return [
            'incoming_pos' => [
                'data' => $incomingPaginator->getCollection()->map(fn ($po) => PurchaseOrderDataTransformer::transform($po))->values()->all(),
                'pagination' => $this->pagination($incomingPaginator),
                'filters' => [
                    'search' => $incomingSearch,
                    'time_filter' => $incomingTimeFilter,
                    'warehouse_filter' => $incomingWarehouseFilter,
                    'sort' => $incomingSort,
                    'direction' => $incomingDirection,
                ],
                'kpis' => $this->incomingKpis($incomingSearch, $incomingTimeFilter),
            ],
            'delivery_receipts' => [
                'data' => $drPaginator->getCollection()->map(fn ($dr) => DeliveryReceiptDataTransformer::transform($dr))->values()->all(),
                'pagination' => $this->pagination($drPaginator),
                'filters' => [
                    'search' => $drSearch,
                    'status' => $drStatus,
                    'sort' => $drSort,
                    'direction' => $drDirection,
                ],
                'kpis' => $this->drKpis($drSearch, $drStatus),
            ],
            'lookups' => [
                'warehouses' => Warehouse::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'warehouse_type', 'street', 'city', 'province', 'zip_code', 'country'])
                    ->map(fn (Warehouse $warehouse) => [
                        'id' => $warehouse->id,
                        'name' => $warehouse->name,
                        'warehouse_type' => $warehouse->warehouse_type,
                        'address' => [
                            'street' => $warehouse->street,
                            'city' => $warehouse->city,
                            'province' => $warehouse->province,
                            'zip_code' => $warehouse->zip_code,
                            'country' => $warehouse->country,
                        ],
                    ])->values()->all(),
                'suppliers' => Supplier::query()->with('contact:id,supplier_id,email,mobile')->orderBy('legal_business_name')->get(['id', 'supplier_code', 'legal_business_name', 'trade_name', 'address'])
                    ->map(fn (Supplier $s) => [
                        'id' => $s->id,
                        'supplier_code' => $s->supplier_code,
                        'master_profile' => [
                            'legal_business_name' => $s->legal_business_name,
                            'trade_name' => $s->trade_name,
                        ],
                        'legal_tax_compliance' => [
                            'registered_address' => $s->address,
                        ],
                        'contact_details' => [
                            'email' => $s->contact?->email,
                            'mobile_landline' => $s->contact?->mobile,
                        ],
                    ])->values()->all(),
                'product_masters' => ProductMaster::query()
                    ->with(['model:id,brand_id,model_name', 'model.brand:id,name', 'subcategory:id,name'])
                    ->orderBy('id', 'desc')
                    ->get()
                    ->map(fn (ProductMaster $pm) => [
                        'id' => $pm->id,
                        'master_sku' => $pm->master_sku,
                        'name' => $pm->product_name,
                        'model' => $pm->model?->model_name,
                        'brand_id' => $pm->model?->brand_id,
                        'brand_name' => $pm->model?->brand?->name,
                        'category_name' => null,
                        'subcategory_name' => $pm->subcategory?->name,
                    ])->values()->all(),
                'brands' => ProductBrand::query()->orderBy('name')->get(['id', 'name'])->toArray(),
                'payment_terms' => PaymentTerm::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (PaymentTerm $term) => [
                        'id' => $term->id,
                        'name' => $term->name,
                    ])->values()->all(),
                'current_user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'full_name' => $request->user()->name,
                    'email' => $request->user()->email,
                ] : null,
            ],
            'active_tab' => (string) ($validated['active_tab'] ?? 'confirmed_pos'),
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

    private function incomingKpis(string $search, string $timeFilter): array
    {
        $query = PurchaseOrder::query()->where('status', 'approved')->where('has_delivery_receipt', false);

        if ($timeFilter === 'overdue') {
            $query->whereDate('expected_delivery_date', '<', now()->toDateString());
        } elseif ($timeFilter === 'this_week') {
            $query->whereBetween('expected_delivery_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]);
        }

        if ($search !== '') {
            $query->where('po_number', 'like', '%'.$search.'%');
        }

        $rows = (clone $query)->with('items:id,purchase_order_id,quantity,unit_price,discount')->get();
        $totalIncomingValue = $rows->sum(function ($po) {
            return $po->items->sum(function ($item) {
                $gross = (float) $item->quantity * (float) $item->unit_price;
                $discountPercent = min(100, max(0, (float) $item->discount));
                return max(0, $gross * (1 - $discountPercent / 100));
            });
        });

        return [
            'count' => (clone $query)->count(),
            'overdue' => PurchaseOrder::query()->where('status', 'approved')->where('has_delivery_receipt', false)->whereDate('expected_delivery_date', '<', now()->toDateString())->count(),
            'value' => (float) $totalIncomingValue,
        ];
    }

    private function drKpis(string $search, string $status): array
    {
        $query = DeliveryReceipt::query();
        if ($status === 'completed') {
            $query->where('has_goods_receipt', true);
        } elseif ($status === 'with_variance') {
            $query->where('has_variance', true);
        } elseif ($status === 'ready_for_warehouse' || $status === 'warehouse_encoding') {
            $query->where('has_goods_receipt', false);
        }

        if ($search !== '') {
            $query->where('dr_number', 'like', '%'.$search.'%');
        }

        return [
            'count' => (clone $query)->count(),
            'pending' => DeliveryReceipt::query()->where('has_goods_receipt', false)->count(),
            'value' => (float) (clone $query)->sum('total_landed_cost'),
        ];
    }
}

