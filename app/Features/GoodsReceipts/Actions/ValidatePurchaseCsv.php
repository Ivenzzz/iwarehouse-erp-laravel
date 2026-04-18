<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Models\ProductMaster;
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

            $candidateMasters = $productMasters->filter(
                function (ProductMaster $pm) use ($modelName) {
                    $csv = $this->normalizeText($modelName);
                    $name = $this->normalizeText($pm->product_name);
                    return $name === $csv || str_contains($name, $csv) || str_contains($csv, $name);
                }
            )->values();

            if ($candidateMasters->isEmpty()) {
                $errors[] = ['row' => $rowNumber, 'message' => "Row {$rowNumber}: Model \"{$modelName}\" not found."];
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
                        'rowIndex' => $index,
                        'modelName' => $modelName,
                        'row' => $row,
                        'brands' => $brandChoices,
                        'selectedBrandId' => null,
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

    private function parseCsv(string $csvText): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csvText));
        if (! is_array($lines) || count($lines) < 2) {
            return ['rows' => [], 'error' => 'CSV must have a header row and at least one data row.'];
        }

        $delimiter = str_contains((string) $lines[0], "\t") ? "\t" : ',';
        $header = str_getcsv((string) $lines[0], $delimiter);
        $headerMap = collect($header)
            ->map(fn ($value) => trim((string) $value))
            ->mapWithKeys(fn ($name, $idx) => [$this->normalizeHeader($name) => $idx]);

        $missing = collect(self::EXPECTED_HEADERS)
            ->filter(fn (string $h) => ! $headerMap->has($this->normalizeHeader($h)))
            ->values()
            ->all();
        if (count($missing) > 0) {
            return ['rows' => [], 'error' => 'Missing columns: '.implode(', ', $missing)];
        }

        $rows = [];
        for ($i = 1; $i < count($lines); $i++) {
            $values = str_getcsv((string) $lines[$i], $delimiter);
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
