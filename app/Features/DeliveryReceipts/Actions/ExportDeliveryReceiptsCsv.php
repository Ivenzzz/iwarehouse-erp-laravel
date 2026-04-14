<?php

namespace App\Features\DeliveryReceipts\Actions;

use App\Features\DeliveryReceipts\Support\DeliveryReceiptListQuery;
use App\Models\DeliveryReceipt;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportDeliveryReceiptsCsv
{
    public function __construct(private readonly DeliveryReceiptListQuery $listQuery)
    {
    }

    public function handle(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'dr_search' => ['nullable', 'string', 'max:100'],
            'dr_status' => ['nullable', 'string', 'in:all,ready_for_warehouse,warehouse_encoding,completed,with_variance'],
            'dr_sort' => ['nullable', 'string', 'in:date_received,dr_number,supplier_name,total_landed_cost,status'],
            'dr_direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $rows = $this->listQuery->deliveryReceipts(
            trim((string) ($validated['dr_search'] ?? '')),
            (string) ($validated['dr_status'] ?? 'all'),
            (string) ($validated['dr_sort'] ?? 'date_received'),
            (string) ($validated['dr_direction'] ?? 'desc'),
        )
            ->with(['supplier:id,legal_business_name,trade_name'])
            ->get();

        return response()->streamDownload(function () use ($rows) {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, ['DR Number', 'Reference Number', 'PO Number', 'Supplier', 'Date Received', 'DR Value', 'Total Landed Cost', 'Has Variance', 'Has Goods Receipt']);

            /** @var DeliveryReceipt $dr */
            foreach ($rows as $dr) {
                fputcsv($fh, [
                    $dr->dr_number,
                    $dr->reference_number,
                    $dr->po_id,
                    $dr->supplier?->trade_name ?? $dr->supplier?->legal_business_name,
                    optional($dr->date_received)->toDateTimeString(),
                    $dr->dr_value,
                    $dr->total_landed_cost,
                    $dr->has_variance ? 'Yes' : 'No',
                    $dr->has_goods_receipt ? 'Yes' : 'No',
                ]);
            }
            fclose($fh);
        }, 'delivery-receipts-'.now()->format('Ymd_His').'.csv', ['Content-Type' => 'text/csv']);
    }
}
