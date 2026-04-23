<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductVariant;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportProductMastersCsv
{
    public function handle(): StreamedResponse
    {
        $variants = ProductVariant::query()
            ->where('is_active', true)
            ->with(['productMaster.model.brand', 'productMaster.subcategory.parent'])
            ->orderBy('sku')
            ->get();

        $callback = function () use ($variants): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, [
                'Brand',
                'Model',
                'Category',
                'Subcategory',
                'RAM',
                'ROM',
                'Color',
                'Model Code',
                'CPU',
                'GPU',
                'RAM Type',
                'ROM Type',
                'Operating System',
                'Screen',
            ]);

            foreach ($variants as $variant) {
                $productMaster = $variant->productMaster;

                fputcsv($stream, [
                    $productMaster?->model?->brand?->name ?? '',
                    $productMaster?->model?->model_name ?? '',
                    $productMaster?->subcategory?->parent?->name ?? '',
                    $productMaster?->subcategory?->name ?? '',
                    $variant->ram ?? '',
                    $variant->rom ?? '',
                    $variant->color ?? '',
                    $variant->model_code ?? '',
                    $variant->cpu ?? '',
                    $variant->gpu ?? '',
                    $variant->ram_type ?? '',
                    $variant->rom_type ?? '',
                    $variant->operating_system ?? '',
                    $variant->screen ?? '',
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'product-variants.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
