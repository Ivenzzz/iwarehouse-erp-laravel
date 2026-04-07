<?php

namespace App\Features\Brands\Actions;

use App\Models\ProductBrand;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportBrandsCsv
{
    public function handle(): StreamedResponse
    {
        $brands = ProductBrand::query()
            ->with('models')
            ->orderBy('name')
            ->get();

        $callback = function () use ($brands): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['brand_name', 'model_name']);

            foreach ($brands as $brand) {
                if ($brand->models->isEmpty()) {
                    fputcsv($stream, [$brand->name, '']);
                    continue;
                }

                foreach ($brand->models as $model) {
                    fputcsv($stream, [$brand->name, $model->model_name]);
                }
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'brands-models.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
