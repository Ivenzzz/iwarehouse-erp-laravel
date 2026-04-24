<?php

namespace App\Features\ThreeWayMatching\Actions;

use App\Features\ThreeWayMatching\Queries\ThreeWayMatchingFilters;
use App\Features\ThreeWayMatching\Queries\ThreeWayMatchingQuery;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportThreeWayMatchingCsv
{
    public function __construct(
        private readonly ThreeWayMatchingFilters $filters,
        private readonly ThreeWayMatchingQuery $query,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->filters->fromRequest($request);
        $rows = $this->query->matchesForStatus($filters['status']);

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'PO Number',
                'Supplier',
                'Status',
                'Payment State',
                'Discrepancies',
                'PO Subtotal',
                'Invoice Total',
                'PO Total',
            ]);

            foreach ($rows as $match) {
                fputcsv($out, [
                    $match['po']['po_number'] ?? null,
                    $match['supplierName'] ?? null,
                    $match['status'] ?? null,
                    $match['paymentState'] ?? null,
                    $match['discrepancyCount'] ?? 0,
                    $match['totals']['poSubtotal'] ?? 0,
                    $match['totals']['invoiceTotal'] ?? 0,
                    $match['totals']['poTotal'] ?? 0,
                ]);
            }

            fclose($out);
        }, 'three-way-matching.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
