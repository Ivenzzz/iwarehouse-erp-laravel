<?php

namespace App\Features\SalesReports\Actions;

use App\Features\SalesReports\Support\SalesReportQuery;
use Carbon\Carbon;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportConsolidatedSalesReportXlsx
{
    private const HEADER_ROW = 18;

    private const FIRST_DATA_ROW = 19;

    private const FONT_NAME = 'Calibri';

    /** @var array<int, string> */
    private const PASTEL_ROW_COLORS = [
        'FFF2F6F7',
        'FFEAF6FB',
        'FFEBF7F0',
        'FFFBF4E5',
    ];

    /** @var array<string, float> */
    private const COLUMN_WIDTHS = [
        'A' => 24,
        'B' => 18,
        'C' => 18,
        'D' => 12,
        'E' => 44,
        'F' => 16,
        'G' => 24,
        'H' => 18,
        'I' => 18,
        'J' => 8,
        'K' => 20,
        'L' => 14,
        'M' => 14,
        'N' => 20,
        'O' => 12,
        'P' => 18,
        'Q' => 14,
        'R' => 16,
        'S' => 18,
        'T' => 20,
        'U' => 16,
        'V' => 14,
        'W' => 16,
        'X' => 18,
        'Y' => 18,
        'Z' => 18,
        'AA' => 16,
    ];

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

        $headers = $this->tableHeaders($detail['dynamicPaymentColumns']);
        $columnKinds = $this->columnKinds($detail['dynamicPaymentColumns']);
        $summaryMetrics = $this->summaryMetrics($detail);
        $authorName = trim((string) optional($request->user())->name) ?: 'N/A';
        $exportDate = Carbon::createFromFormat('Y-m-d', $validated['date'])->format('m-d-y');

        $filename = 'sales_report_'.$validated['date'].'_'.$validated['warehouse_id'].'.xlsx';

        return response()->streamDownload(function () use ($detail, $headers, $columnKinds, $summaryMetrics, $authorName, $exportDate): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Transactions');

            $this->prepareSheet($sheet, count($headers));
            $this->writeSignatureBlock($sheet, $authorName, $exportDate);
            $this->writeSummaryBlock($sheet, $summaryMetrics);
            $this->writeHeaderRow($sheet, $headers);
            $this->writeLedgerRows(
                $sheet,
                $detail['ledgerRows'],
                $detail['dynamicPaymentColumns'],
                $headers,
                $columnKinds,
            );

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function prepareSheet(Worksheet $sheet, int $columnCount): void
    {
        $sheet->mergeCells('B1:C1');
        $sheet->mergeCells('D1:E1');
        $sheet->mergeCells('G1:H1');
        $sheet->mergeCells('B2:C2');
        $sheet->mergeCells('D2:E2');
        $sheet->freezePane('A'.self::FIRST_DATA_ROW);

        for ($columnIndex = 1; $columnIndex <= $columnCount; $columnIndex++) {
            $column = Coordinate::stringFromColumnIndex($columnIndex);
            $width = self::COLUMN_WIDTHS[$column] ?? 18;
            $sheet->getColumnDimension($column)->setWidth($width);
        }
    }

    private function writeSignatureBlock(Worksheet $sheet, string $authorName, string $exportDate): void
    {
        $sheet->setCellValue('B1', 'Name and Signature:');
        $sheet->setCellValue('D1', $authorName);
        $sheet->setCellValue('G1', 'Name and Signature:');
        $sheet->setCellValue('B2', 'Date:');
        $sheet->setCellValue('D2', $exportDate);

        $labelStyle = [
            'font' => [
                'name' => self::FONT_NAME,
                'size' => 11,
                'bold' => true,
                'color' => ['argb' => 'FF000000'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF000000'],
                ],
            ],
        ];
        $valueStyle = [
            'font' => [
                'name' => self::FONT_NAME,
                'size' => 11,
                'bold' => true,
                'italic' => true,
                'color' => ['argb' => 'FF000000'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF000000'],
                ],
            ],
        ];

        $sheet->getStyle('B1:C1')->applyFromArray($labelStyle);
        $sheet->getStyle('D1:E1')->applyFromArray($valueStyle);
        $sheet->getStyle('G1:H1')->applyFromArray($labelStyle);
        $sheet->getStyle('B2:C2')->applyFromArray($labelStyle);
        $sheet->getStyle('D2:E2')->applyFromArray($valueStyle);
    }

    private function writeSummaryBlock(Worksheet $sheet, array $summary): void
    {
        $leftRows = [
            ['row' => 4, 'label' => 'Total Manual Gross Sales', 'value' => $summary['totalManualGrossSales'], 'kind' => 'currency'],
            ['row' => 5, 'label' => 'Transaction Count', 'value' => $summary['transactionCountManual'], 'kind' => 'count'],
            ['row' => 6, 'label' => 'Total Non-Cash Payment', 'value' => $summary['totalNonCashPayment'], 'kind' => 'currency'],
            ['row' => 8, 'label' => 'Bank to Bank Transfer', 'value' => $summary['bankToBankTransfer'], 'kind' => 'currency'],
            ['row' => 9, 'label' => 'GCash', 'value' => $summary['gcash'], 'kind' => 'currency'],
            ['row' => 10, 'label' => 'Not in System Manual Sales', 'value' => $summary['notInSystemManualSales'], 'kind' => 'currency'],
            ['row' => 11, 'label' => 'Total CC or Debit Terminal Transactions', 'value' => $summary['totalCcOrDebitTerminalTransactions'], 'kind' => 'currency'],
            ['row' => 12, 'label' => 'Financing', 'value' => $summary['financing'], 'kind' => 'currency'],
            ['row' => 13, 'label' => 'Billease/Paymaya', 'value' => $summary['billeasePaymaya'], 'kind' => 'currency'],
            ['row' => 14, 'label' => 'Check Payment', 'value' => $summary['checkPayment'], 'kind' => 'currency'],
            ['row' => 15, 'label' => 'Total Account Receivable', 'value' => $summary['totalAccountReceivable'], 'kind' => 'currency'],
        ];
        $rightRows = [
            ['row' => 4, 'label' => 'Total Net Cash', 'value' => $summary['totalNetCash'], 'kind' => 'currency'],
            ['row' => 5, 'label' => 'Actual Cash', 'value' => $summary['actualCash'], 'kind' => 'currency'],
            ['row' => 6, 'label' => 'Total Terminal Fee', 'value' => $summary['totalTerminalFee'], 'kind' => 'currency'],
            ['row' => 7, 'label' => '', 'value' => $summary['totalNetCash'], 'kind' => 'currency'],
            ['row' => 9, 'label' => 'POS Sales System', 'value' => $summary['posSalesSystem'], 'kind' => 'currency'],
            ['row' => 10, 'label' => 'Manual Gross Sales', 'value' => $summary['manualGrossSales'], 'kind' => 'currency'],
            ['row' => 11, 'label' => 'Variance', 'value' => $summary['varianceAmount'], 'kind' => 'currency'],
            ['row' => 13, 'label' => 'Transaction Count Manual', 'value' => $summary['transactionCountManual'], 'kind' => 'count'],
            ['row' => 14, 'label' => 'Transaction Count System', 'value' => $summary['transactionCountSystem'], 'kind' => 'count'],
            ['row' => 15, 'label' => 'Variance', 'value' => $summary['varianceCount'], 'kind' => 'count'],
        ];

        foreach ($leftRows as $line) {
            $row = $line['row'];
            $sheet->setCellValue("B{$row}", $line['label']);
            $sheet->setCellValue("C{$row}", $line['value']);
            $this->applySummaryCellStyle($sheet, "B{$row}", 'label');
            $this->applySummaryCellStyle($sheet, "C{$row}", $line['kind']);
        }

        foreach ($rightRows as $line) {
            $row = $line['row'];
            $sheet->setCellValue("F{$row}", $line['label']);
            $sheet->setCellValue("G{$row}", $line['value']);
            $this->applySummaryCellStyle($sheet, "F{$row}", 'label');
            $this->applySummaryCellStyle($sheet, "G{$row}", $line['kind']);
        }
    }

    private function applySummaryCellStyle(Worksheet $sheet, string $cell, string $kind): void
    {
        $horizontal = Alignment::HORIZONTAL_LEFT;
        $numberFormat = 'General';

        if ($kind === 'currency') {
            $horizontal = Alignment::HORIZONTAL_RIGHT;
            $numberFormat = '#,##0.00';
        } elseif ($kind === 'count') {
            $horizontal = Alignment::HORIZONTAL_CENTER;
            $numberFormat = '#,##0';
        }

        $sheet->getStyle($cell)->applyFromArray([
            'font' => [
                'name' => self::FONT_NAME,
                'size' => 11,
                'bold' => true,
                'color' => ['argb' => 'FF000000'],
            ],
            'alignment' => [
                'horizontal' => $horizontal,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF000000'],
                ],
            ],
        ]);

        $sheet->getStyle($cell)->getNumberFormat()->setFormatCode($numberFormat);
    }

    private function writeHeaderRow(Worksheet $sheet, array $headers): void
    {
        $sheet->fromArray($headers, null, 'A'.self::HEADER_ROW);

        $lastColumn = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle('A'.self::HEADER_ROW.':'.$lastColumn.self::HEADER_ROW)->applyFromArray([
            'font' => [
                'name' => self::FONT_NAME,
                'size' => 11,
                'bold' => true,
                'color' => ['argb' => 'FF1F2937'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFE5E7EB'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF000000'],
                ],
            ],
        ]);
    }

    private function writeLedgerRows(
        Worksheet $sheet,
        array $ledgerRows,
        array $dynamicPaymentColumns,
        array $headers,
        array $columnKinds,
    ): void {
        $lastColumn = Coordinate::stringFromColumnIndex(count($headers));
        $toneMap = [];
        $toneIndex = 0;
        $rowNumber = self::FIRST_DATA_ROW;

        foreach ($ledgerRows as $row) {
            $toneKey = (string) ($row['transactionId'] ?? $row['id'] ?? $rowNumber);
            if (! array_key_exists($toneKey, $toneMap)) {
                $toneMap[$toneKey] = self::PASTEL_ROW_COLORS[$toneIndex % count(self::PASTEL_ROW_COLORS)];
                $toneIndex++;
            }
            $fillColor = $toneMap[$toneKey];

            $values = $this->ledgerRowValues($row, $dynamicPaymentColumns);
            $sheet->fromArray($values, null, 'A'.$rowNumber);
            $sheet->getStyle('A'.$rowNumber.':'.$lastColumn.$rowNumber)->applyFromArray([
                'font' => [
                    'name' => self::FONT_NAME,
                    'size' => 11,
                    'color' => ['argb' => 'FF111827'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => $fillColor],
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['argb' => 'FF000000'],
                    ],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);

            $rowNumber++;
        }

        if ($rowNumber === self::FIRST_DATA_ROW) {
            return;
        }

        $lastDataRow = $rowNumber - 1;

        foreach ($columnKinds as $index => $kind) {
            $column = Coordinate::stringFromColumnIndex($index);
            $range = $column.self::FIRST_DATA_ROW.':'.$column.$lastDataRow;
            $style = $sheet->getStyle($range);

            if ($kind === 'currency') {
                $style->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $style->getNumberFormat()->setFormatCode('#,##0.00');
                continue;
            }

            if ($kind === 'count') {
                $style->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $style->getNumberFormat()->setFormatCode('#,##0');
                continue;
            }

            $style->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        }
    }

    private function summaryMetrics(array $detail): array
    {
        $ledgerRows = $detail['ledgerRows'] ?? [];
        $methodSummary = $detail['paymentMethodSummary'] ?? [];
        $summary = $detail['summary'] ?? [];
        $terminalFeeTotal = round((float) ($detail['terminalFeeSummary']['total'] ?? 0), 2);

        $manualGrossSales = $this->sumLedgerNumeric($ledgerRows, 'value');
        $transactionCountManual = $this->uniqueTransactionCount($ledgerRows);
        $totalNonCashPayment = $this->sumLedgerNumeric($ledgerRows, 'nonCashPaymentAmount');
        $totalAccountReceivable = $this->sumLedgerNumeric($ledgerRows, 'receivableAmount');
        $actualCash = $this->sumLedgerNumeric($ledgerRows, 'actualCashPaid');

        $posSalesSystem = round((float) ($summary['netSales'] ?? 0), 2);
        $manualGrossSalesFromSummary = round((float) ($summary['grossSales'] ?? 0), 2);
        $transactionCountSystem = (int) ($summary['transactionCount'] ?? 0);

        $bankToBankTransfer = 0.0;
        $gcash = 0.0;
        $totalCcOrDebitTerminalTransactions = 0.0;
        $financing = 0.0;
        $billeasePaymaya = 0.0;
        $checkPayment = 0.0;

        foreach ($methodSummary as $method => $amount) {
            $normalized = strtolower(trim((string) $method));
            $numericAmount = (float) $amount;

            if (str_contains($normalized, 'bank transfer') || str_contains($normalized, 'bank to bank')) {
                $bankToBankTransfer += $numericAmount;
            }
            if (str_contains($normalized, 'gcash')) {
                $gcash += $numericAmount;
            }
            if (str_contains($normalized, 'credit card') || str_contains($normalized, 'debit')) {
                $totalCcOrDebitTerminalTransactions += $numericAmount;
            }
            if (str_contains($normalized, 'financing') || str_contains($normalized, 'home credit')) {
                $financing += $numericAmount;
            }
            if (str_contains($normalized, 'billease') || str_contains($normalized, 'paymaya')) {
                $billeasePaymaya += $numericAmount;
            }
            if (str_contains($normalized, 'check') || str_contains($normalized, 'cheque')) {
                $checkPayment += $numericAmount;
            }
        }

        $notInSystemManualSales = round($manualGrossSales - $posSalesSystem, 2);
        $totalNetCash = round($manualGrossSales - $terminalFeeTotal, 2);
        $varianceAmount = round($manualGrossSalesFromSummary - $posSalesSystem, 2);
        $varianceCount = $transactionCountManual - $transactionCountSystem;

        return [
            'totalManualGrossSales' => $manualGrossSales,
            'transactionCountManual' => $transactionCountManual,
            'totalNonCashPayment' => $totalNonCashPayment,
            'bankToBankTransfer' => round($bankToBankTransfer, 2),
            'gcash' => round($gcash, 2),
            'notInSystemManualSales' => $notInSystemManualSales,
            'totalCcOrDebitTerminalTransactions' => round($totalCcOrDebitTerminalTransactions, 2),
            'financing' => round($financing, 2),
            'billeasePaymaya' => round($billeasePaymaya, 2),
            'checkPayment' => round($checkPayment, 2),
            'totalAccountReceivable' => $totalAccountReceivable,
            'totalNetCash' => $totalNetCash,
            'actualCash' => $actualCash,
            'totalTerminalFee' => $terminalFeeTotal,
            'posSalesSystem' => $posSalesSystem,
            'manualGrossSales' => $manualGrossSalesFromSummary,
            'varianceAmount' => $varianceAmount,
            'transactionCountSystem' => $transactionCountSystem,
            'varianceCount' => $varianceCount,
        ];
    }

    private function sumLedgerNumeric(array $ledgerRows, string $key): float
    {
        return round((float) collect($ledgerRows)
            ->sum(function (array $row) use ($key): float {
                $value = $row[$key] ?? null;

                return is_numeric($value) ? (float) $value : 0.0;
            }), 2);
    }

    private function uniqueTransactionCount(array $ledgerRows): int
    {
        return collect($ledgerRows)
            ->pluck('transactionId')
            ->filter()
            ->unique()
            ->count();
    }

    private function ledgerRowValues(array $row, array $dynamicPaymentColumns): array
    {
        $date = $row['date'] ?? null;
        $formattedDate = is_string($date) && $date !== ''
            ? Carbon::parse($date)->format('m-d-y')
            : null;

        $values = [
            $row['customerName'] ?? null,
            $row['contactNumber'] ?? null,
            $row['drNumber'] ?? null,
            $row['orNumber'] ?? null,
            $row['productName'] ?? null,
            $row['condition'] ?? null,
            $row['warranty'] ?? null,
            $row['categoryName'] ?? null,
            $row['subcategoryName'] ?? null,
            $row['quantity'] ?? null,
            $row['barcode'] ?? null,
            $row['cost'] ?? null,
            $row['value'] ?? null,
            $row['salesPersonName'] ?? null,
            $formattedDate,
            $row['actualCashPaid'] ?? null,
            $row['discountAmount'] ?? null,
            $row['terminalFeePaidInCash'] ?? null,
            $row['nonCashPaymentAmount'] ?? null,
            $row['nonCashReferenceNumber'] ?? null,
            $row['loanTermLabel'] ?? null,
            $row['mdrAmount'] ?? null,
            $row['receivableAmount'] ?? null,
        ];

        foreach ($dynamicPaymentColumns as $column) {
            $values[] = $row['dynamicPaymentAmounts'][$column] ?? null;
        }

        $values[] = $row['profitWithoutMdr'] ?? null;
        $values[] = $row['profitWithMdr'] ?? null;

        return $values;
    }

    private function tableHeaders(array $dynamicPaymentColumns): array
    {
        return array_merge([
            'Customer Name',
            'Contact',
            'DR #',
            'OR #',
            'Product',
            'Condition',
            'Warranty',
            'Category',
            'Subcategory',
            'Qty',
            'Barcode',
            'Cost',
            'Value',
            'Sale Person',
            'Date',
            'Cash Paid',
            'Discount',
            'TF Cash',
            'Non-Cash Payment',
            'Ref #',
            'Loan Term',
            'MDR',
            'Receivable',
        ], $dynamicPaymentColumns, [
            'Profit (without MDR)',
            'Profit with MDR',
        ]);
    }

    /** @return array<int, string> */
    private function columnKinds(array $dynamicPaymentColumns): array
    {
        $kinds = [
            1 => 'text',
            2 => 'text',
            3 => 'text',
            4 => 'text',
            5 => 'text',
            6 => 'text',
            7 => 'text',
            8 => 'text',
            9 => 'text',
            10 => 'count',
            11 => 'text',
            12 => 'currency',
            13 => 'currency',
            14 => 'text',
            15 => 'date',
            16 => 'currency',
            17 => 'currency',
            18 => 'currency',
            19 => 'currency',
            20 => 'text',
            21 => 'text',
            22 => 'currency',
            23 => 'currency',
        ];

        $index = 24;
        foreach ($dynamicPaymentColumns as $_) {
            $kinds[$index] = 'currency';
            $index++;
        }

        $kinds[$index] = 'currency';
        $kinds[$index + 1] = 'currency';

        return $kinds;
    }
}
