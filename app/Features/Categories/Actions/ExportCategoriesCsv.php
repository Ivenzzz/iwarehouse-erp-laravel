<?php

namespace App\Features\Categories\Actions;

use App\Models\ProductCategory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportCategoriesCsv
{
    public function handle(): StreamedResponse
    {
        $categories = ProductCategory::query()
            ->with('children')
            ->whereNull('parent_category_id')
            ->orderBy('name')
            ->get();

        $callback = function () use ($categories): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['category', 'subcategory']);

            foreach ($categories as $category) {
                if ($category->children->isEmpty()) {
                    fputcsv($stream, [$category->name, '']);
                    continue;
                }

                foreach ($category->children as $subcategory) {
                    fputcsv($stream, [$category->name, $subcategory->name]);
                }
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'product-categories.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
