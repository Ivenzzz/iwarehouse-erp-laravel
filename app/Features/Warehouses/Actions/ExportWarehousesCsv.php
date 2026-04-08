<?php

namespace App\Features\Warehouses\Actions;

use App\Models\Warehouse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportWarehousesCsv
{
    public function handle(): StreamedResponse
    {
        $warehouses = Warehouse::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $callback = function () use ($warehouses): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, [
                'name',
                'warehouse_type',
                'phone_number',
                'email',
                'street',
                'city',
                'province',
                'zip_code',
                'country',
                'latitude',
                'longitude',
                'sort_order',
            ]);

            foreach ($warehouses as $warehouse) {
                fputcsv($stream, [
                    $warehouse->name,
                    $warehouse->warehouse_type,
                    $warehouse->phone_number,
                    $warehouse->email,
                    $warehouse->street,
                    $warehouse->city,
                    $warehouse->province,
                    $warehouse->zip_code,
                    $warehouse->country,
                    $warehouse->latitude,
                    $warehouse->longitude,
                    $warehouse->sort_order,
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'warehouses.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
