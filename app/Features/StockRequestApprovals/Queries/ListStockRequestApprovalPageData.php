<?php

namespace App\Features\StockRequestApprovals\Queries;

use App\Features\CompanyInfo\Support\CompanyInfoDataTransformer;
use App\Features\StockRequestApprovals\Support\StockRequestApprovalDataTransformer;
use App\Features\StockRequestApprovals\Support\StockRequestApprovalListQuery;
use App\Models\CompanyInfo;
use App\Models\StockRequest;
use App\Models\Warehouse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ListStockRequestApprovalPageData
{
    public function __construct(private readonly StockRequestApprovalListQuery $listQuery)
    {
    }

    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:pending,approved,declined,all'],
            'store_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'sort' => ['nullable', 'string', 'in:created_at,required_at,request_number,status,approval_date'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'pending';
        $storeId = isset($validated['store_id']) ? (int) $validated['store_id'] : null;
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $query = $this->listQuery->build($search, $statusTab, $storeId)
            ->with(StockRequestApprovalDataTransformer::RELATIONS)
            ->orderBy(StockRequestApprovalListQuery::SORTABLE_COLUMNS[$sort], $direction);

        $paginated = $query->paginate($perPage)->withQueryString();

        $variantIds = $paginated->getCollection()
            ->flatMap(fn (StockRequest $request) => $request->items->pluck('variant_id'))
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $avgCostByVariant = StockRequestApprovalDataTransformer::averageCostByVariant($variantIds);

        return [
            'requests' => $paginated->getCollection()
                ->map(fn (StockRequest $stockRequest) => StockRequestApprovalDataTransformer::transform($stockRequest, $avgCostByVariant))
                ->values()
                ->all(),
            'pagination' => $this->paginationMeta($paginated),
            'filters' => [
                'search' => $search,
                'status_tab' => $statusTab,
                'store_id' => $storeId,
                'sort' => $sort,
                'direction' => $direction,
                'page' => $paginated->currentPage(),
                'per_page' => $perPage,
            ],
            'kpis' => $this->kpis($search, $storeId),
            'warehouses' => Warehouse::query()
                ->select(['id', 'name', 'warehouse_type'])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Warehouse $warehouse) => [
                    'id' => $warehouse->id,
                    'name' => $warehouse->name,
                    'warehouse_type' => $warehouse->warehouse_type,
                ])
                ->values()
                ->all(),
            'companyInfo' => CompanyInfoDataTransformer::transform(CompanyInfo::query()->latest()->first()),
        ];
    }

    private function kpis(string $search, ?int $storeId): array
    {
        $base = $this->listQuery->build($search, 'all', $storeId);

        $pending = (clone $base)->where('stock_requests.status', 'pending')->count();
        $approved = (clone $base)->whereIn('stock_requests.status', ['rfq_created', 'stock_transfer_created', 'split_operation_created'])->count();
        $declined = (clone $base)->where('stock_requests.status', 'declined')->count();

        $pendingRequests = (clone $base)
            ->where('stock_requests.status', 'pending')
            ->with(['items:id,stock_request_id,variant_id,quantity'])
            ->get();

        $variantIds = $pendingRequests->flatMap(fn ($request) => $request->items->pluck('variant_id'))
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $avgCostByVariant = StockRequestApprovalDataTransformer::averageCostByVariant($variantIds);

        $totalPendingValue = $pendingRequests->sum(function (StockRequest $request) use ($avgCostByVariant): float {
            return $request->items->sum(function ($item) use ($avgCostByVariant): float {
                return ((float) ($avgCostByVariant[$item->variant_id] ?? 0)) * (int) $item->quantity;
            });
        });

        $urgentCount = (clone $base)
            ->where('stock_requests.status', 'pending')
            ->whereDate('stock_requests.required_at', '<=', now()->addDays(3)->toDateString())
            ->count();

        $approvalRate = $approved + $declined > 0
            ? round(($approved / ($approved + $declined)) * 100).'%'
            : 'N/A';

        return [
            'pending' => $pending,
            'approved' => $approved,
            'declined' => $declined,
            'total_pending_value' => $totalPendingValue,
            'urgent' => $urgentCount,
            'approval_rate' => $approvalRate,
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
