<?php

namespace App\Features\RequestForQuotations\Actions;

use App\Features\RequestForQuotations\Support\RequestForQuotationListQuery;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportRequestForQuotationsCsv
{
    public function __construct(private readonly RequestForQuotationListQuery $listQuery)
    {
    }

    public function handle(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status_tab' => ['nullable', 'string', 'in:all,draft,receiving_quotes,converted_to_po,consolidated'],
            'sort' => ['nullable', 'string', 'in:created_at,rfq_number,status,required_at'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $statusTab = $validated['status_tab'] ?? 'all';
        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';

        $rows = $this->listQuery
            ->build($search, $statusTab)
            ->with(['stockRequest:id,request_number,required_at', 'createdBy:id,name,email'])
            ->orderBy(RequestForQuotationListQuery::SORTABLE_COLUMNS[$sort], $direction)
            ->get();

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['RFQ Number', 'Stock Request', 'Status', 'Required Date', 'Created By', 'Created At']);

            foreach ($rows as $rfq) {
                fputcsv($out, [
                    $rfq->rfq_number,
                    $rfq->stockRequest?->request_number,
                    $rfq->status,
                    optional($rfq->stockRequest?->required_at)?->toDateString(),
                    $rfq->createdBy?->name ?? $rfq->createdBy?->email,
                    optional($rfq->created_at)?->toDateTimeString(),
                ]);
            }

            fclose($out);
        }, 'request-for-quotations.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
