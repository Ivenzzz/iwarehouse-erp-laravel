<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductMaster;
use App\Support\ProductMasterSpecDefinitions;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportProductMastersCsv
{
    public function handle(): StreamedResponse
    {
        $productMasters = ProductMaster::query()
            ->with(['model.brand', 'subcategory.parent', 'specValues.definition'])
            ->orderBy('master_sku')
            ->get();
        $specKeys = ProductMasterSpecDefinitions::keys();

        $callback = function () use ($productMasters, $specKeys): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, array_merge([
                'master_sku',
                'brand',
                'model',
                'category',
                'subcategory',
                'image_url',
                'description',
            ], $specKeys));

            foreach ($productMasters as $productMaster) {
                $specs = $productMaster->specValues
                    ->mapWithKeys(fn ($value) => [$value->definition->key => $value->value])
                    ->all();

                fputcsv($stream, array_merge([
                    $productMaster->master_sku,
                    $productMaster->model->brand->name,
                    $productMaster->model->model_name,
                    $productMaster->subcategory->parent?->name ?? '',
                    $productMaster->subcategory->name,
                    $productMaster->image_url ?? '',
                    $productMaster->description ?? '',
                ], array_map(fn ($key) => $specs[$key] ?? '', $specKeys)));
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'product-masters.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
