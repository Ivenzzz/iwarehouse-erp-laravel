<?php

namespace App\Features\PurchaseOrders\Actions;

use App\Features\PurchaseOrders\Support\PurchaseOrderListQuery;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportPurchaseOrdersCsv
{
    public function __construct(private readonly PurchaseOrderListQuery $listQuery)
    {
    }

    public function handle(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:all,pending,approved,rejected'],
            'sort' => ['nullable', 'string', 'in:created_at,po_number,status,expected_delivery_date,supplier_name'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'all';
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';

        $rows = $this->listQuery
            ->build($search, $statusTab)
            ->with(['supplier:id,legal_business_name,trade_name', 'rfq:id,rfq_number', 'paymentTerm:id,name'])
            ->orderBy(PurchaseOrderListQuery::SORTABLE_COLUMNS[$sort], $direction)
            ->get();

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['PO Number', 'RFQ Number', 'Supplier', 'Expected Delivery', 'Status', 'Payment Terms', 'Created At']);
            foreach ($rows as $po) {
                fputcsv($out, [
                    $po->po_number,
                    $po->rfq?->rfq_number,
                    $po->supplier?->legal_business_name ?? $po->supplier?->trade_name,
                    optional($po->expected_delivery_date)->toDateString(),
                    $po->status,
                    $po->paymentTerm?->name,
                    optional($po->created_at)->toDateTimeString(),
                ]);
            }
            fclose($out);
        }, 'purchase-orders.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}

