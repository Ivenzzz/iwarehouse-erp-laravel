<?php

namespace App\Features\PlacementReports\Actions;

use App\Features\PlacementReports\Support\PlacementReportQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportPlacementReportCsv
{
    public function __construct(
        private readonly PlacementReportQuery $placementReportQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->placementReportQuery->filtersFromRequest($request);
        $warehouses = $this->placementReportQuery->warehouses();
        $rows = $this->placementReportQuery->exportVariantRows($filters);

        $callback = function () use ($rows, $warehouses): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, $this->headers($warehouses));

            foreach ($rows as $row) {
                fputcsv($stream, $this->rowValues($row, $warehouses));
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'placement_report_'.now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function headers(Collection $warehouses): array
    {
        return array_merge([
            'Product',
            'Variant',
            'Condition',
            'Total Items',
        ], $warehouses->pluck('name')->all(), [
            'Valuation',
            '15 Day Sell Out',
            '30 Day Sell Out',
            'Avg Sell Out/Day',
            'Inventory Life (Days)',
            'Suggested PO Qty',
        ]);
    }

    private function rowValues(array $row, Collection $warehouses): array
    {
        return array_merge([
            $row['product'],
            $row['variant'],
            $row['condition'],
            $row['totalItems'],
        ], $warehouses->map(fn (array $warehouse) => $row['warehouses'][$warehouse['id']] ?? 0)->all(), [
            $row['valuation'],
            $row['sold15'],
            $row['sold30'],
            number_format((float) $row['avgSellOutPerDay'], 2, '.', ''),
            $row['inventoryLifeDays'] !== null ? number_format((float) $row['inventoryLifeDays'], 1, '.', '') : 'N/A',
            $row['suggestedPoQty'],
        ]);
    }
}
