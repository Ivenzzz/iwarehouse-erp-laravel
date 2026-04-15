<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Features\GoodsReceipts\Support\GoodsReceiptDataTransformer;
use App\Features\GoodsReceipts\Support\GoodsReceiptListQuery;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportGoodsReceiptsCsv
{
    public function __construct(private readonly GoodsReceiptListQuery $listQuery)
    {
    }

    public function handle(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'grn_search' => ['nullable', 'string', 'max:100'],
            'grn_supplier' => ['nullable', 'string', 'max:30'],
            'grn_sort' => ['nullable', 'string', 'in:created_at,grn_number,status,supplier_name'],
            'grn_direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $search = trim((string) ($validated['grn_search'] ?? ''));
        $supplier = (string) ($validated['grn_supplier'] ?? 'all');
        $sort = (string) ($validated['grn_sort'] ?? 'created_at');
        $direction = (string) ($validated['grn_direction'] ?? 'desc');

        $rows = $this->listQuery
            ->goodsReceipts($search, $supplier, $sort, $direction)
            ->with(GoodsReceiptDataTransformer::$RELATIONS)
            ->get(['goods_receipts.*']);

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['GRN Number', 'DR Number', 'Supplier', 'Status', 'Item Count', 'Total Cost', 'Created At']);

            foreach ($rows as $grn) {
                $data = GoodsReceiptDataTransformer::transformReceipt($grn);
                fputcsv($out, [
                    $data['grn_number'],
                    data_get($data, 'receipt_info.dr_number', ''),
                    data_get($data, 'receipt_info.supplier_name', ''),
                    $data['status'],
                    count($data['items']),
                    (float) ($data['total_amount'] ?? 0),
                    $data['created_date'],
                ]);
            }

            fclose($out);
        }, 'goods-receipts.csv');
    }
}
