<?php

namespace App\Features\SalesProfitTracker\Queries;

use Illuminate\Http\Request;

class ListSalesProfitTrackerPageData
{
    public function __construct(
        private readonly SalesProfitTrackerQuery $salesProfitTrackerQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $filters = $this->salesProfitTrackerQuery->filtersFromRequest($request);

        return $this->salesProfitTrackerQuery->pageData($filters);
    }
}
