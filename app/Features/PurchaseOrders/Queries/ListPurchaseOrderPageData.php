<?php

namespace App\Features\PurchaseOrders\Queries;

use App\Features\PurchaseOrders\Support\PurchaseOrderDataTransformer;
use App\Features\PurchaseOrders\Support\PurchaseOrderListQuery;
use App\Models\CompanyInfo;
use App\Models\PaymentTerm;
use App\Models\PurchaseOrder;
use App\Models\ShippingMethod;
use App\Models\Supplier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ListPurchaseOrderPageData
{
    public function __construct(private readonly PurchaseOrderListQuery $listQuery)
    {
    }

    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:all,pending,approved,rejected'],
            'sort' => ['nullable', 'string', 'in:created_at,po_number,status,expected_delivery_date,supplier_name'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'all';
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $paginator = $this->listQuery
            ->build($search, $statusTab)
            ->with(PurchaseOrderDataTransformer::RELATIONS)
            ->orderBy(PurchaseOrderListQuery::SORTABLE_COLUMNS[$sort], $direction)
            ->paginate($perPage)
            ->withQueryString();

        return [
            'purchase_orders' => $paginator->getCollection()
                ->map(fn (PurchaseOrder $po) => PurchaseOrderDataTransformer::transform($po))
                ->values()
                ->all(),
            'pagination' => $this->paginationMeta($paginator),
            'filters' => [
                'search' => $search,
                'status_tab' => $statusTab,
                'sort' => $sort,
                'direction' => $direction,
                'page' => $paginator->currentPage(),
                'per_page' => $perPage,
            ],
            'kpis' => $this->kpis(),
            'suppliers' => Supplier::query()
                ->with('contact:id,supplier_id,email,mobile')
                ->select(['id', 'legal_business_name', 'trade_name', 'address'])
                ->orderBy('legal_business_name')
                ->get()
                ->map(fn (Supplier $supplier) => [
                    'id' => $supplier->id,
                    'master_profile' => [
                        'legal_business_name' => $supplier->legal_business_name,
                        'trade_name' => $supplier->trade_name,
                    ],
                    'legal_tax_compliance' => [
                        'registered_address' => $supplier->address,
                    ],
                    'contact_details' => [
                        'email' => $supplier->contact?->email,
                        'mobile_landline' => $supplier->contact?->mobile,
                    ],
                ])
                ->values()
                ->all(),
            'payment_terms' => PaymentTerm::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->toArray(),
            'shipping_methods' => ShippingMethod::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->toArray(),
            'company_info' => CompanyInfo::query()->first(),
        ];
    }

    private function kpis(): array
    {
        $base = PurchaseOrder::query();

        return [
            'total' => (clone $base)->count(),
            'pending' => (clone $base)->where('status', 'pending')->count(),
            'approved' => (clone $base)->where('status', 'approved')->count(),
            'rejected' => (clone $base)->where('status', 'rejected')->count(),
        ];
    }

    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }
}

