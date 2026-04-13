<?php

namespace App\Features\StockRequests\Queries;

use App\Features\StockRequests\Support\StockRequestDataTransformer;
use App\Features\StockRequests\Support\StockRequestListQuery;
use App\Models\StockRequest;
use App\Models\Warehouse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ListStockRequestPageData
{
    public function __construct(private readonly StockRequestListQuery $stockRequestListQuery)
    {
    }

    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:All,Pending,Approved,Rejected'],
            'sort' => ['nullable', 'string', 'in:created_at,required_at,request_number,status,purpose'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,50,100,1000'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'All';
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $listQuery = $this->stockRequestListQuery->build($search, $statusTab)
            ->with(StockRequestDataTransformer::RELATIONS)
            ->orderBy(StockRequestListQuery::SORTABLE_COLUMNS[$sort], $direction);

        $paginated = $listQuery->paginate($perPage)->withQueryString();

        return [
            'requests' => $paginated->getCollection()
                ->map(fn (StockRequest $stockRequest) => StockRequestDataTransformer::transform($stockRequest))
                ->values()
                ->all(),
            'pagination' => $this->paginationMeta($paginated),
            'filters' => [
                'search' => $search,
                'status_tab' => $statusTab,
                'sort' => $sort,
                'direction' => $direction,
                'page' => $paginated->currentPage(),
                'per_page' => $perPage,
            ],
            'kpis' => $this->kpis($search, $statusTab),
            'warehouses' => Warehouse::query()
                ->select(['id', 'name'])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Warehouse $warehouse) => ['id' => $warehouse->id, 'name' => $warehouse->name])
                ->values()
                ->all(),
            'purposes' => StockRequest::PURPOSES,
        ];
    }

    private function kpis(string $search, string $statusTab): array
    {
        $query = $this->stockRequestListQuery->build($search, $statusTab);

        return [
            'total' => (clone $query)->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'approved' => (clone $query)->whereIn('status', StockRequestListQuery::TAB_STATUS_MAP['Approved'])->count(),
            'rejected' => (clone $query)->where('status', 'declined')->count(),
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
