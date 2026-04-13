<?php

namespace App\Features\StockRequestApprovals\Actions;

use App\Features\StockRequestApprovals\Support\StockRequestApprovalDataTransformer;
use App\Features\StockRequestApprovals\Support\StockRequestApprovalListQuery;
use App\Models\StockRequest;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportStockRequestApprovalsCsv
{
    public function __construct(private readonly StockRequestApprovalListQuery $listQuery)
    {
    }

    public function handle(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:pending,approved,declined,all'],
            'store_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'sort' => ['nullable', 'string', 'in:created_at,required_at,request_number,status,approval_date'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'pending';
        $storeId = isset($validated['store_id']) ? (int) $validated['store_id'] : null;
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';

        $rows = $this->listQuery->build($search, $statusTab, $storeId)
            ->with(StockRequestApprovalDataTransformer::RELATIONS)
            ->orderBy(StockRequestApprovalListQuery::SORTABLE_COLUMNS[$sort], $direction)
            ->get();

        $variantIds = $rows->flatMap(fn (StockRequest $requestModel) => $requestModel->items->pluck('variant_id'))
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
        $avgCostByVariant = StockRequestApprovalDataTransformer::averageCostByVariant($variantIds);

        $filename = 'stock-request-approvals-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($rows, $avgCostByVariant): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Request Number', 'Store', 'Requestor', 'Purpose', 'Status', 'Required At', 'Approved At', 'Estimated Value']);

            foreach ($rows as $requestModel) {
                $row = StockRequestApprovalDataTransformer::transform($requestModel, $avgCostByVariant);
                fputcsv($handle, [
                    $row['request_number'],
                    $row['destination_warehouse_name'],
                    $row['requester_full_name'],
                    $row['purpose'],
                    $row['status'],
                    $row['required_date'],
                    $row['approved_date'],
                    number_format((float) ($row['total_estimated_value'] ?? 0), 2, '.', ''),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
