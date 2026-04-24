<?php

namespace App\Features\ProductReports\Actions;

use App\Features\ProductReports\Queries\ProductReportQuery;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportProductReportsCsv
{
    public function __construct(
        private readonly ProductReportQuery $productReportQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->productReportQuery->filtersFromRequest($request);
        $data = $this->productReportQuery->exportRows($filters);

        $callback = function () use ($data): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, $this->headers($data['paymentTypeNames']));

            foreach ($data['rows'] as $row) {
                fputcsv($stream, $this->rowValues($row, $data['paymentTypeNames']));
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'product_reports_'.now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv',
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
            $amount = $row['paymentAmounts'][$name] ?? null;
            $paymentValues[] = $amount === null ? '' : number_format((float) $amount, 2, '.', '');
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
            number_format((float) $row['cost'], 2, '.', ''),
            $row['color'],
        ], $paymentValues, [
            $row['supplierName'],
            $row['supplierContact'],
            $row['quantity'],
            $row['barcode'],
            number_format((float) $row['value'], 2, '.', ''),
            $row['salesPerson'],
            $row['date'],
            $row['time'],
            $row['weekNumber'],
            $row['month'],
            $row['year'],
        ]);
    }
}
