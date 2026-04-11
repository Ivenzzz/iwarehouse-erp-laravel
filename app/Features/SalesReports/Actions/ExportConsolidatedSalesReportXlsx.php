<?php

namespace App\Features\SalesReports\Actions;

use App\Features\SalesReports\Support\SalesReportQuery;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportConsolidatedSalesReportXlsx
{
    public function __construct(
        private readonly SalesReportQuery $salesReportQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
        ]);

        $detail = $this->salesReportQuery->consolidatedDetail(
            $validated['date'],
            (int) $validated['warehouse_id'],
        );

        $headers = array_merge([
            'Customer Name',
            'Contact Number',
            'DR#',
            'OR#',
            'Product',
            'Condition',
            'Warranty',
            'Category',
            'Subcategory',
            'Qty',
            'Barcode',
            'Value',
            'Sale Person',
            'Date',
            'Actual Cash Paid',
            'Discount',
            'TF Paid in Cash',
            'NON CASH PAYMENT',
            'Reference Number',
            'Loan Term',
            'MDR',
            'Receivable',
        ], $detail['dynamicPaymentColumns']);

        $filename = 'sales_report_'.$validated['date'].'_'.$validated['warehouse_id'].'.xlsx';

        return response()->streamDownload(function () use ($detail, $headers): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray($headers, null, 'A1');

            $rowNumber = 2;
            foreach ($detail['ledgerRows'] as $row) {
                $values = [
                    $row['customerName'],
                    $row['contactNumber'],
                    $row['drNumber'],
                    $row['orNumber'],
                    $row['productName'],
                    $row['condition'],
                    $row['warranty'],
                    $row['categoryName'] ?? null,
                    $row['subcategoryName'] ?? null,
                    $row['quantity'],
                    $row['barcode'],
                    $row['value'],
                    $row['salesPersonName'],
                    $row['date'],
                    $row['actualCashPaid'],
                    $row['discountAmount'],
                    $row['terminalFeePaidInCash'] ?? null,
                    $row['nonCashPaymentAmount'],
                    $row['nonCashReferenceNumber'],
                    $row['loanTermLabel'],
                    $row['mdrAmount'] ?? null,
                    $row['receivableAmount'] ?? null,
                ];

                foreach ($detail['dynamicPaymentColumns'] as $column) {
                    $values[] = $row['dynamicPaymentAmounts'][$column] ?? null;
                }

                $sheet->fromArray($values, null, 'A'.$rowNumber);
                $rowNumber++;
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
