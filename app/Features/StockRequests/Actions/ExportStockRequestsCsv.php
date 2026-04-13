<?php

namespace App\Features\StockRequests\Actions;

use App\Features\StockRequests\Support\StockRequestDataTransformer;
use App\Features\StockRequests\Support\StockRequestListQuery;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportStockRequestsCsv
{
    public function __construct(private readonly StockRequestListQuery $stockRequestListQuery)
    {
    }

    public function handle(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:All,Pending,Approved,Rejected'],
            'sort' => ['nullable', 'string', 'in:created_at,required_at,request_number,status,purpose'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'All';
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';

        $query = $this->stockRequestListQuery->build($search, $statusTab)
            ->with(StockRequestDataTransformer::RELATIONS)
            ->orderBy(StockRequestListQuery::SORTABLE_COLUMNS[$sort], $direction);

        $fileName = 'stock-requests-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Request Number',
                'Branch',
                'Requested By',
                'Required At',
                'Purpose',
                'Status',
                'Total Items',
                'Created At',
            ]);

            $query->chunk(100, function ($requests) use ($handle) {
                foreach ($requests as $request) {
                    $row = StockRequestDataTransformer::transform($request);
                    fputcsv($handle, [
                        $row['request_number'],
                        $row['branch_name'],
                        $row['requested_by'],
                        $row['required_at'],
                        $row['purpose'],
                        $row['status'],
                        $row['total_items'],
                        $row['created_at'],
                    ]);
                }
            });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
