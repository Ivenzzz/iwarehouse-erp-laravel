<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductSpecDefinition;
use App\Support\GeneratesProductMasterSku;
use App\Support\ProductMasterSpecDefinitions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportProductMastersFromCsv
{
    public function __construct(private readonly GeneratesProductMasterSku $skuGenerator) {}

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
        $requiredHeaders = collect(['brand', 'model', 'subcategory']);

        if ($requiredHeaders->diff($normalizedHeaders)->isNotEmpty()) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV must include brand, model, and subcategory headers.',
            ]);
        }

        $headerMap = $normalizedHeaders->flip();
        $specKeys = collect(ProductMasterSpecDefinitions::keys());
        $rowNumber = 1;
        $rows = [];
        $errors = [];
        $seenModelIds = [];
        $seenSkus = [];
        $duplicateCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $brandName = trim((string) ($row[$headerMap['brand']] ?? ''));
            $modelName = trim((string) ($row[$headerMap['model']] ?? ''));
            $categoryName = $headerMap->has('category') ? trim((string) ($row[$headerMap['category']] ?? '')) : '';
            $subcategoryName = trim((string) ($row[$headerMap['subcategory']] ?? ''));
            $description = $headerMap->has('description') ? trim((string) ($row[$headerMap['description']] ?? '')) : '';

            if ($brandName === '' && $modelName === '' && $categoryName === '' && $subcategoryName === '' && $description === '') {
                continue;
            }

            if ($brandName === '') {
                $errors['file'][] = "Row {$rowNumber}: brand is required.";

                continue;
            }

            if ($modelName === '') {
                $errors['file'][] = "Row {$rowNumber}: model is required.";

                continue;
            }

            if ($subcategoryName === '') {
                $errors['file'][] = "Row {$rowNumber}: subcategory is required.";

                continue;
            }

            $brand = ProductBrand::query()
                ->whereRaw('LOWER(name) = ?', [Str::lower($brandName)])
                ->first();
            $model = $brand instanceof ProductBrand
                ? ProductModel::query()
                    ->where('brand_id', $brand->id)
                    ->whereRaw('LOWER(model_name) = ?', [Str::lower($modelName)])
                    ->first()
                : null;
            $subcategory = $this->findSubcategory($subcategoryName, $categoryName);

            if ($brand === null) {
                $errors['file'][] = "Row {$rowNumber}: brand {$brandName} does not exist.";

                continue;
            }

            if ($model === null) {
                $errors['file'][] = "Row {$rowNumber}: model {$modelName} does not exist for brand {$brandName}.";

                continue;
            }

            if ($subcategory === null) {
                $errors['file'][] = "Row {$rowNumber}: subcategory {$subcategoryName} was not found or is ambiguous.";

                continue;
            }

            $sku = $this->skuGenerator->fromModel($model);

            if (isset($seenModelIds[$model->id])) {
                $duplicateCsvRows++;

                continue;
            }

            if (isset($seenSkus[$sku]) && $seenSkus[$sku] !== $model->id) {
                $errors['file'][] = "Row {$rowNumber}: generated master SKU {$sku} duplicates another CSV row.";

                continue;
            }

            $existingSku = ProductMaster::query()
                ->where('master_sku', $sku)
                ->where('model_id', '!=', $model->id)
                ->exists();

            if ($existingSku) {
                $errors['file'][] = "Row {$rowNumber}: generated master SKU {$sku} is already in use.";

                continue;
            }

            $seenModelIds[$model->id] = true;
            $seenSkus[$sku] = $model->id;
            $rows[] = [
                'master_sku' => $sku,
                'model_id' => $model->id,
                'subcategory_id' => $subcategory->id,
                'description' => $description !== '' ? $description : null,
                'specs' => $specKeys
                    ->filter(fn ($key) => $headerMap->has($key))
                    ->mapWithKeys(fn ($key) => [$key => trim((string) ($row[$headerMap[$key]] ?? ''))])
                    ->filter(fn ($value) => $value !== '')
                    ->all(),
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = ['created' => 0, 'skipped' => $duplicateCsvRows];
            $definitions = ProductSpecDefinition::query()->get()->keyBy('key');

            foreach ($rows as $row) {
                if (ProductMaster::query()->where('model_id', $row['model_id'])->exists()) {
                    $summary['skipped']++;

                    continue;
                }

                $productMaster = ProductMaster::create([
                    'master_sku' => $row['master_sku'],
                    'model_id' => $row['model_id'],
                    'subcategory_id' => $row['subcategory_id'],
                    'description' => $row['description'],
                ]);

                foreach ($row['specs'] as $key => $value) {
                    $definition = $definitions->get($key);

                    if ($definition === null) {
                        continue;
                    }

                    $productMaster->specValues()->create([
                        'product_spec_definition_id' => $definition->id,
                        'value' => $value,
                    ]);
                }

                $summary['created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['created']} product master(s) created; {$summary['skipped']} existing or duplicate row(s) skipped.";
    }

    private function findSubcategory(string $subcategoryName, string $categoryName): ?ProductCategory
    {
        $query = ProductCategory::query()
            ->whereNotNull('parent_category_id')
            ->whereRaw('LOWER(name) = ?', [Str::lower($subcategoryName)]);

        if ($categoryName !== '') {
            $query->whereHas('parent', fn ($query) => $query->whereRaw('LOWER(name) = ?', [Str::lower($categoryName)]));
        }

        $matches = $query->limit(2)->get();

        return $matches->count() === 1 ? $matches->first() : null;
    }
}
