<?php

namespace App\Features\ProductReports\Queries;

use Illuminate\Http\Request;

class ListProductReportPageData
{
    public function __construct(
        private readonly ProductReportQuery $productReportQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $filters = $this->productReportQuery->filtersFromRequest($request);
        $data = $this->productReportQuery->pageData($filters);

        return [
            'rows' => $data['rows'],
            'pagination' => $data['pagination'],
            'summary' => $data['summary'],
            'options' => $data['options'],
            'paymentTypeNames' => $data['paymentTypeNames'],
            'filters' => $data['filters'],
        ];
    }
}
