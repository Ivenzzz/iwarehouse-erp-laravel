<?php

namespace App\Features\RequestForQuotations\Queries;

use App\Features\CompanyInfo\Support\CompanyInfoDataTransformer;
use App\Features\RequestForQuotations\Support\RequestForQuotationDataTransformer;
use App\Features\RequestForQuotations\Support\RequestForQuotationListQuery;
use App\Models\CompanyInfo;
use App\Models\RequestForQuotation;
use App\Models\Supplier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ListRequestForQuotationPageData
{
    public function __construct(private readonly RequestForQuotationListQuery $listQuery)
    {
    }

    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:all,draft,receiving_quotes,converted_to_po,consolidated'],
            'sort' => ['nullable', 'string', 'in:created_at,rfq_number,status,required_at'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'all';
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $query = $this->listQuery
            ->build($search, $statusTab)
            ->with(RequestForQuotationDataTransformer::RELATIONS)
            ->orderBy(RequestForQuotationListQuery::SORTABLE_COLUMNS[$sort], $direction);

        $paginator = $query->paginate($perPage)->withQueryString();

        $suppliers = Supplier::query()
            ->select('id', 'legal_business_name', 'trade_name')
            ->orderBy('legal_business_name')
            ->get();

        return [
            'rfqs' => $paginator->getCollection()->map(fn (RequestForQuotation $rfq) => RequestForQuotationDataTransformer::transform($rfq))->values()->all(),
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
            'suppliers_count' => $suppliers->count(),
            'suppliers' => $suppliers->map(fn (Supplier $s) => [
                'id' => $s->id,
                'master_profile' => [
                    'legal_business_name' => $s->legal_business_name,
                    'trade_name' => $s->trade_name,
                ],
            ])->values()->all(),
            'companyInfo' => CompanyInfoDataTransformer::transform(CompanyInfo::query()->latest()->first()),
        ];
    }

    private function kpis(): array
    {
        $base = RequestForQuotation::query();

        return [
            'total_rfqs' => (clone $base)->count(),
            'receiving_quotes_count' => (clone $base)->where('status', 'receiving_quotes')->count(),
            'converted_count' => (clone $base)->where('status', 'converted_to_po')->count(),
            'avg_turnaround' => 0,
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
