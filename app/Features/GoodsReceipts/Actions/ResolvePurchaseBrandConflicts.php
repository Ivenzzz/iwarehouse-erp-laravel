<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Support\GeneratesProductMasterSku;
use Illuminate\Support\Facades\DB;

class ResolvePurchaseBrandConflicts
{
    public function __construct(
        private readonly MatchOrCreatePurchaseVariant $matchOrCreatePurchaseVariant,
        private readonly GeneratesProductMasterSku $generatesProductMasterSku,
    ) {}

    public function handle(array $brandConflicts): array
    {
        $resolved = [];
        $errors = [];

        foreach ($brandConflicts as $conflict) {
            $row = (array) ($conflict['row'] ?? []);
            $modelName = trim((string) ($conflict['modelName'] ?? ($row['Model'] ?? '')));
            $rowNumber = ((int) ($conflict['rowIndex'] ?? 0)) + 2;

            if ($modelName === '') {
                $errors[] = ['message' => "Row {$rowNumber}: Model name is empty."];

                continue;
            }

            if (! $this->rowHasAtLeastOneIdentifier($row)) {
                $errors[] = ['message' => "Row {$rowNumber}: Provide at least one of Serial Number, IMEI 1, IMEI 2, or Barcode (Barcode used when IMEI 1 is empty)."];

                continue;
            }

            try {
                DB::transaction(function () use ($conflict, $row, $rowNumber, $modelName, &$resolved): void {
                    $master = $this->resolveOrCreateProductMaster($conflict, $modelName);
                    $variant = $this->matchOrCreatePurchaseVariant->handle($row, $master);

                    if (! $variant) {
                        throw new \RuntimeException("Row {$rowNumber}: Variant not found for selected brand on model {$modelName}.");
                    }

                    $resolved[] = $this->buildValidatedRow($row, $rowNumber, $master, $variant);
                });
            } catch (\Throwable $exception) {
                $errors[] = ['message' => $exception->getMessage()];
            }
        }

        return [
            'resolved' => $resolved,
            'errors' => $errors,
        ];
    }

    private function resolveOrCreateProductMaster(array $conflict, string $modelName): ProductMaster
    {
        $selectedBrandId = (string) ($conflict['selectedBrandId'] ?? '');

        if ($selectedBrandId === '') {
            throw new \RuntimeException("Missing selected brand for model {$modelName}.");
        }

        $brand = ProductBrand::query()->find((int) $selectedBrandId);
        if (! $brand instanceof ProductBrand) {
            throw new \RuntimeException("Selected brand for model {$modelName} was not found.");
        }

        $candidateMasterIds = collect($conflict['brands'] ?? [])
            ->filter(fn ($brandChoice) => (string) ($brandChoice['brandId'] ?? '') === (string) $brand->id)
            ->pluck('productMasterId')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($candidateMasterIds->isNotEmpty()) {
            $master = ProductMaster::query()->with(['model.brand'])->find($candidateMasterIds->first());
            if ($master instanceof ProductMaster) {
                return $master;
            }
        }

        $normalizedModelName = $this->normalizeText($modelName);
        $model = ProductModel::query()
            ->where('brand_id', $brand->id)
            ->get()
            ->first(fn (ProductModel $candidate): bool => $this->normalizeText((string) $candidate->model_name) === $normalizedModelName);

        if (! $model instanceof ProductModel) {
            throw new \RuntimeException("Model {$modelName} was not found under selected brand {$brand->name}.");
        }

        $master = ProductMaster::query()->with(['model.brand'])->where('model_id', $model->id)->first();
        if ($master instanceof ProductMaster) {
            return $master;
        }

        $fallbackSubcategory = $this->resolveFallbackSubcategory();
        $model->setRelation('brand', $brand);

        $masterSku = $this->generatesProductMasterSku->fromModel($model);
        $conflicts = ProductMaster::query()
            ->where('master_sku', $masterSku)
            ->where('model_id', '!=', $model->id)
            ->exists();

        if ($conflicts) {
            throw new \RuntimeException("Generated master SKU {$masterSku} is already in use by another model.");
        }

        $master = ProductMaster::query()->create([
            'master_sku' => $masterSku,
            'model_id' => $model->id,
            'subcategory_id' => $fallbackSubcategory->id,
        ])->fresh(['model.brand', 'subcategory.parent']);

        if (! $master instanceof ProductMaster) {
            throw new \RuntimeException("Failed creating product master for model {$modelName}.");
        }

        return $master;
    }

    private function resolveFallbackSubcategory(): ProductCategory
    {
        $categories = ProductCategory::query()->get();
        $normalizedNoCategory = $this->sanitizeForLooseMatch('No Category');
        $normalizedNoSubcategory = $this->sanitizeForLooseMatch('No Subcategory');

        $categoryMatches = $categories
            ->where('parent_category_id', null)
            ->filter(fn (ProductCategory $category): bool => $this->sanitizeForLooseMatch($category->name) === $normalizedNoCategory)
            ->values();

        if ($categoryMatches->count() !== 1) {
            throw new \RuntimeException(
                $categoryMatches->isEmpty()
                    ? 'Fallback category "No Category" was not found.'
                    : 'Fallback category "No Category" is ambiguous.'
            );
        }

        $categoryId = (int) $categoryMatches->first()->id;
        $subcategoryMatches = $categories
            ->where('parent_category_id', $categoryId)
            ->filter(fn (ProductCategory $subcategory): bool => str_contains(
                $this->sanitizeForLooseMatch($subcategory->name),
                $normalizedNoSubcategory,
            ))
            ->values();

        if ($subcategoryMatches->count() !== 1) {
            throw new \RuntimeException(
                $subcategoryMatches->isEmpty()
                    ? 'Fallback subcategory containing "No Subcategory" was not found under "No Category".'
                    : 'Fallback subcategory containing "No Subcategory" is ambiguous under "No Category".'
            );
        }

        return $subcategoryMatches->first();
    }

    private function rowHasAtLeastOneIdentifier(array $row): bool
    {
        $serial = trim((string) ($row['Serial Number'] ?? ''));
        $imei1Direct = trim((string) ($row['IMEI 1'] ?? ''));
        $barcode = trim((string) ($row['Barcode'] ?? ''));
        $imei1 = $imei1Direct !== '' ? $imei1Direct : $barcode;
        $imei2 = trim((string) ($row['IMEI 2'] ?? ''));

        return $serial !== '' || $imei1 !== '' || $imei2 !== '';
    }

    private function buildValidatedRow(array $row, int $rowNumber, ProductMaster $master, ProductVariant $variant): array
    {
        return [
            'rowIndex' => $rowNumber,
            'row' => $row,
            'product_master_id' => $master->id,
            'productMasterName' => $master->product_name,
            'product_name' => $master->product_name,
            'variant_id' => $variant->id,
            'variant_name' => $variant->variant_name,
            'condition' => $this->normalizeCondition((string) ($variant->condition ?: ($row['Condition'] ?? ''))),
            'model_code' => $row['Model Code'] ?? null,
            'serial_number' => $row['Serial Number'] ?? null,
            'imei1' => $row['IMEI 1'] ?: ($row['Barcode'] ?? null),
            'imei2' => $row['IMEI 2'] ?? null,
            'ram_capacity' => $this->normalizeCapacity((string) ($row['Ram Capacity'] ?? '')),
            'rom_capacity' => $this->normalizeCapacity((string) ($row['Rom Capacity'] ?? '')),
            'submodel' => $row['Submodel'] ?? null,
            'ram_type' => $row['Ram Type'] ?? null,
            'rom_type' => $row['Rom Type'] ?? null,
            'ram_slots' => $row['Ram Slots'] ?? null,
            'product_type' => $row['Product Type'] ?? null,
            'with_charger' => $row['With Charger'] ?? null,
            'package' => $row['Package'] ?? null,
            'country_model' => $row['Country Model'] ?? null,
            'cpu' => $row['CPU'] ?? null,
            'gpu' => $row['GPU'] ?? null,
            'os' => $row['OS'] ?? null,
            'software' => $row['Software'] ?? null,
            'resolution' => $row['Resolution'] ?? null,
            'warranty' => $row['Warranty'] ?? null,
            'cost_price' => $this->parseNumber($row['Cost'] ?? 0),
            'cash_price' => $this->parseNumber($row['Cash Price'] ?? 0),
            'srp' => $this->parseNumber($row['SRP'] ?? 0),
            'details' => $row['Details'] ?? null,
        ];
    }

    private function sanitize(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower(trim($value))) ?: '';
    }

    private function normalizeText(string $value): string
    {
        return preg_replace('/\s+/', ' ', strtolower(trim($value))) ?: '';
    }

    private function normalizeCapacity(string $raw): string
    {
        $cleaned = $this->sanitize($raw);
        if ($cleaned === '') {
            return '';
        }
        if (preg_match('/^\d+$/', $cleaned) === 1) {
            $n = (int) $cleaned;

            return $n === 1024 ? '1TB' : "{$n}GB";
        }
        if (preg_match('/^(\d+)(tb|gb)$/', $cleaned, $matches) === 1) {
            $n = (int) $matches[1];
            $unit = strtoupper($matches[2]);
            if ($unit === 'GB' && $n === 1024) {
                return '1TB';
            }

            return "{$n}{$unit}";
        }

        return strtoupper(trim($raw));
    }

    private function normalizeCondition(string $value): string
    {
        $normalized = $this->sanitize($value);
        if (in_array($normalized, ['certifiedpreowned', 'preowned', 'cpo'], true)) {
            return 'Certified Pre-Owned';
        }
        if ($normalized === 'refurbished') {
            return 'Refurbished';
        }

        return 'Brand New';
    }

    private function parseNumber(mixed $value): float
    {
        $clean = preg_replace('/[^\d.\-]/', '', (string) $value);

        return is_numeric($clean) ? (float) $clean : 0.0;
    }

    private function sanitizeForLooseMatch(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower(trim($value))) ?: '';
    }
}
