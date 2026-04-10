<?php

namespace App\Features\PlacementReports\Actions;

use App\Features\PlacementReports\Support\PlacementReportQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportPlacementReportXlsx
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

        return response()->streamDownload(function () use ($rows, $warehouses): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray($this->headers($warehouses), null, 'A1');

            $rowNumber = 2;
            foreach ($rows as $row) {
                $sheet->fromArray($this->rowValues($row, $warehouses), null, 'A'.$rowNumber);
                $rowNumber++;
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }, 'placement_report_'.now()->format('Y-m-d').'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
            (float) $row['avgSellOutPerDay'],
            $row['inventoryLifeDays'] !== null ? (float) $row['inventoryLifeDays'] : 'N/A',
            $row['suggestedPoQty'],
        ]);
    }
}
