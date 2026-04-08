<?php

namespace App\Features\Categories\Actions;

use App\Features\ProductMasters\Actions\SyncCategoryVariantAttributes;
use App\Models\ProductCategory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportCategoriesFromCsv
{
    public function __construct(
        private readonly SyncCategoryVariantAttributes $syncCategoryVariantAttributes,
    ) {}

    public function handle(UploadedFile $file): string
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'The CSV file could not be opened.']);
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'The CSV file is empty.']);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => Str::of((string) $header)->trim()->lower()->value())
            ->values();

        if (! $normalizedHeaders->contains('category') || ! $normalizedHeaders->contains('subcategory')) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'The CSV must include category and subcategory headers.']);
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $errors = [];
        $rows = [];
        $seenRows = [];
        $duplicateCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $categoryName = trim((string) ($row[$headerMap['category']] ?? ''));
            $subcategoryName = trim((string) ($row[$headerMap['subcategory']] ?? ''));

            if ($categoryName === '' && $subcategoryName === '') {
                continue;
            }

            if ($categoryName === '') {
                $errors['file'][] = "Row {$rowNumber}: category is required when subcategory is provided.";
                continue;
            }

            if (Str::length($categoryName) > 150) {
                $errors['file'][] = "Row {$rowNumber}: category may not be greater than 150 characters.";
                continue;
            }

            if (Str::length($subcategoryName) > 150) {
                $errors['file'][] = "Row {$rowNumber}: subcategory may not be greater than 150 characters.";
                continue;
            }

            $dedupeKey = Str::lower($categoryName).'|'.Str::lower($subcategoryName);

            if (isset($seenRows[$dedupeKey])) {
                $duplicateCsvRows++;
                continue;
            }

            $seenRows[$dedupeKey] = true;
            $rows[] = [
                'category' => $categoryName,
                'subcategory' => $subcategoryName,
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = [
                'categories_created' => 0,
                'categories_skipped' => 0,
                'subcategories_created' => 0,
                'subcategories_skipped' => $duplicateCsvRows,
            ];
            $categoryCache = [];

            foreach ($rows as $row) {
                $categoryKey = Str::lower($row['category']);
                $category = $categoryCache[$categoryKey] ?? null;

                if ($category === null) {
                    $category = ProductCategory::query()
                        ->whereNull('parent_category_id')
                        ->whereRaw('LOWER(name) = ?', [$categoryKey])
                        ->first();

                    if ($category === null) {
                        $category = ProductCategory::create([
                            'name' => $row['category'],
                            'parent_category_id' => null,
                        ]);
                    }

                    $this->syncCategoryVariantAttributes->handle($category);

                    $categoryCache[$categoryKey] = $category;

                    if ($category->wasRecentlyCreated) {
                        $summary['categories_created']++;
                    } else {
                        $summary['categories_skipped']++;
                    }
                }

                if ($row['subcategory'] === '') {
                    continue;
                }

                $subcategoryKey = Str::lower($row['subcategory']);
                $subcategory = ProductCategory::query()
                    ->where('parent_category_id', $category->id)
                    ->whereRaw('LOWER(name) = ?', [$subcategoryKey])
                    ->first();

                if ($subcategory === null) {
                    $subcategory = ProductCategory::create([
                        'name' => $row['subcategory'],
                        'parent_category_id' => $category->id,
                    ]);
                }

                $this->syncCategoryVariantAttributes->handle($subcategory);

                if ($subcategory->wasRecentlyCreated) {
                    $summary['subcategories_created']++;
                } else {
                    $summary['subcategories_skipped']++;
                }
            }

            return $summary;
        });

        return "Import complete: {$summary['categories_created']} category/categories and {$summary['subcategories_created']} subcategory/subcategories created; {$summary['categories_skipped']} existing category/categories and {$summary['subcategories_skipped']} existing or duplicate subcategory row(s) skipped.";
    }
}
