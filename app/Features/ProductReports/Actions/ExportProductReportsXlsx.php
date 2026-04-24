<?php

namespace App\Features\ProductReports\Actions;

use App\Features\ProductReports\Queries\ProductReportQuery;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportProductReportsXlsx
{
    public function __construct(
        private readonly ProductReportQuery $productReportQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->productReportQuery->filtersFromRequest($request);
        $data = $this->productReportQuery->exportRows($filters);

        return response()->streamDownload(function () use ($data): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray($this->headers($data['paymentTypeNames']), null, 'A1');

            $rowNumber = 2;
            foreach ($data['rows'] as $row) {
                $sheet->fromArray($this->rowValues($row, $data['paymentTypeNames']), null, 'A'.$rowNumber);
                $rowNumber++;
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }, 'product_reports_'.now()->format('Y-m-d').'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function headers(array $paymentTypeNames): array
    {
        return array_merge([
            'Branch', 'Customer Name', 'Contact No', 'DR#', 'OR#', 'Brand', 'Model',
            'Product', 'Category', 'Subcategory', 'Condition', 'Cost', 'Color',
        ], $paymentTypeNames, [
            'Supplier', 'Supplier Contact', 'Quantity', 'Barcode', 'Value', 'Sales Person',
            'Date (M-D-Y)', 'Time', 'Week Number', 'Month', 'Year',
        ]);
    }

    private function rowValues(array $row, array $paymentTypeNames): array
    {
        $paymentValues = [];
        foreach ($paymentTypeNames as $name) {
            $paymentValues[] = isset($row['paymentAmounts'][$name]) ? (float) $row['paymentAmounts'][$name] : '';
        }

        return array_merge([
            $row['branch'],
            $row['customerName'],
            $row['contactNo'],
            $row['drNumber'],
            $row['orNumber'],
            $row['brand'],
            $row['model'],
            $row['product'],
            $row['category'],
            $row['subcategory'],
            $row['condition'],
            (float) $row['cost'],
            $row['color'],
        ], $paymentValues, [
            $row['supplierName'],
            $row['supplierContact'],
            (int) $row['quantity'],
            $row['barcode'],
            (float) $row['value'],
            $row['salesPerson'],
            $row['date'],
            $row['time'],
            (int) $row['weekNumber'],
            $row['month'],
            (int) $row['year'],
        ]);
    }
}
