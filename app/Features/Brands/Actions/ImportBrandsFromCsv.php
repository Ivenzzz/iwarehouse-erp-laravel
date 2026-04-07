<?php

namespace App\Features\Brands\Actions;

use App\Models\ProductBrand;
use App\Models\ProductModel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportBrandsFromCsv
{
    public function handle(UploadedFile $file): string
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => 'The CSV file could not be opened.',
            ]);
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV file is empty.',
            ]);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => Str::of((string) $header)->trim()->lower()->value())
            ->values();

        if (! $normalizedHeaders->contains('brand_name') || ! $normalizedHeaders->contains('model_name')) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV must include brand_name and model_name headers.',
            ]);
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $errors = [];
        $rows = [];
        $seenRows = [];
        $duplicateCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $brandName = trim((string) ($row[$headerMap['brand_name']] ?? ''));
            $modelName = trim((string) ($row[$headerMap['model_name']] ?? ''));

            if ($brandName === '' && $modelName === '') {
                continue;
            }

            if ($brandName === '') {
                $errors['file'][] = "Row {$rowNumber}: brand_name is required when model_name is provided.";
                continue;
            }

            if (Str::length($brandName) > 150) {
                $errors['file'][] = "Row {$rowNumber}: brand_name may not be greater than 150 characters.";
                continue;
            }

            if (Str::length($modelName) > 150) {
                $errors['file'][] = "Row {$rowNumber}: model_name may not be greater than 150 characters.";
                continue;
            }

            $dedupeKey = Str::lower($brandName).'|'.Str::lower($modelName);

            if (isset($seenRows[$dedupeKey])) {
                $duplicateCsvRows++;
                continue;
            }

            $seenRows[$dedupeKey] = true;
            $rows[] = [
                'brand_name' => $brandName,
                'model_name' => $modelName,
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = [
                'brands_created' => 0,
                'brands_skipped' => 0,
                'models_created' => 0,
                'models_skipped' => $duplicateCsvRows,
            ];
            $brandCache = [];

            foreach ($rows as $row) {
                $brandKey = Str::lower($row['brand_name']);
                $brand = $brandCache[$brandKey] ?? null;

                if ($brand === null) {
                    $brand = ProductBrand::query()
                        ->whereRaw('LOWER(name) = ?', [$brandKey])
                        ->first();

                    if ($brand === null) {
                        $brand = ProductBrand::create([
                            'name' => $row['brand_name'],
                        ]);
                    }

                    $brandCache[$brandKey] = $brand;

                    if ($brand->wasRecentlyCreated) {
                        $summary['brands_created']++;
                    } else {
                        $summary['brands_skipped']++;
                    }
                }

                if ($row['model_name'] === '') {
                    continue;
                }

                $modelKey = Str::lower($row['model_name']);
                $model = ProductModel::query()
                    ->where('brand_id', $brand->id)
                    ->whereRaw('LOWER(model_name) = ?', [$modelKey])
                    ->first();

                if ($model === null) {
                    $model = ProductModel::create([
                        'brand_id' => $brand->id,
                        'model_name' => $row['model_name'],
                    ]);
                }

                if ($model->wasRecentlyCreated) {
                    $summary['models_created']++;
                } else {
                    $summary['models_skipped']++;
                }
            }

            return $summary;
        });

        return "Import complete: {$summary['brands_created']} brand(s) and {$summary['models_created']} model(s) created; {$summary['brands_skipped']} existing brand(s) and {$summary['models_skipped']} existing or duplicate model row(s) skipped.";
    }
}
