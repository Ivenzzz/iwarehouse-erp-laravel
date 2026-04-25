<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Models\ProductMaster;
use App\Models\ProductBrand;
use App\Models\ProductVariant;

class ValidatePurchaseCsv
{
    private const EXPECTED_HEADERS = [
        'Model', 'Barcode', 'Serial Number', 'IMEI 1', 'IMEI 2', 'IMEI 3',
        'Model Code', 'SKU Code', 'Submodel', 'Ram Capacity', 'Ram Type',
        'Rom Capacity', 'Rom Type', 'Ram Slots', 'Color', 'Sim Slot',
        'Network 1', 'Network 2', 'Network Type', 'Product Type', 'With Charger',
        'Package', 'Code', 'Country Model', 'CPU', 'GPU', 'OS', 'Software',
        'Resolution', 'Warranty', 'Cost', 'Cash Price', 'SRP', '12 Months CC',
        '3 Months CC', 'DP 30%', 'Condition', 'Intro', 'Details', 'Product Details',
    ];

    public function __construct(
        private readonly MatchOrCreatePurchaseVariant $matchOrCreatePurchaseVariant,
    ) {}

    public function handle(string $csvText): array
    {
        $parsed = $this->parseCsv($csvText);
        if ($parsed['error']) {
            return [
                'validatedRows' => [],
                'errors' => [['message' => $parsed['error']]],
                'brandConflicts' => [],
            ];
        }

        /** @var array<int, array<string, string>> $rows */
        $rows = $parsed['rows'];
        if (count($rows) === 0) {
            return [
                'validatedRows' => [],
                'errors' => [['message' => 'CSV has no data rows.']],
                'brandConflicts' => [],
            ];
        }

        $productMasters = ProductMaster::query()
            ->with(['model.brand', 'subcategory.parent'])
            ->get();
        $allBrands = ProductBrand::query()
            ->orderBy('name')
            ->get()
            ->map(fn (ProductBrand $brand) => [
                'brandId' => (string) $brand->id,
                'brandName' => (string) $brand->name,
                'productMasterId' => null,
            ])
            ->values()
            ->all();

        $validatedRows = [];
        $errors = [];
        $brandConflicts = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $modelName = trim((string) ($row['Model'] ?? ''));
            if ($modelName === '') {
                $errors[] = ['row' => $rowNumber, 'message' => "Row {$rowNumber}: Model name is empty."];

                continue;
            }

            if (! $this->rowHasAtLeastOneIdentifier($row)) {
                $errors[] = ['row' => $rowNumber, 'message' => "Row {$rowNumber}: Provide at least one of Serial Number, IMEI 1, IMEI 2, or Barcode (Barcode used when IMEI 1 is empty)."];

                continue;
            }

            $candidateMasters = $productMasters->filter(
                function (ProductMaster $pm) use ($modelName) {
                    $csv = $this->normalizeText($modelName);
                    $name = $this->normalizeText((string) ($pm->model?->model_name ?? ''));

                    return $name === $csv;
                }
            )->values();

            if ($candidateMasters->isEmpty()) {
                $brandConflicts[] = [
                    'type' => 'no_brand_match',
                    'rowIndex' => $index,
                    'modelName' => $modelName,
                    'normalizedModelName' => $this->normalizeText($modelName),
                    'row' => $row,
                    'brands' => $allBrands,
                    'selectedBrandId' => null,
                    'selectedBrandMode' => 'existing',
                    'newBrandName' => null,
                    'allowCreateBrand' => false,
                ];

                continue;
            }

            if ($candidateMasters->count() > 1) {
                $brandChoices = $candidateMasters
                    ->map(fn (ProductMaster $pm) => [
                        'brandId' => (string) ($pm->model?->brand?->id ?? $pm->id),
                        'brandName' => (string) ($pm->model?->brand?->name ?? 'Unknown Brand'),
                        'productMasterId' => (int) $pm->id,
                    ])
                    ->unique('brandId')
                    ->values()
                    ->all();

                if (count($brandChoices) > 1) {
                    $brandConflicts[] = [
                        'type' => 'multiple_brand_match',
                        'rowIndex' => $index,
                        'modelName' => $modelName,
                        'normalizedModelName' => $this->normalizeText($modelName),
                        'row' => $row,
                        'brands' => $brandChoices,
                        'selectedBrandId' => null,
                        'selectedBrandMode' => 'existing',
                        'newBrandName' => null,
                        'allowCreateBrand' => false,
                    ];

                    continue;
                }
            }

            $master = $candidateMasters->first();
            $variant = $this->matchOrCreatePurchaseVariant->handle($row, $master);

            if (! $variant) {
                $errors[] = ['row' => $rowNumber, 'message' => "Row {$rowNumber}: No matching variant for \"{$modelName}\"."];

                continue;
            }

            $validatedRows[] = $this->buildValidatedRow($row, $rowNumber, $master, $variant);
        }

        return [
            'validatedRows' => $validatedRows,
            'errors' => $errors,
            'brandConflicts' => $brandConflicts,
        ];
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

    private function parseCsv(string $csvText): array
    {
        $csvText = trim($csvText);
        if ($csvText === '') {
            return ['rows' => [], 'error' => 'CSV must have a header row and at least one data row.'];
        }

        $firstLine = strtok($csvText, "\r\n");
        $delimiter = str_contains((string) $firstLine, "\t") ? "\t" : ',';

        $stream = fopen('php://temp', 'r+');
        if ($stream === false) {
            return ['rows' => [], 'error' => 'Unable to read CSV content.'];
        }

        fwrite($stream, $csvText);
        rewind($stream);

        $header = fgetcsv($stream, 0, $delimiter);
        if (! is_array($header)) {
            fclose($stream);

            return ['rows' => [], 'error' => 'CSV must have a header row and at least one data row.'];
        }

        if (isset($header[0])) {
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]) ?: '';
        }

        $headerMap = collect($header)
            ->map(fn ($value) => trim((string) $value))
            ->mapWithKeys(fn ($name, $idx) => [$this->normalizeHeader($name) => $idx]);

        $missing = collect(self::EXPECTED_HEADERS)
            ->filter(fn (string $h) => ! $headerMap->has($this->normalizeHeader($h)))
            ->values()
            ->all();
        if (count($missing) > 0) {
            fclose($stream);

            return ['rows' => [], 'error' => 'Missing columns: '.implode(', ', $missing)];
        }

        $rows = [];
        while (($values = fgetcsv($stream, 0, $delimiter)) !== false) {
            $row = [];
            foreach (self::EXPECTED_HEADERS as $headerName) {
                $index = $headerMap->get($this->normalizeHeader($headerName));
                $row[$headerName] = trim((string) ($values[$index] ?? ''));
            }

            if (collect($row)->every(fn ($v) => trim((string) $v) === '')) {
                continue;
            }
            $rows[] = $row;
        }

        fclose($stream);

        return ['rows' => $rows, 'error' => null];
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

    private function normalizeHeader(string $value): string
    {
        return preg_replace('/\s+/', ' ', strtolower(trim($value))) ?: '';
    }

    private function normalizeText(string $value): string
    {
        return preg_replace('/\s+/', ' ', strtolower(trim($value))) ?: '';
    }

    private function sanitize(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower(trim($value))) ?: '';
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
}
