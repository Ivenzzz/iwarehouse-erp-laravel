<?php

namespace App\Features\PriceControl\Actions;

use App\Features\PriceControl\Support\PriceControlQuery;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportPriceControlCsv
{
    public function __construct(
        private readonly PriceControlQuery $priceControlQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->priceControlQuery->filtersFromRequest($request);
        $rows = $this->priceControlQuery
            ->applySorting($this->priceControlQuery->query($filters), $filters)
            ->get()
            ->map(fn ($item) => $this->priceControlQuery->transformInventoryRow($item))
            ->values();

        $callback = function () use ($rows): void {
            $stream = fopen('php://output', 'w');

            fputcsv($stream, [
                'Product',
                'Variant',
                'Identifier',
                'Warehouse',
                'Status',
                'Cash Price',
                'SRP',
            ]);

            foreach ($rows as $row) {
                fputcsv($stream, [
                    $row['product_label'],
                    $row['variant_label'],
                    $row['identifier'],
                    $row['warehouse_name'],
                    $row['status'],
                    $row['cash_price'],
                    $row['srp'],
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'price-control.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
