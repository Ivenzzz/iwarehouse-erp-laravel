<?php

namespace App\Features\Sales\Actions;

use App\Features\Sales\Support\SalesQuery;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportSalesXlsx
{
    public function __construct(
        private readonly SalesQuery $salesQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->salesQuery->filtersFromRequest($request);
        $rows = $this->salesQuery->exportRows($filters);

        return response()->streamDownload(function () use ($rows): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            $headers = [
                'OR Number',
                'DR Number',
                'Date/Time',
                'Branch',
                'Customer',
                'Staff',
                'Payment Methods',
                'Amount',
            ];

            $sheet->fromArray($headers, null, 'A1');

            $rowNumber = 2;
            foreach ($rows as $row) {
                $sheet->fromArray(array_values($row), null, 'A'.$rowNumber);
                $rowNumber++;
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }, 'sales_'.now()->format('Y-m-d').'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
