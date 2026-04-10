<?php

namespace App\Features\Sales\Queries;

use App\Features\Sales\Support\SalesQuery;
use Illuminate\Http\Request;

class ListSalesPageData
{
    public function __construct(
        private readonly SalesQuery $salesQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $filters = $this->salesQuery->filtersFromRequest($request);

        return [
            'filters' => $filters,
            'warehouses' => $this->salesQuery->warehouses(),
            'rows' => $this->salesQuery->rows($filters),
        ];
    }
}
