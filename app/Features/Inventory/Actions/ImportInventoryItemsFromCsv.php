<?php

namespace App\Features\Inventory\Actions;

use App\Models\InventoryItem;
use App\Models\ProductBrand;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use App\Support\GeneratesProductVariantSku;
use App\Support\ProductVariantDefinitions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportInventoryItemsFromCsv
{
    private const REQUIRED_COLUMNS = ['Brand', 'Model', 'Warehouse', 'Condition'];
    private const CACHE_PREFIX = 'inventory-import:';
    private const CACHE_TTL_MINUTES = 30;
    private const CACHE_STORE = 'file';

    public function __construct(
        private readonly GeneratesProductVariantSku $generatesProductVariantSku,
        private readonly LogInventoryActivity $logInventoryActivity,
    ) {}

    /**
     * @return array{
     *     validRows: array<int, array<string, mixed>>,
     *     skippedItems: array<int, array<string, mixed>>,
     *     variantsCreated: int,
     *     totalRows: int,
     *     importToken: string
     * }
     */
    public function validate(UploadedFile $file, ?int $userId = null): array
    {
        [$rows, $parseError] = $this->parseCsvFile($file);

        if ($parseError !== null) {
            throw new \InvalidArgumentException($parseError);
        }

        $references = $this->loadReferences();
        $existingIdentifiers = $this->buildExistingIdentifiersSet();
        $batchSeen = ['imei' => [], 'imei2' => [], 'serial_number' => []];
        $validRows = [];
        $skippedItems = [];
        $variantsCreated = 0;

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $result = $this->analyzeRow($row, $references, $existingIdentifiers, $batchSeen, false);

            if (! $result['valid']) {
                $skippedItems[] = [
                    'row' => $rowNumber,
                    'label' => $result['label'],
                    'reason' => $result['reason'],
                ];

                continue;
            }

            if ($result['variantCreated']) {
                $variantsCreated++;
            }

            $validRows[] = [
                'row' => $rowNumber,
                'rowIndex' => $index,
                'label' => $result['label'],
                'warehouse' => $result['warehouse']->name,
            ];
        }

        $importToken = (string) Str::uuid();
        $expiresAt = now()->addMinutes(self::CACHE_TTL_MINUTES);

        Cache::store(self::CACHE_STORE)->put($this->cacheKey($importToken), [
            'rows' => $rows,
            'validRows' => $validRows,
            'skippedItems' => $skippedItems,
            'variantsCreated' => $variantsCreated,
            'totalRows' => count($rows),
            'userId' => $userId,
            'expiresAt' => $expiresAt->toIso8601String(),
        ], $expiresAt);

        return compact('validRows', 'skippedItems', 'variantsCreated', 'importToken') + ['totalRows' => count($rows)];
    }

    /**
     * @return array{
     *     created: int,
     *     failed: int,
     *     skippedItems: array<int, array<string, mixed>>,
     *     createdItems: array<int, array<string, mixed>>
     * }
     */
    public function import(string $importToken, ?int $actorId = null): array
    {
        $cacheKey = $this->cacheKey($importToken);
        $batch = Cache::store(self::CACHE_STORE)->get($cacheKey);

        if (! is_array($batch)) {
            throw new \InvalidArgumentException('Import token is invalid or expired. Validate the file again.');
        }

        if (($batch['userId'] ?? null) !== null && (int) $batch['userId'] !== (int) $actorId) {
            throw new \InvalidArgumentException('This import token belongs to another user. Validate the file again.');
        }

        $rows = $batch['rows'] ?? null;
        $validRows = $batch['validRows'] ?? null;

        if (! is_array($rows) || ! is_array($validRows)) {
            Cache::store(self::CACHE_STORE)->forget($cacheKey);

            throw new \InvalidArgumentException('Import token is invalid or expired. Validate the file again.');
        }

        $references = $this->loadReferences();
        $existingIdentifiers = $this->buildExistingIdentifiersSet();
        $batchSeen = ['imei' => [], 'imei2' => [], 'serial_number' => []];
        $created = 0;
        $failed = 0;
        $skippedItems = [];
        $createdItems = [];

        foreach ($validRows as $validatedRow) {
            $rowIndex = (int) ($validatedRow['rowIndex'] ?? -1);
            $row = $rows[$rowIndex] ?? null;
            $rowNumber = $rowIndex + 2;

            if ($row === null) {
                $failed++;
                $skippedItems[] = [
                    'row' => $rowNumber,
                    'label' => 'Unknown row',
                    'reason' => 'Validated row is missing from the import batch.',
                ];

                continue;
            }

            $result = $this->analyzeRow($row, $references, $existingIdentifiers, $batchSeen, true);

            if (! $result['valid']) {
                $failed++;
                $skippedItems[] = [
                    'row' => $rowNumber,
                    'label' => $result['label'],
                    'reason' => $result['reason'],
                ];

                continue;
            }

            try {
                DB::transaction(function () use ($row, $result, $actorId, &$created, &$createdItems, $rowNumber): void {
                    $payload = $this->buildInventoryPayload($row, $result['variant'], $result['warehouse']);
                    $item = InventoryItem::query()->create($payload);

                    $this->logInventoryActivity->handle(
                        $item,
                        'CSV_IMPORT',
                        $actorId,
                        'Imported from inventory CSV.',
                        [
                            'brand' => $row['Brand'] ?? null,
                            'model' => $row['Model'] ?? null,
                            'warehouse' => $result['warehouse']->name,
                        ],
                    );

                    $created++;
                    $createdItems[] = [
                        'row' => $rowNumber,
                        'label' => $this->buildRowLabel($row),
                        'warehouse' => $result['warehouse']->name,
                    ];
                });
            } catch (\Throwable $exception) {
                $failed++;
                $skippedItems[] = [
                    'row' => $rowNumber,
                    'label' => $this->buildRowLabel($row),
                    'reason' => $exception->getMessage(),
                ];
            }
        }

        Cache::store(self::CACHE_STORE)->forget($cacheKey);

        return compact('created', 'failed', 'skippedItems', 'createdItems');
    }

    /**
     * @return array{0: array<int, array<string, string>>, 1: string|null}
     */
    private function parseCsvFile(UploadedFile $file): array
    {
        $csvText = file_get_contents($file->getRealPath());

        if ($csvText === false) {
            return [[], 'Unable to read the uploaded CSV file.'];
        }

        return $this->parseCsvText($csvText);
    }

    /**
     * @return array{0: array<int, array<string, string>>, 1: string|null}
     */
    private function parseCsvText(string $csvText): array
    {
        $lines = preg_split('/\r?\n/', $csvText) ?: [];
        $lines = array_values(array_filter($lines, fn ($line) => trim((string) $line) !== ''));

        if (count($lines) < 2) {
            return [[], 'CSV must have a header row and at least one data row.'];
        }

        $delimiter = str_contains($lines[0], "\t") ? "\t" : ',';
        $headers = array_map(fn ($header) => $this->collapseWhitespace($header), $this->parseCsvLine($lines[0], $delimiter));
        $missing = array_values(array_filter(self::REQUIRED_COLUMNS, fn ($column) => ! in_array($column, $headers, true)));

        if ($missing !== []) {
            return [[], 'Missing required columns: '.implode(', ', $missing)];
        }

        $rows = [];

        foreach (array_slice($lines, 1) as $line) {
            $values = $this->parseCsvLine($line, $delimiter);

            if (collect($values)->every(fn ($value) => trim((string) $value) === '')) {
                continue;
            }

            $row = [];

            foreach ($headers as $index => $header) {
                $row[$header] = trim((string) ($values[$index] ?? ''));
            }

            $rows[] = $row;
        }

        return [$rows, null];
    }

    /**
     * @return array<int, string>
     */
    private function parseCsvLine(string $line, string $delimiter): array
    {
        $result = [];
        $current = '';
        $inQuotes = false;
        $length = strlen($line);

        for ($i = 0; $i < $length; $i++) {
            $character = $line[$i];

            if ($character === '"') {
                if ($inQuotes && ($line[$i + 1] ?? null) === '"') {
                    $current .= '"';
                    $i++;
                } else {
                    $inQuotes = ! $inQuotes;
                }

                continue;
            }

            if ($character === $delimiter && ! $inQuotes) {
                $result[] = $current;
                $current = '';

                continue;
            }

            $current .= $character;
        }

        $result[] = $current;

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadReferences(): array
    {
        $productMasters = ProductMaster::query()
            ->with(['model.brand', 'subcategory.parent'])
            ->get();
        $variants = ProductVariant::query()
            ->with(['productMaster.model.brand'])
            ->get();
        $warehouses = Warehouse::query()->get();
        ProductBrand::query()->get();

        $productMasterMap = [];
        foreach ($productMasters as $productMaster) {
            $key = $this->normalizeKey(($productMaster->model?->brand?->name ?? '').'::'.($productMaster->model?->model_name ?? ''));
            $productMasterMap[$key] ??= [];
            $productMasterMap[$key][] = $productMaster;
        }

        $variantsByMaster = [];
        foreach ($variants as $variant) {
            $variantsByMaster[$variant->product_master_id] ??= [];
            $variantsByMaster[$variant->product_master_id][] = $this->buildVariantDescriptor($variant);
        }

        $warehouseMap = [];
        foreach ($warehouses as $warehouse) {
            $warehouseMap[$this->normalizeKey($warehouse->name)] ??= [];
            $warehouseMap[$this->normalizeKey($warehouse->name)][] = $warehouse;
        }

        return compact('productMasters', 'variants', 'warehouses', 'productMasterMap', 'variantsByMaster', 'warehouseMap');
    }

    /**
     * @return array{imei: array<int, string>, imei2: array<int, string>, serial_number: array<int, string>}
     */
    private function buildExistingIdentifiersSet(): array
    {
        return [
            'imei' => InventoryItem::query()->whereNotNull('imei')->pluck('imei')->map(fn ($value) => $this->cleanIdentifier($value))->filter()->values()->all(),
            'imei2' => InventoryItem::query()->whereNotNull('imei2')->pluck('imei2')->map(fn ($value) => $this->cleanIdentifier($value))->filter()->values()->all(),
            'serial_number' => InventoryItem::query()->whereNotNull('serial_number')->pluck('serial_number')->map(fn ($value) => $this->cleanIdentifier($value))->filter()->values()->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $references
     * @param  array<string, array<int, string>>  $existingIdentifiers
     * @param  array<string, array<int, string>>  $batchSeen
     * @return array{
     *     valid: bool,
     *     label: string,
     *     reason?: string,
     *     warehouse?: Warehouse,
     *     variant?: ProductVariant|null,
     *     variantCreated?: bool
     * }
     */
    private function analyzeRow(
        array $row,
        array &$references,
        array $existingIdentifiers,
        array &$batchSeen,
        bool $createMissingVariant,
    ): array {
        $mappedRow = $this->mapRowToCanonicalColumns($row);
        $label = $this->buildRowLabel($mappedRow);
        $productMasterMatches = $references['productMasterMap'][$this->normalizeKey(($mappedRow['Brand'] ?? '').'::'.($mappedRow['Model'] ?? ''))] ?? [];

        if (count($productMasterMatches) !== 1) {
            return [
                'valid' => false,
                'label' => $label,
                'reason' => count($productMasterMatches) > 1
                    ? 'Multiple product masters matched Brand + Model.'
                    : 'No product master matched Brand + Model.',
            ];
        }

        $productMaster = $productMasterMatches[0];
        $variantMatches = $this->resolveVariantMatches($mappedRow, $references['variantsByMaster'][$productMaster->id] ?? []);
        $variantCreated = false;
        $variant = null;

        if (count($variantMatches) > 1) {
            return [
                'valid' => false,
                'label' => $label,
                'reason' => 'Multiple variants matched the provided variant attributes.',
            ];
        }

        if (count($variantMatches) === 1) {
            $variantMatch = $variantMatches[0];
            $variant = $variantMatch['variant'];
        }

        $warehouseMatches = $references['warehouseMap'][$this->normalizeKey($mappedRow['Warehouse'] ?? '')] ?? [];

        if (count($warehouseMatches) !== 1) {
            return [
                'valid' => false,
                'label' => $label,
                'reason' => count($warehouseMatches) > 1
                    ? 'Multiple warehouses matched Warehouse name.'
                    : 'No warehouse matched Warehouse name.',
            ];
        }

        $duplicate = $this->checkDuplicateIdentifiers($mappedRow, $existingIdentifiers, $batchSeen);

        if ($duplicate !== null) {
            return [
                'valid' => false,
                'label' => $label,
                'reason' => "Duplicate {$duplicate['field']} already exists: {$duplicate['value']}",
            ];
        }

        if (count($variantMatches) === 0) {
            if ($createMissingVariant) {
                $variant = $this->createVariantForRow($mappedRow, $productMaster);
                $references['variants'][] = $variant;
                $references['variantsByMaster'][$productMaster->id] ??= [];
                $references['variantsByMaster'][$productMaster->id][] = $this->buildVariantDescriptor($variant);
            } else {
                $references['variantsByMaster'][$productMaster->id] ??= [];
                $references['variantsByMaster'][$productMaster->id][] = $this->buildPredictedVariantDescriptor($mappedRow);
            }

            $variantCreated = true;
        } elseif ($variant === null && $createMissingVariant) {
            $variant = $this->createVariantForRow($mappedRow, $productMaster);
            $references['variants'][] = $variant;
            $references['variantsByMaster'][$productMaster->id] = array_values(array_filter(
                $references['variantsByMaster'][$productMaster->id] ?? [],
                fn (array $descriptor): bool => $descriptor !== $variantMatch,
            ));
            $references['variantsByMaster'][$productMaster->id][] = $this->buildVariantDescriptor($variant);
            $variantCreated = true;
        }

        if ($createMissingVariant && ! $variant instanceof ProductVariant) {
            return [
                'valid' => false,
                'label' => $label,
                'reason' => 'Unable to resolve product variant for import.',
            ];
        }

        $this->markIdentifiersUsed($mappedRow, $batchSeen);

        return [
            'valid' => true,
            'label' => $label,
            'warehouse' => $warehouseMatches[0],
            'variant' => $variant,
            'variantCreated' => $variantCreated,
        ];
    }

    /**
     * @param  array<int, array{
     *     variant: ProductVariant|null,
     *     condition: string,
     *     color: string,
     *     ram: string,
     *     rom: string,
     *     cpu: string,
     *     gpu: string,
     *     ram_type: string,
     *     rom_type: string,
     *     operating_system: string,
     *     screen: string
     * }>  $variants
     * @return array<int, array{
     *     variant: ProductVariant|null,
     *     condition: string,
     *     color: string,
     *     ram: string,
     *     rom: string,
     *     cpu: string,
     *     gpu: string,
     *     ram_type: string,
     *     rom_type: string,
     *     operating_system: string,
     *     screen: string
     * }>
     */
    private function resolveVariantMatches(array $row, array $variants): array
    {
        $csvRam = $this->normalizeStorageValue($row['RAM'] ?? '');
        $csvRom = $this->normalizeStorageValue($row['ROM'] ?? '');
        $csvColor = $this->normalizeKey($row['Color'] ?? '');
        $csvCondition = $this->normalizeCondition($row['Condition'] ?? '');
        $csvCpu = $this->normalizeKey($row['CPU'] ?? '');
        $csvGpu = $this->normalizeKey($row['GPU'] ?? '');
        $csvRamType = $this->normalizeKey($row['RAM Type'] ?? '');
        $csvRomType = $this->normalizeKey($row['ROM Type'] ?? '');
        $csvOperatingSystem = $this->normalizeKey($row['Operating System'] ?? '');
        $csvScreen = $this->normalizeKey($row['Screen'] ?? '');

        return array_values(array_filter($variants, function (array $variant) use ($csvRam, $csvRom, $csvColor, $csvCondition, $csvCpu, $csvGpu, $csvRamType, $csvRomType, $csvOperatingSystem, $csvScreen): bool {
            return ($variant['ram'] ?? '') === $csvRam
                && ($variant['rom'] ?? '') === $csvRom
                && ($variant['color'] ?? '') === $csvColor
                && ($variant['condition'] ?? '') === $csvCondition
                && ($variant['cpu'] ?? '') === $csvCpu
                && ($variant['gpu'] ?? '') === $csvGpu
                && ($variant['ram_type'] ?? '') === $csvRamType
                && ($variant['rom_type'] ?? '') === $csvRomType
                && ($variant['operating_system'] ?? '') === $csvOperatingSystem
                && ($variant['screen'] ?? '') === $csvScreen;
        }));
    }

    /**
     * @return array{
     *     variant: ProductVariant|null,
     *     condition: string,
     *     color: string,
     *     ram: string,
     *     rom: string,
     *     cpu: string,
     *     gpu: string,
     *     ram_type: string,
     *     rom_type: string,
     *     operating_system: string,
     *     screen: string
     * }
     */
    private function buildVariantDescriptor(ProductVariant $variant): array
    {
        return [
            'variant' => $variant,
            'condition' => $this->normalizeCondition($variant->condition),
            'color' => $this->normalizeKey($variant->color ?? ''),
            'ram' => $this->normalizeStorageValue($variant->ram ?? ''),
            'rom' => $this->normalizeStorageValue($variant->rom ?? ''),
            'cpu' => $this->normalizeKey($variant->cpu ?? ''),
            'gpu' => $this->normalizeKey($variant->gpu ?? ''),
            'ram_type' => $this->normalizeKey($variant->ram_type ?? ''),
            'rom_type' => $this->normalizeKey($variant->rom_type ?? ''),
            'operating_system' => $this->normalizeKey($variant->operating_system ?? ''),
            'screen' => $this->normalizeKey($variant->screen ?? ''),
        ];
    }

    /**
     * @return array{
     *     variant: ProductVariant|null,
     *     condition: string,
     *     color: string,
     *     ram: string,
     *     rom: string,
     *     cpu: string,
     *     gpu: string,
     *     ram_type: string,
     *     rom_type: string,
     *     operating_system: string,
     *     screen: string
     * }
     */
    private function buildPredictedVariantDescriptor(array $row): array
    {
        return [
            'variant' => null,
            'condition' => $this->normalizeCondition($row['Condition'] ?? ''),
            'color' => $this->normalizeKey($row['Color'] ?? ''),
            'ram' => $this->normalizeStorageValue($row['RAM'] ?? ''),
            'rom' => $this->normalizeStorageValue($row['ROM'] ?? ''),
            'cpu' => $this->normalizeKey($row['CPU'] ?? ''),
            'gpu' => $this->normalizeKey($row['GPU'] ?? ''),
            'ram_type' => $this->normalizeKey($row['RAM Type'] ?? ''),
            'rom_type' => $this->normalizeKey($row['ROM Type'] ?? ''),
            'operating_system' => $this->normalizeKey($row['Operating System'] ?? ''),
            'screen' => $this->normalizeKey($row['Screen'] ?? ''),
        ];
    }

    private function createVariantForRow(array $row, ProductMaster $productMaster): ProductVariant
    {
        $attributes = array_filter([
            'model_code' => $this->collapseWhitespace($row['Model Code'] ?? ''),
            'color' => $this->collapseWhitespace($row['Color'] ?? ''),
            'ram' => $this->normalizeCapacityWithUnit($row['RAM'] ?? ''),
            'rom' => $this->normalizeCapacityWithUnit($row['ROM'] ?? ''),
            'cpu' => $this->collapseWhitespace($row['CPU'] ?? ''),
            'gpu' => $this->collapseWhitespace($row['GPU'] ?? ''),
            'ram_type' => $this->collapseWhitespace($row['RAM Type'] ?? ''),
            'rom_type' => $this->collapseWhitespace($row['ROM Type'] ?? ''),
            'operating_system' => $this->collapseWhitespace($row['Operating System'] ?? ''),
            'screen' => $this->collapseWhitespace($row['Screen'] ?? ''),
        ]);

        $condition = $this->conditionLabel($this->normalizeCondition($row['Condition'] ?? ''));

        return DB::transaction(function () use ($productMaster, $attributes, $condition): ProductVariant {
            $variant = ProductVariant::query()->create([
                'product_master_id' => $productMaster->id,
                'model_code' => $attributes['model_code'] ?? null,
                'sku' => $this->uniqueSku($productMaster, $condition, $attributes),
                'condition' => $condition,
                'color' => $attributes['color'] ?? null,
                'ram' => $attributes['ram'] ?? null,
                'rom' => $attributes['rom'] ?? null,
                'ram_type' => $attributes['ram_type'] ?? null,
                'rom_type' => $attributes['rom_type'] ?? null,
                'cpu' => $attributes['cpu'] ?? null,
                'gpu' => $attributes['gpu'] ?? null,
                'operating_system' => $attributes['operating_system'] ?? null,
                'screen' => $attributes['screen'] ?? null,
                'is_active' => true,
            ]);

            return $variant->fresh(['productMaster.model.brand']);
        });
    }

    /**
     * @param  array<string, array<int, string>>  $existingIdentifiers
     * @param  array<string, array<int, string>>  $batchSeen
     * @return array{field: string, value: string}|null
     */
    private function checkDuplicateIdentifiers(array $row, array $existingIdentifiers, array $batchSeen): ?array
    {
        foreach ([
            'imei' => $row['IMEI 1'] ?? null,
            'imei2' => $row['IMEI 2'] ?? null,
            'serial_number' => $row['Serial Number'] ?? null,
        ] as $field => $value) {
            $cleanValue = $this->cleanIdentifier($value);

            if ($cleanValue === null) {
                continue;
            }

            if (in_array($cleanValue, $existingIdentifiers[$field], true) || in_array($cleanValue, $batchSeen[$field], true)) {
                return [
                    'field' => $field === 'imei' ? 'imei1' : $field,
                    'value' => $cleanValue,
                ];
            }
        }

        return null;
    }

    /**
     * @param  array<string, array<int, string>>  $batchSeen
     */
    private function markIdentifiersUsed(array $row, array &$batchSeen): void
    {
        foreach ([
            'imei' => $row['IMEI 1'] ?? null,
            'imei2' => $row['IMEI 2'] ?? null,
            'serial_number' => $row['Serial Number'] ?? null,
        ] as $field => $value) {
            $cleanValue = $this->cleanIdentifier($value);

            if ($cleanValue !== null) {
                $batchSeen[$field][] = $cleanValue;
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildInventoryPayload(array $row, ProductVariant $variant, Warehouse $warehouse): array
    {
        return [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => $this->cleanIdentifier($row['IMEI 1'] ?? null),
            'imei2' => $this->cleanIdentifier($row['IMEI 2'] ?? null),
            'serial_number' => $this->cleanIdentifier($row['Serial Number'] ?? null),
            'status' => $this->resolveStatus($row['Status'] ?? null),
            'cost_price' => $this->parseNumber($row['Cost'] ?? null),
            'cash_price' => $this->parseNumber($row['Cash'] ?? null),
            'srp_price' => $this->parseNumber($row['SRP'] ?? null),
            'package' => $this->collapseWhitespace($row['Package'] ?? ''),
            'warranty' => $this->collapseWhitespace($row['Warranty'] ?? ''),
            'product_type' => $this->collapseWhitespace($row['Product Type'] ?? ''),
            'with_charger' => $this->parseBoolean($row['With Charger'] ?? null),
            'encoded_at' => now(),
            'grn_number' => $this->collapseWhitespace($row['GRN Number'] ?? ''),
        ];
    }

    private function collapseWhitespace(mixed $value): string
    {
        return preg_replace('/\s+/', ' ', trim((string) $value)) ?: '';
    }

    private function normalizeKey(mixed $value): string
    {
        return Str::lower($this->collapseWhitespace($value));
    }

    private function cleanIdentifier(mixed $value): ?string
    {
        $value = $this->collapseWhitespace($value);

        if ($value === '') {
            return null;
        }

        return preg_replace('/\.0+$/', '', $value) ?: null;
    }

    private function normalizeStorageValue(mixed $value): string
    {
        $normalized = preg_replace('/\s*(gb|tb|mb)$/i', '', $this->normalizeKey($value)) ?: '';

        return $this->normalizeWholeNumberString($normalized);
    }

    private function normalizeCondition(mixed $value): string
    {
        return match ($this->normalizeKey($value)) {
            'brandnew', 'brand new', 'new' => 'brand new',
            'certified pre-owned', 'certified pre owned', 'pre-owned', 'pre owned', 'cpo' => 'certified pre-owned',
            default => $this->normalizeKey($value),
        };
    }

    private function conditionLabel(string $normalizedCondition): string
    {
        return $normalizedCondition === 'certified pre-owned'
            ? ProductVariantDefinitions::CONDITION_CERTIFIED_PRE_OWNED
            : ProductVariantDefinitions::CONDITION_BRAND_NEW;
    }

    private function normalizeCapacityWithUnit(mixed $value): string
    {
        $value = $this->collapseWhitespace($value);

        if ($value === '') {
            return '';
        }

        if (preg_match('/^(?<number>\d+(?:\.\d+)?)\s*(?<unit>gb|tb|mb)$/i', $value, $matches)) {
            $number = $this->normalizeWholeNumberString($matches['number']);
            $unit = strtoupper($matches['unit']);

            return "{$number}{$unit}";
        }

        if (preg_match('/^\d+(?:\.\d+)?$/', $value)) {
            $number = (int) $this->normalizeWholeNumberString($value);

            return $number >= 1024 ? ($number / 1024).'TB' : $number.'GB';
        }

        return $value;
    }

    private function parseNumber(mixed $value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $parsed = (float) str_replace(',', '', trim((string) $value));

        return is_finite($parsed) ? $parsed : null;
    }

    private function parseBoolean(mixed $value): bool
    {
        return in_array($this->normalizeKey($value), ['true', 'yes', '1'], true);
    }

    private function resolveStatus(mixed $value): string
    {
        return match ($this->normalizeKey($value)) {
            '', 'active', 'available' => 'available',
            'transfer' => 'in_transit',
            'quality_check' => 'qc_pending',
            'returned_to_supplier' => 'for_return_to_supplier',
            'lost' => 'stolen_lost',
            default => $this->normalizeKey($value),
        };
    }

    private function buildRowLabel(array $row): string
    {
        return collect([
            $row['Brand'] ?? null,
            $row['Model'] ?? null,
            $row['RAM'] ?? null,
            $row['ROM'] ?? null,
            $row['Color'] ?? null,
            $row['Condition'] ?? null,
        ])
            ->filter(fn ($value) => trim((string) $value) !== '')
            ->map(fn ($value) => $this->collapseWhitespace($value))
            ->implode(' / ') ?: 'Inventory row';
    }

    /**
     * @return array<string, string>
     */
    private function mapRowToCanonicalColumns(array $row): array
    {
        $mapped = $row;
        $mapped['RAM'] = $this->normalizeWholeNumberString($this->valueFromAliases($row, ['RAM', 'RAM Capacity']));
        $mapped['ROM'] = $this->normalizeWholeNumberString($this->valueFromAliases($row, ['ROM', 'ROM Capacity']));
        $mapped['Operating System'] = $this->valueFromAliases($row, ['Operating System', 'OS']);
        $mapped['Screen'] = $this->valueFromAliases($row, ['Screen', 'Display']);

        foreach (['Color', 'CPU', 'GPU', 'RAM Type', 'ROM Type', 'Brand', 'Model', 'Warehouse', 'Condition'] as $header) {
            $mapped[$header] = $this->valueFromAliases($row, [$header]);
        }

        return $mapped;
    }

    /**
     * @param  array<int, string>  $aliases
     */
    private function valueFromAliases(array $row, array $aliases): string
    {
        foreach ($aliases as $alias) {
            $value = $this->collapseWhitespace($row[$alias] ?? '');
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function normalizeWholeNumberString(string $value): string
    {
        $value = $this->collapseWhitespace($value);

        if ($value === '') {
            return '';
        }

        if (preg_match('/^\d+(\.\d+)?$/', $value) !== 1) {
            return $value;
        }

        return (string) ((int) ((float) $value));
    }

    /**
     * @param  array<string, string>  $attributes
     */
    private function uniqueSku(ProductMaster $productMaster, string $condition, array $attributes): string
    {
        $baseSku = $this->generatesProductVariantSku->fromAttributes($productMaster, $condition, $attributes);
        $sku = $baseSku;
        $suffix = 1;

        while (ProductVariant::query()->where('sku', $sku)->exists()) {
            $suffix++;
            $sku = "{$baseSku}-{$suffix}";
        }

        return $sku;
    }

    private function cacheKey(string $importToken): string
    {
        return self::CACHE_PREFIX.$importToken;
    }
}
