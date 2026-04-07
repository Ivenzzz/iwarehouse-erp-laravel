<?php

namespace App\Features\Suppliers\Actions;

use App\Models\Supplier;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportSuppliersCsv
{
    public function handle(): StreamedResponse
    {
        $suppliers = Supplier::query()
            ->with('contact')
            ->orderBy('supplier_code')
            ->get();

        $callback = function () use ($suppliers): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['Legal Business Name', 'Trade Name', 'Address', 'Email', 'Mobile']);

            foreach ($suppliers as $supplier) {
                fputcsv($stream, [
                    $supplier->legal_business_name,
                    $supplier->trade_name,
                    $supplier->address,
                    $supplier->contact?->email,
                    $supplier->contact?->mobile,
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'suppliers.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
