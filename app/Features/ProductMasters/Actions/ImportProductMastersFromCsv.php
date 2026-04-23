<?php

namespace App\Features\ProductMasters\Actions;

use App\Features\ProductMasters\Support\NormalizesModelNameByCode;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Support\GeneratesProductMasterSku;
use App\Support\GeneratesProductVariantSku;
use App\Support\ProductVariantDefinitions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportProductMastersFromCsv
{
    public function __construct(
        private readonly GeneratesProductMasterSku $masterSkuGenerator,
        private readonly GeneratesProductVariantSku $variantSkuGenerator,
        private readonly NormalizesModelNameByCode $modelNameNormalizer,
    ) {}

    /**
     * @return array{
     *   status: 'success',
     *   total_rows: int,
     *   brands_created: int,
     *   models_created: int,
     *   masters_created: int,
     *   masters_reused: int,
     *   variants_created: int,
     *   variants_skipped: int,
     *   failed_rows: int,
     *   errors: array<int, string>,
     *   details: array{
     *     brands_created: array<int, string>,
     *     models_created: array<int, array{brand: string, model: string}>,
     *     variants_created: array<int, array{row: int, brand: string, model: string, sku: string, condition: string}>,
     *     variants_skipped: array<int, array{row: int, brand: string, model: string, sku: string, reason: string}>
     *   }
     * }
     */
    public function handle(UploadedFile $file): array
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
        $requiredHeaders = [
            'brand',
            'model',
            'category',
            'subcategory',
        ];
        $missingHeaders = collect($requiredHeaders)->reject(fn (string $header) => $normalizedHeaders->contains($header));

        if ($missingHeaders->isNotEmpty()) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV must include Brand, Model, Category, and Subcategory headers.',
            ]);
        }

        $headerMap = $normalizedHeaders->flip();
        $operatingSystemHeader = $headerMap->has('operating system')
            ? 'operating system'
            : ($headerMap->has('os') ? 'os' : null);
        $rowNumber = 1;
        $rows = [];
        $errors = [];
        $totalRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $brandName = trim((string) ($row[$headerMap['brand']] ?? ''));
            $modelName = trim((string) ($row[$headerMap['model']] ?? ''));
            $categoryName = trim((string) ($row[$headerMap['category']] ?? ''));
            $subcategoryName = trim((string) ($row[$headerMap['subcategory']] ?? ''));
            $modelCode = $headerMap->has('model code') ? trim((string) ($row[$headerMap['model code']] ?? '')) : '';
            $modelName = $this->modelNameNormalizer->handle($modelName, $modelCode);
            $ram = $headerMap->has('ram') ? trim((string) ($row[$headerMap['ram']] ?? '')) : '';
            $rom = $headerMap->has('rom') ? trim((string) ($row[$headerMap['rom']] ?? '')) : '';
            $cpu = $headerMap->has('cpu') ? trim((string) ($row[$headerMap['cpu']] ?? '')) : '';
            $gpu = $headerMap->has('gpu') ? trim((string) ($row[$headerMap['gpu']] ?? '')) : '';
            $ramType = $headerMap->has('ram type') ? trim((string) ($row[$headerMap['ram type']] ?? '')) : '';
            $romType = $headerMap->has('rom type') ? trim((string) ($row[$headerMap['rom type']] ?? '')) : '';
            $operatingSystem = $operatingSystemHeader !== null ? trim((string) ($row[$headerMap[$operatingSystemHeader]] ?? '')) : '';
            $screen = $headerMap->has('screen') ? trim((string) ($row[$headerMap['screen']] ?? '')) : '';
            $color = $headerMap->has('color') ? trim((string) ($row[$headerMap['color']] ?? '')) : '';
            $conditionInput = $headerMap->has('condition') ? trim((string) ($row[$headerMap['condition']] ?? '')) : '';
            $ram = $this->normalizeMemoryValue($ram);
            $rom = $this->normalizeMemoryValue($rom);

            if (
                $brandName === '' &&
                $modelName === '' &&
                $categoryName === '' &&
                $subcategoryName === '' &&
                $modelCode === '' &&
                $ram === '' &&
                $rom === '' &&
                $cpu === '' &&
                $gpu === '' &&
                $ramType === '' &&
                $romType === '' &&
                $operatingSystem === '' &&
                $screen === '' &&
                $color === '' &&
                $conditionInput === ''
            ) {
                continue;
            }
            $totalRows++;

            $hasMissingRequiredField = false;
            foreach ([
                'brand' => $brandName,
                'model' => $modelName,
                'category' => $categoryName,
                'subcategory' => $subcategoryName,
            ] as $field => $value) {
                if ($value === '') {
                    $errors['file'][] = "Row {$rowNumber} [Brand: {$brandName}, Model: {$modelName}]: {$field} is required.";
                    $hasMissingRequiredField = true;
                }
            }

            if ($hasMissingRequiredField) {
                continue;
            }

            $subcategory = $this->findSubcategory($subcategoryName, $categoryName);

            if ($subcategory === null) {
                $errors['file'][] = "Row {$rowNumber} [Brand: {$brandName}, Model: {$modelName}]: subcategory {$subcategoryName} was not found or is ambiguous.";

                continue;
            }

            $normalizedCondition = $conditionInput === ''
                ? ProductVariantDefinitions::CONDITION_BRAND_NEW
                : $this->normalizeCondition($conditionInput);
            if ($normalizedCondition === null) {
                $errors['file'][] = "Row {$rowNumber} [Brand: {$brandName}, Model: {$modelName}]: condition must be one of ".implode(', ', ProductVariantDefinitions::conditions()).'.';

                continue;
            }

            $rows[] = [
                'row_number' => $rowNumber,
                'brand_name' => $brandName,
                'model_name' => $modelName,
                'subcategory_id' => $subcategory->id,
                'variant' => [
                    'model_code' => $modelCode,
                    'ram' => $ram,
                    'rom' => $rom,
                    'cpu' => $cpu,
                    'gpu' => $gpu,
                    'ram_type' => $ramType,
                    'rom_type' => $romType,
                    'operating_system' => $operatingSystem,
                    'screen' => $screen,
                    'color' => $color,
                    'condition' => $normalizedCondition,
                ],
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows) {
            $summary = [
                'brands_created' => 0,
                'models_created' => 0,
                'masters_created' => 0,
                'masters_reused' => 0,
                'variants_created' => 0,
                'variants_skipped' => 0,
                'brands_created_details' => [],
                'models_created_details' => [],
                'variants_created_details' => [],
                'variants_skipped_details' => [],
            ];
            $brandCache = [];
            $modelCache = [];
            $seenMasterSkus = [];
            $seenVariantSkus = [];
            $stagedRows = [];
            $errors = [];

            foreach ($rows as $row) {
                $rowNumber = $row['row_number'];
                $brandKey = Str::lower($row['brand_name']);
                $modelKey = Str::lower($row['model_name']);

                if (! isset($brandCache[$brandKey])) {
                    $brandCache[$brandKey] = ProductBrand::query()
                        ->whereRaw('LOWER(name) = ?', [$brandKey])
                        ->first();
                }
                $brand = $brandCache[$brandKey];
                if (! $brand instanceof ProductBrand) {
                    $brand = ProductBrand::create([
                        'name' => Str::upper($row['brand_name']),
                    ]);
                    $summary['brands_created']++;
                    $summary['brands_created_details'][] = $brand->name;
                    $brandCache[$brandKey] = $brand;
                }

                $brandModelCacheKey = $brand->id.'|'.$modelKey;
                if (! isset($modelCache[$brandModelCacheKey])) {
                    $modelCache[$brandModelCacheKey] = ProductModel::query()
                        ->where('brand_id', $brand->id)
                        ->whereRaw('LOWER(model_name) = ?', [$modelKey])
                        ->first();
                }
                $model = $modelCache[$brandModelCacheKey];
                if (! $model instanceof ProductModel) {
                    $model = ProductModel::create([
                        'brand_id' => $brand->id,
                        'model_name' => Str::upper($row['model_name']),
                    ]);
                    $summary['models_created']++;
                    $summary['models_created_details'][] = [
                        'brand' => $brand->name,
                        'model' => $model->model_name,
                    ];
                    $modelCache[$brandModelCacheKey] = $model;
                }

                $model->setRelation('brand', $brand);
                $masterSku = $this->masterSkuGenerator->fromModel($model);

                if (isset($seenMasterSkus[$masterSku]) && $seenMasterSkus[$masterSku] !== $model->id) {
                    $errors[] = "Row {$rowNumber} [Brand: {$brand->name}, Model: {$model->model_name}]: generated master SKU {$masterSku} duplicates another CSV row.";
                    continue;
                }

                $existingSku = ProductMaster::query()
                    ->where('master_sku', $masterSku)
                    ->where('model_id', '!=', $model->id)
                    ->exists();
                if ($existingSku) {
                    $errors[] = "Row {$rowNumber} [Brand: {$brand->name}, Model: {$model->model_name}]: generated master SKU {$masterSku} is already in use.";
                    continue;
                }

                $candidateMaster = new ProductMaster([
                    'model_id' => $model->id,
                    'subcategory_id' => $row['subcategory_id'],
                ]);
                $candidateMaster->setRelation('model', $model);

                $variantSku = $this->variantSkuGenerator->fromAttributes(
                    $candidateMaster,
                    $row['variant']['condition'],
                    [
                        'model_code' => $row['variant']['model_code'],
                        'ram' => $row['variant']['ram'],
                        'rom' => $row['variant']['rom'],
                        'color' => $row['variant']['color'],
                    ],
                );

                $variantExists = ProductVariant::query()->where('sku', $variantSku)->exists();
                if (! $variantExists && isset($seenVariantSkus[$variantSku])) {
                    $variantExists = true;
                }

                $seenMasterSkus[$masterSku] = $model->id;
                $seenVariantSkus[$variantSku] = true;

                $stagedRows[] = [
                    'row_number' => $rowNumber,
                    'brand' => $brand->name,
                    'model' => $model->model_name,
                    'master_sku' => $masterSku,
                    'model_id' => $model->id,
                    'subcategory_id' => $row['subcategory_id'],
                    'variant_sku' => $variantSku,
                    'variant_exists' => $variantExists,
                    'variant' => $row['variant'],
                ];
            }

            if ($errors !== []) {
                throw ValidationException::withMessages(['file' => $errors]);
            }

            foreach ($stagedRows as $row) {
                $productMaster = ProductMaster::query()->where('model_id', $row['model_id'])->first();
                if ($productMaster === null) {
                    $productMaster = ProductMaster::create([
                        'master_sku' => $row['master_sku'],
                        'model_id' => $row['model_id'],
                        'subcategory_id' => $row['subcategory_id'],
                    ]);
                    $summary['masters_created']++;
                } else {
                    $summary['masters_reused']++;
                }

                if ($row['variant_exists']) {
                    $summary['variants_skipped']++;
                    $summary['variants_skipped_details'][] = [
                        'row' => $row['row_number'],
                        'brand' => $row['brand'],
                        'model' => $row['model'],
                        'sku' => $row['variant_sku'],
                        'reason' => 'SKU already exists',
                    ];
                    continue;
                }

                ProductVariant::create([
                    'product_master_id' => $productMaster->id,
                    'sku' => $row['variant_sku'],
                    'condition' => $row['variant']['condition'],
                    ...$this->filledAttributes($row['variant']),
                    'is_active' => true,
                ]);

                $summary['variants_created']++;
                $summary['variants_created_details'][] = [
                    'row' => $row['row_number'],
                    'brand' => $row['brand'],
                    'model' => $row['model'],
                    'sku' => $row['variant_sku'],
                    'condition' => $row['variant']['condition'],
                ];
            }

            return $summary;
        });

        return [
            'status' => 'success',
            'total_rows' => $totalRows,
            'brands_created' => $summary['brands_created'],
            'models_created' => $summary['models_created'],
            'masters_created' => $summary['masters_created'],
            'masters_reused' => $summary['masters_reused'],
            'variants_created' => $summary['variants_created'],
            'variants_skipped' => $summary['variants_skipped'],
            'failed_rows' => 0,
            'errors' => [],
            'details' => [
                'brands_created' => array_values(array_unique($summary['brands_created_details'])),
                'models_created' => $summary['models_created_details'],
                'variants_created' => $summary['variants_created_details'],
                'variants_skipped' => $summary['variants_skipped_details'],
                'failed' => [],
            ],
        ];
    }

    private function normalizeCondition(string $value): ?string
    {
        $needle = $this->normalizeConditionToken($value);

        if ($needle === '') {
            return null;
        }

        // Keyword aliases from CSV values after sanitization.
        if (str_contains($needle, 'brandnew') || $needle === 'new') {
            return ProductVariantDefinitions::CONDITION_BRAND_NEW;
        }
        if (str_contains($needle, 'preowned') || $needle === 'cpo' || $needle === 'used') {
            return ProductVariantDefinitions::CONDITION_CERTIFIED_PRE_OWNED;
        }

        foreach (ProductVariantDefinitions::conditions() as $condition) {
            if ($this->normalizeConditionToken($condition) === $needle) {
                return $condition;
            }
        }

        return null;
    }

    /** @param array<string, string> $values */
    private function filledAttributes(array $values): array
    {
        $attributes = [];

        foreach ($values as $key => $value) {
            $value = trim($value);

            if ($value === '') {
                continue;
            }

            $attributes[$key] = $value;
        }

        return $attributes;
    }

    private function normalizeConditionToken(string $value): string
    {
        return Str::lower((string) preg_replace('/[^a-z0-9]+/i', '', trim($value)));
    }

    private function normalizeMemoryValue(string $value): string
    {
        $value = trim($value);

        if ($value === '' || preg_match('/^\d+$/', $value) !== 1) {
            return $value;
        }

        $digits = strlen($value);

        if ($digits <= 3) {
            return $value.'GB';
        }

        $numericValue = (int) $value;
        $tbValue = intdiv($numericValue, 1024);

        return $tbValue.'TB';
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
