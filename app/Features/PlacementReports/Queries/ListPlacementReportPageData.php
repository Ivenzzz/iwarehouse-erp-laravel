<?php

namespace App\Features\PlacementReports\Queries;

use App\Features\PlacementReports\Support\PlacementReportQuery;
use Illuminate\Http\Request;

class ListPlacementReportPageData
{
    public function __construct(
        private readonly PlacementReportQuery $placementReportQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $filters = $this->placementReportQuery->filtersFromRequest($request);
        $page = $this->placementReportQuery->masterRowsPage($filters);

        return [
            'filters' => $filters,
            'warehouses' => $this->placementReportQuery->warehouses(),
            'summary' => $this->placementReportQuery->summary($filters),
            'footerTotals' => $this->placementReportQuery->footerTotals($filters),
            'rows' => $page['rows'],
            'pagination' => $page['pagination'],
        ];
    }
}
