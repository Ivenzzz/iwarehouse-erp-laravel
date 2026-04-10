<?php

namespace App\Features\SalesReports\Queries;

use App\Features\SalesReports\Support\SalesReportQuery;
use Illuminate\Http\Request;

class ListSalesReportPageData
{
    public function __construct(
        private readonly SalesReportQuery $salesReportQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $filters = $this->salesReportQuery->filtersFromRequest($request);

        return [
            'filters' => $filters,
            'warehouses' => $this->salesReportQuery->warehouses(),
            'individualRows' => $this->salesReportQuery->individualRows($filters),
            'consolidatedRows' => $this->salesReportQuery->consolidatedRows($filters),
            'calendar' => $this->salesReportQuery->calendar($filters),
        ];
    }
}
