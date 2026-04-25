<?php

namespace App\Features\Inventory\Actions;

use App\Features\ProductMasters\Support\NormalizesModelNameByCode;
use App\Models\InventoryItem;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use App\Support\GeneratesProductMasterSku;
use App\Support\GeneratesProductVariantSku;
use App\Support\ProductVariantDefinitions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ImportInventoryItemsFromCsv
{
    private const REQUIRED_COLUMNS = ['Brand', 'Model', 'Warehouse', 'Condition'];
    private const CACHE_PREFIX = 'inventory-import:';
    private const CACHE_TTL_MINUTES = 30;
    private const CACHE_STORE = 'file';

    public function __construct(
        private readonly GeneratesProductMasterSku $generatesProductMasterSku,
        private readonly GeneratesProductVariantSku $generatesProductVariantSku,
        private readonly LogInventoryActivity $logInventoryActivity,
        private readonly NormalizesModelNameByCode $normalizesModelNameByCode,
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
            try {
                $result = $this->analyzeRow($row, $references, $existingIdentifiers, $batchSeen, false);
            } catch (\Throwable $exception) {
                $skippedItems[] = [
                    'row' => $rowNumber,
                    'label' => $this->buildRowLabel($this->mapRowToCanonicalColumns($row)),
                    'reason' => $exception->getMessage(),
                ];

                continue;
            }

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

            try {
                $result = $this->analyzeRow($row, $references, $existingIdentifiers, $batchSeen, true);
            } catch (\Throwable $exception) {
                $failed++;
                $skippedItems[] = [
                    'row' => $rowNumber,
                    'label' => $this->buildRowLabel($this->mapRowToCanonicalColumns($row)),
                    'reason' => $exception->getMessage(),
                ];

                continue;
            }

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

                    $resolutionNote = $result['resolutionNote'] ?? null;
                    $this->logInventoryActivity->handle(
                        $item,
                        'CSV_IMPORT',
                        $actorId,
                        'Imported from 2025 POS',
                        [
                            'brand' => $row['Brand'] ?? null,
                            'model' => $row['Model'] ?? null,
                            'warehouse' => $result['warehouse']->name,
                            'resolution_note' => $resolutionNote,
                        ],
                    );

                    $created++;
                    $createdItems[] = [
                        'row' => $rowNumber,
                        'label' => $this->buildRowLabel($row),
                        'warehouse' => $result['warehouse']->name,
                        'note' => $resolutionNote,
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
        $brands = ProductBrand::query()->get();
        $models = ProductModel::query()->with('brand')->get();
        $productMasters = ProductMaster::query()
            ->with(['model.brand', 'subcategory.parent'])
            ->get();
        $variants = ProductVariant::query()
            ->with(['productMaster.model.brand'])
            ->get();
        $warehouses = Warehouse::query()->get();
        $categories = ProductCategory::query()->get();

        $productMasterMap = [];
        $productMastersByModelId = [];
        foreach ($productMasters as $productMaster) {
            $key = $this->normalizeKey(($productMaster->model?->brand?->name ?? '').'::'.($productMaster->model?->model_name ?? ''));
            $productMasterMap[$key] ??= [];
            $productMasterMap[$key][] = [
                'id' => $productMaster->id,
                'productMaster' => $productMaster,
            ];
            $productMastersByModelId[$productMaster->model_id] = $productMaster;
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

        $brandMap = [];
        foreach ($brands as $brand) {
            $brandMap[$this->normalizeKey($brand->name)] = $brand;
        }

        $modelMap = [];
        foreach ($models as $model) {
            $modelMap[$model->brand_id.'|'.$this->normalizeKey($model->model_name)] = $model;
        }

        return compact(
            'brands',
            'models',
            'productMasters',
            'variants',
            'warehouses',
            'categories',
            'productMasterMap',
            'productMastersByModelId',
            'variantsByMaster',
            'warehouseMap',
            'brandMap',
            'modelMap',
        ) + ['nextPredictedMasterId' => -1];
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
     *     variantCreated?: bool,
     *     resolutionNote?: string
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
        $mappedRow['Model'] = $this->normalizesModelNameByCode->handle(
            $mappedRow['Model'] ?? '',
            $mappedRow['Model Code'] ?? '',
        );
        $label = $this->buildRowLabel($mappedRow);
        $masterResolution = $this->resolveProductMasterForRow($mappedRow, $references, $createMissingVariant);

        if (! $masterResolution['valid']) {
            return [
                'valid' => false,
                'label' => $label,
                'reason' => $masterResolution['reason'] ?? 'Unable to resolve product master.',
            ];
        }

        $productMaster = $masterResolution['productMaster'] ?? null;
        $masterId = (int) ($masterResolution['productMasterId'] ?? 0);
        $variantMatches = $this->resolveVariantMatches($mappedRow, $references['variantsByMaster'][$masterId] ?? []);
        $variantCreated = false;
        $variant = null;
        $resolutionNote = $masterResolution['resolutionNote'] ?? null;

        if (count($variantMatches) > 1) {
            $variant = $this->findNearestVariant($mappedRow, $masterId, $references);
            $resolutionNote = 'Attached to closest matched variant after multiple normalized variant matches.';

            if (! $variant instanceof ProductVariant) {
                return [
                    'valid' => false,
                    'label' => $label,
                    'reason' => 'Multiple variants matched normalized attributes, but no product variant was available to attach.',
                ];
            }
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
            $createdNewVariant = false;

            if ($createMissingVariant) {
                if (! $productMaster instanceof ProductMaster) {
                    return [
                        'valid' => false,
                        'label' => $label,
                        'reason' => 'Unable to resolve product master for import.',
                    ];
                }
                $latestMatches = $this->resolveVariantMatches(
                    $mappedRow,
                    $this->loadVariantDescriptorsForMaster($masterId),
                );

                if (count($latestMatches) > 1) {
                    $variant = $this->findNearestVariantFromDescriptors($mappedRow, $latestMatches);
                    $resolutionNote = 'Attached to closest matched variant after multiple normalized variant matches.';

                    if (! $variant instanceof ProductVariant) {
                        return [
                            'valid' => false,
                            'label' => $label,
                            'reason' => 'Multiple variants matched normalized attributes, but no product variant was available to attach.',
                        ];
                    }
                }

                if ($variant === null && count($latestMatches) === 1) {
                    $variant = $latestMatches[0]['variant'];
                } elseif ($variant === null) {
                    try {
                        $variant = $this->createVariantForRow($mappedRow, $productMaster);
                        $createdNewVariant = true;
                    } catch (\Throwable $exception) {
                        if ($this->isVariantSkuCollisionException($exception)) {
                            $nearestVariant = $this->findNearestVariantFromDescriptors(
                                $mappedRow,
                                $this->loadVariantDescriptorsForMaster($masterId),
                            ) ?? $this->findNearestVariant($mappedRow, $masterId, $references);

                            if ($nearestVariant instanceof ProductVariant) {
                                $variant = $nearestVariant;
                                $resolutionNote = 'Attached to closest matched variant after expanded SKU collision.';
                            } else {
                                return [
                                    'valid' => false,
                                    'label' => $label,
                                    'reason' => 'Expanded SKU collision occurred, but no product variant was available to attach.',
                                ];
                            }
                        } else {
                            return [
                                'valid' => false,
                                'label' => $label,
                                'reason' => $exception->getMessage(),
                            ];
                        }
                    }
                }

                if (! $variant instanceof ProductVariant) {
                    return [
                        'valid' => false,
                        'label' => $label,
                        'reason' => 'Unable to resolve product variant for import.',
                    ];
                }

                $references['variants'][] = $variant;
                $references['variantsByMaster'][$masterId] ??= [];
                $references['variantsByMaster'][$masterId][] = $this->buildVariantDescriptor($variant);
            } else {
                $references['variantsByMaster'][$masterId] ??= [];
                $references['variantsByMaster'][$masterId][] = $this->buildPredictedVariantDescriptor($mappedRow);
                $createdNewVariant = true;
            }

            $variantCreated = $createdNewVariant;
        } elseif ($variant === null && $createMissingVariant) {
            if (! $productMaster instanceof ProductMaster) {
                return [
                    'valid' => false,
                    'label' => $label,
                    'reason' => 'Unable to resolve product master for import.',
                ];
            }
            try {
                $variant = $this->createVariantForRow($mappedRow, $productMaster);
            } catch (\Throwable $exception) {
                if ($this->isVariantSkuCollisionException($exception)) {
                    $nearestVariant = $this->findNearestVariantFromDescriptors(
                        $mappedRow,
                        $this->loadVariantDescriptorsForMaster($masterId),
                    ) ?? $this->findNearestVariant($mappedRow, $masterId, $references);

                    if ($nearestVariant instanceof ProductVariant) {
                        $variant = $nearestVariant;
                        $resolutionNote = 'Attached to closest matched variant after expanded SKU collision.';
                    } else {
                        return [
                            'valid' => false,
                            'label' => $label,
                            'reason' => 'Expanded SKU collision occurred, but no product variant was available to attach.',
                        ];
                    }
                } else {
                    return [
                        'valid' => false,
                        'label' => $label,
                        'reason' => $exception->getMessage(),
                    ];
                }
            }
            $references['variants'][] = $variant;
            $references['variantsByMaster'][$masterId] = array_values(array_filter(
                $references['variantsByMaster'][$masterId] ?? [],
                fn (array $descriptor): bool => $descriptor !== $variantMatch,
            ));
            $references['variantsByMaster'][$masterId][] = $this->buildVariantDescriptor($variant);
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
            'resolutionNote' => $resolutionNote,
        ];
    }

    /**
     * @param  array<string, mixed>  $references
     * @return array{valid: bool, reason?: string, productMaster?: ProductMaster|null, productMasterId?: int, resolutionNote?: string}
     */
    private function resolveProductMasterForRow(array $row, array &$references, bool $createMissingGraph): array
    {
        $brandName = $this->collapseWhitespace($row['Brand'] ?? '');
        $modelName = $this->collapseWhitespace($row['Model'] ?? '');

        if ($brandName === '' || $modelName === '') {
            return [
                'valid' => false,
                'reason' => 'Brand and Model are required.',
            ];
        }

        $brandModelKey = $this->normalizeKey($brandName.'::'.$modelName);
        $productMasterMatches = $references['productMasterMap'][$brandModelKey] ?? [];

        if (count($productMasterMatches) > 1) {
            return [
                'valid' => false,
                'reason' => 'Multiple product masters matched Brand + Model.',
            ];
        }

        if (count($productMasterMatches) === 1) {
            $match = $productMasterMatches[0];

            return [
                'valid' => true,
                'productMaster' => $match['productMaster'],
                'productMasterId' => (int) $match['id'],
            ];
        }

        $fallbackSubcategory = $this->resolveFallbackSubcategory($references);
        if (! $fallbackSubcategory['valid']) {
            return [
                'valid' => false,
                'reason' => $fallbackSubcategory['reason'] ?? 'Unable to resolve fallback subcategory.',
            ];
        }

        if (! $createMissingGraph) {
            $predictedMasterId = $this->ensurePredictedMasterReference($brandModelKey, $references);

            return [
                'valid' => true,
                'productMaster' => null,
                'productMasterId' => $predictedMasterId,
            ];
        }

        $brandKey = $this->normalizeKey($brandName);
        $brand = $references['brandMap'][$brandKey] ?? null;

        if (! $brand instanceof ProductBrand) {
            $brand = ProductBrand::query()->create([
                'name' => Str::upper($brandName),
            ]);
            $references['brandMap'][$brandKey] = $brand;
        }

        $modelKey = $brand->id.'|'.$this->normalizeKey($modelName);
        $model = $references['modelMap'][$modelKey] ?? null;

        if (! $model instanceof ProductModel) {
            $model = ProductModel::query()->create([
                'brand_id' => $brand->id,
                'model_name' => Str::upper($modelName),
            ]);
            $references['modelMap'][$modelKey] = $model;
        }

        $productMaster = $references['productMastersByModelId'][$model->id] ?? null;

        if (! $productMaster instanceof ProductMaster) {
            $model->setRelation('brand', $brand);
            $masterSku = $this->generatesProductMasterSku->fromModel($model);
            $conflicts = ProductMaster::query()
                ->where('master_sku', $masterSku)
                ->where('model_id', '!=', $model->id)
                ->exists();

            if ($conflicts) {
                $nearestMaster = $this->findNearestProductMaster($row, $references, $masterSku);

                if (! $nearestMaster instanceof ProductMaster) {
                    return [
                        'valid' => false,
                        'reason' => "Generated master SKU {$masterSku} is already in use, but no product master was available to attach.",
                    ];
                }

                $references['productMasterMap'][$brandModelKey] = [[
                    'id' => $nearestMaster->id,
                    'productMaster' => $nearestMaster,
                ]];

                return [
                    'valid' => true,
                    'productMaster' => $nearestMaster,
                    'productMasterId' => $nearestMaster->id,
                    'resolutionNote' => 'Attached to closest matched master after master SKU collision.',
                ];
            }

            $productMaster = ProductMaster::query()->create([
                'master_sku' => $masterSku,
                'model_id' => $model->id,
                'subcategory_id' => $fallbackSubcategory['subcategory']->id,
            ])->fresh(['model.brand', 'subcategory.parent']);

            $references['productMastersByModelId'][$model->id] = $productMaster;
            $references['productMasters'][] = $productMaster;
        }

        $references['productMasterMap'][$brandModelKey] = [[
            'id' => $productMaster->id,
            'productMaster' => $productMaster,
        ]];

        return [
            'valid' => true,
            'productMaster' => $productMaster,
            'productMasterId' => $productMaster->id,
        ];
    }

    /**
     * @param  array<string, mixed>  $references
     * @return array{valid: bool, reason?: string, subcategory?: ProductCategory}
     */
    private function resolveFallbackSubcategory(array &$references): array
    {
        if (isset($references['fallbackSubcategoryResolution'])) {
            return $references['fallbackSubcategoryResolution'];
        }

        $categories = collect($references['categories'] ?? []);
        $normalizedNoCategory = $this->sanitizeForLooseMatch('No Category');
        $normalizedNoSubcategory = $this->sanitizeForLooseMatch('No Subcategory');
        $categoryMatches = $categories
            ->where('parent_category_id', null)
            ->filter(fn (ProductCategory $category): bool => $this->sanitizeForLooseMatch($category->name) === $normalizedNoCategory)
            ->values();

        if ($categoryMatches->count() !== 1) {
            return $references['fallbackSubcategoryResolution'] = [
                'valid' => false,
                'reason' => $categoryMatches->isEmpty()
                    ? 'Fallback category "No Category" was not found.'
                    : 'Fallback category "No Category" is ambiguous.',
            ];
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
            return $references['fallbackSubcategoryResolution'] = [
                'valid' => false,
                'reason' => $subcategoryMatches->isEmpty()
                    ? 'Fallback subcategory containing "No Subcategory" was not found under "No Category".'
                    : 'Fallback subcategory containing "No Subcategory" is ambiguous under "No Category".',
            ];
        }

        return $references['fallbackSubcategoryResolution'] = [
            'valid' => true,
            'subcategory' => $subcategoryMatches->first(),
        ];
    }

    /**
     * @param  array<string, mixed>  $references
     */
    private function ensurePredictedMasterReference(string $brandModelKey, array &$references): int
    {
        $existing = $references['productMasterMap'][$brandModelKey] ?? [];
        if (count($existing) === 1) {
            return (int) ($existing[0]['id'] ?? 0);
        }

        $predictedId = (int) ($references['nextPredictedMasterId'] ?? -1);
        $references['nextPredictedMasterId'] = $predictedId - 1;
        $references['productMasterMap'][$brandModelKey] = [[
            'id' => $predictedId,
            'productMaster' => null,
        ]];

        return $predictedId;
    }

    /**
     * @param  array<int, array{
     *     variant: ProductVariant|null,
     *     signature: string,
     *     condition: string,
     *     model_code: string,
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
     *     signature: string,
     *     condition: string,
     *     model_code: string,
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
        $rowSignature = $this->variantSignature([
            'condition' => $row['Condition'] ?? '',
            'model_code' => $row['Model Code'] ?? '',
            'color' => $row['Color'] ?? '',
            'ram' => $row['RAM'] ?? '',
            'rom' => $row['ROM'] ?? '',
            'cpu' => $row['CPU'] ?? '',
            'gpu' => $row['GPU'] ?? '',
            'ram_type' => $row['RAM Type'] ?? '',
            'rom_type' => $row['ROM Type'] ?? '',
            'operating_system' => $row['Operating System'] ?? '',
            'screen' => $row['Screen'] ?? '',
        ]);

        return array_values(array_filter($variants, fn (array $variant): bool => ($variant['signature'] ?? '') === $rowSignature));
    }

    /**
     * @return array{
     *     variant: ProductVariant|null,
     *     signature: string,
     *     condition: string,
     *     model_code: string,
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
        $attributes = [
            'condition' => $variant->condition,
            'model_code' => $variant->model_code ?? '',
            'color' => $variant->color ?? '',
            'ram' => $variant->ram ?? '',
            'rom' => $variant->rom ?? '',
            'cpu' => $variant->cpu ?? '',
            'gpu' => $variant->gpu ?? '',
            'ram_type' => $variant->ram_type ?? '',
            'rom_type' => $variant->rom_type ?? '',
            'operating_system' => $variant->operating_system ?? '',
            'screen' => $variant->screen ?? '',
        ];

        return [
            'variant' => $variant,
            'signature' => $this->variantSignature($attributes),
            'condition' => $this->normalizeCondition($attributes['condition']),
            'model_code' => $this->normalizeSignatureText($attributes['model_code']),
            'color' => $this->normalizeSignatureText($attributes['color']),
            'ram' => $this->normalizeStorageValue($attributes['ram']),
            'rom' => $this->normalizeStorageValue($attributes['rom']),
            'cpu' => $this->normalizeSignatureText($attributes['cpu']),
            'gpu' => $this->normalizeSignatureText($attributes['gpu']),
            'ram_type' => $this->normalizeSignatureText($attributes['ram_type']),
            'rom_type' => $this->normalizeSignatureText($attributes['rom_type']),
            'operating_system' => $this->normalizeSignatureText($attributes['operating_system']),
            'screen' => $this->normalizeSignatureText($attributes['screen']),
        ];
    }

    /**
     * @return array{
     *     variant: ProductVariant|null,
     *     signature: string,
     *     condition: string,
     *     model_code: string,
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
        $attributes = [
            'condition' => $row['Condition'] ?? '',
            'model_code' => $row['Model Code'] ?? '',
            'color' => $row['Color'] ?? '',
            'ram' => $row['RAM'] ?? '',
            'rom' => $row['ROM'] ?? '',
            'cpu' => $row['CPU'] ?? '',
            'gpu' => $row['GPU'] ?? '',
            'ram_type' => $row['RAM Type'] ?? '',
            'rom_type' => $row['ROM Type'] ?? '',
            'operating_system' => $row['Operating System'] ?? '',
            'screen' => $row['Screen'] ?? '',
        ];

        return [
            'variant' => null,
            'signature' => $this->variantSignature($attributes),
            'condition' => $this->normalizeCondition($attributes['condition']),
            'model_code' => $this->normalizeSignatureText($attributes['model_code']),
            'color' => $this->normalizeSignatureText($attributes['color']),
            'ram' => $this->normalizeStorageValue($attributes['ram']),
            'rom' => $this->normalizeStorageValue($attributes['rom']),
            'cpu' => $this->normalizeSignatureText($attributes['cpu']),
            'gpu' => $this->normalizeSignatureText($attributes['gpu']),
            'ram_type' => $this->normalizeSignatureText($attributes['ram_type']),
            'rom_type' => $this->normalizeSignatureText($attributes['rom_type']),
            'operating_system' => $this->normalizeSignatureText($attributes['operating_system']),
            'screen' => $this->normalizeSignatureText($attributes['screen']),
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
            'serial_number' => $this->resolveSerialNumber($row),
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
            'serial_number' => $this->resolveSerialNumber($row),
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
        $grnNumber = $this->valueFromAliases($row, ['GRN Number', 'Purchase']);

        return [
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => $this->cleanIdentifier($row['IMEI 1'] ?? null),
            'imei2' => $this->cleanIdentifier($row['IMEI 2'] ?? null),
            'serial_number' => $this->resolveSerialNumber($row),
            'status' => $this->resolveStatus($row['Status'] ?? null),
            'cost_price' => $this->parseNumber($row['Cost'] ?? null),
            'cash_price' => $this->parseNumber($row['Cash'] ?? null),
            'srp_price' => $this->parseNumber($row['SRP'] ?? null),
            'package' => $this->collapseWhitespace($row['Package'] ?? ''),
            'warranty' => $this->collapseWhitespace($row['Warranty'] ?? ''),
            'product_type' => $this->collapseWhitespace($row['Product Type'] ?? ''),
            'with_charger' => $this->parseBoolean($row['With Charger'] ?? null),
            'encoded_at' => now(),
            'grn_number' => $this->collapseWhitespace($grnNumber),
        ];
    }

    private function collapseWhitespace(mixed $value): string
    {
        $value = $this->sanitizeText((string) $value);

        return preg_replace('/\s+/', ' ', trim($value)) ?: '';
    }

    private function sanitizeText(string $value): string
    {
        $cleanValue = iconv('UTF-8', 'UTF-8//IGNORE', $value);
        $value = $cleanValue === false ? $value : $cleanValue;

        $value = str_replace("\xEF\xBF\xBD", '', $value);

        return preg_replace('/[\p{C}&&[^\t\r\n]]/u', '', $value) ?: '';
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

    private function resolveSerialNumber(array $row): ?string
    {
        $serialNumber = $this->valueFromAliases($row, ['Serial Number']);
        $candidate = $serialNumber !== ''
            ? $serialNumber
            : $this->valueFromAliases($row, ['Barcode']);

        return $this->cleanIdentifier($candidate);
    }

    private function normalizeStorageValue(mixed $value): string
    {
        $value = $this->collapseWhitespace($value);

        if ($value === '') {
            return '';
        }

        if (preg_match('/^(?<number>\d+(?:\.\d+)?)\s*(?<unit>gb|tb|mb)?$/i', $value, $matches) === 1) {
            $number = (float) $matches['number'];
            $unit = strtolower((string) ($matches['unit'] ?? 'gb'));

            $valueInGb = match ($unit) {
                'tb' => $number * 1024,
                'mb' => $number / 1024,
                default => $number,
            };

            if (is_finite($valueInGb)) {
                $normalized = rtrim(rtrim(number_format($valueInGb, 6, '.', ''), '0'), '.');

                return $normalized === '' ? '0' : $normalized;
            }
        }

        return $this->normalizeSignatureText($value);
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
        $mapped['Model Code'] = $this->valueFromAliases($row, ['Model Code']);
        $mapped['GRN Number'] = $this->valueFromAliases($row, ['GRN Number', 'Purchase']);

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

    private function sanitizeForLooseMatch(mixed $value): string
    {
        $value = $this->normalizeKey($value);
        $value = preg_replace('/[^a-z0-9]+/i', '', $value) ?: '';

        return $value;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function uniqueSku(ProductMaster $productMaster, string $condition, array $attributes): string
    {
        $baseSku = $this->generatesProductVariantSku->fromAttributes($productMaster, $condition, $attributes);

        if (! ProductVariant::query()->where('sku', $baseSku)->exists()) {
            return $baseSku;
        }

        $expansionAttributes = [
            'cpu' => $attributes['cpu'] ?? '',
            'gpu' => $attributes['gpu'] ?? '',
            'ram_type' => $attributes['ram_type'] ?? '',
            'rom_type' => $attributes['rom_type'] ?? '',
            'operating_system' => $attributes['operating_system'] ?? '',
            'screen' => $attributes['screen'] ?? '',
        ];

        $suffixParts = [];
        foreach ($expansionAttributes as $attributeValue) {
            $part = Str::upper($this->normalizeSignatureText($attributeValue));
            if ($part !== '') {
                $suffixParts[] = $part;
            }
        }

        if ($suffixParts === []) {
            throw new RuntimeException("Unable to create variant SKU without numeric suffix. Base SKU collision: {$baseSku}.");
        }

        $expandedSku = $baseSku.'-'.implode('-', $suffixParts);

        if (ProductVariant::query()->where('sku', $expandedSku)->exists()) {
            throw new RuntimeException("Unable to create variant SKU; expanded SKU collision: {$expandedSku}.");
        }

        return $expandedSku;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function variantSignature(array $attributes): string
    {
        $normalized = [
            'condition' => $this->normalizeCondition($attributes['condition'] ?? ''),
            'model_code' => $this->normalizeSignatureText($attributes['model_code'] ?? ''),
            'color' => $this->normalizeSignatureText($attributes['color'] ?? ''),
            'ram' => $this->normalizeStorageValue($attributes['ram'] ?? ''),
            'rom' => $this->normalizeStorageValue($attributes['rom'] ?? ''),
            'cpu' => $this->normalizeSignatureText($attributes['cpu'] ?? ''),
            'gpu' => $this->normalizeSignatureText($attributes['gpu'] ?? ''),
            'ram_type' => $this->normalizeSignatureText($attributes['ram_type'] ?? ''),
            'rom_type' => $this->normalizeSignatureText($attributes['rom_type'] ?? ''),
            'operating_system' => $this->normalizeSignatureText($attributes['operating_system'] ?? ''),
            'screen' => $this->normalizeSignatureText($attributes['screen'] ?? ''),
        ];

        return implode('|', [
            $normalized['condition'],
            $normalized['model_code'],
            $normalized['color'],
            $normalized['ram'],
            $normalized['rom'],
            $normalized['cpu'],
            $normalized['gpu'],
            $normalized['ram_type'],
            $normalized['rom_type'],
            $normalized['operating_system'],
            $normalized['screen'],
        ]);
    }

    private function normalizeSignatureText(mixed $value): string
    {
        return $this->sanitizeForLooseMatch($value);
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, mixed>  $references
     */
    private function findNearestProductMaster(array $row, array $references, ?string $masterSku = null): ?ProductMaster
    {
        $productMasters = $references['productMasters'] ?? [];
        $productMasters = $productMasters instanceof \Illuminate\Support\Collection
            ? $productMasters->all()
            : (array) $productMasters;

        $masters = array_values(array_filter(
            $productMasters,
            fn ($master): bool => $master instanceof ProductMaster
        ));

        if ($masterSku !== null) {
            $skuMatches = ProductMaster::query()
                ->with(['model.brand', 'subcategory.parent'])
                ->where('master_sku', $masterSku)
                ->get()
                ->all();

            $masters = array_values(array_reduce(
                array_merge($skuMatches, $masters),
                function (array $carry, ProductMaster $master): array {
                    $carry[(int) $master->id] = $master;

                    return $carry;
                },
                [],
            ));
        }

        if ($masters === []) {
            $masters = ProductMaster::query()
                ->with(['model.brand', 'subcategory.parent'])
                ->get()
                ->all();
        }

        if ($masters === []) {
            return null;
        }

        $rowBrand = $this->normalizeKey($row['Brand'] ?? '');
        $rowModel = $this->normalizeKey($row['Model'] ?? '');
        $rowCombined = $this->sanitizeForLooseMatch($rowBrand.' '.$rowModel);

        $sameBrand = array_values(array_filter(
            $masters,
            fn (ProductMaster $master): bool => $this->normalizeKey($master->model?->brand?->name ?? '') === $rowBrand
        ));
        $candidates = $sameBrand !== [] ? $sameBrand : $masters;

        $ranked = [];
        foreach ($candidates as $candidate) {
            $candidateBrand = $this->normalizeKey($candidate->model?->brand?->name ?? '');
            $candidateModel = $this->normalizeKey($candidate->model?->model_name ?? '');
            $candidateCombined = $this->sanitizeForLooseMatch($candidateBrand.' '.$candidateModel);
            $similarity = $this->textSimilarity($rowCombined, $candidateCombined);
            $distance = levenshtein($rowCombined, $candidateCombined);

            $ranked[] = [
                'master' => $candidate,
                'similarity' => $similarity,
                'exact_brand' => $candidateBrand === $rowBrand,
                'exact_model' => $candidateModel === $rowModel,
                'distance' => $distance,
                'id' => (int) $candidate->id,
            ];
        }

        usort($ranked, function (array $a, array $b): int {
            $similarityComparison = $b['similarity'] <=> $a['similarity'];
            if ($similarityComparison !== 0) {
                return $similarityComparison;
            }

            $exactBrandComparison = (int) $b['exact_brand'] <=> (int) $a['exact_brand'];
            if ($exactBrandComparison !== 0) {
                return $exactBrandComparison;
            }

            $exactModelComparison = (int) $b['exact_model'] <=> (int) $a['exact_model'];
            if ($exactModelComparison !== 0) {
                return $exactModelComparison;
            }

            $distanceComparison = $a['distance'] <=> $b['distance'];
            if ($distanceComparison !== 0) {
                return $distanceComparison;
            }

            return $a['id'] <=> $b['id'];
        });

        return ($ranked[0] ?? null)['master'] ?? null;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, mixed>  $references
     */
    private function findNearestVariant(array $row, int $masterId, array $references): ?ProductVariant
    {
        $descriptors = $references['variantsByMaster'][$masterId] ?? [];
        if (! is_array($descriptors) || $descriptors === []) {
            return null;
        }

        return $this->findNearestVariantFromDescriptors($row, $descriptors);
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<int, array<string, mixed>>  $descriptors
     */
    private function findNearestVariantFromDescriptors(array $row, array $descriptors): ?ProductVariant
    {
        $rowDescriptor = $this->buildPredictedVariantDescriptor($row);
        $fields = ['condition', 'model_code', 'color', 'ram', 'rom', 'cpu', 'gpu', 'ram_type', 'rom_type', 'operating_system', 'screen'];
        $ranked = [];

        foreach ($descriptors as $descriptor) {
            $candidateVariant = $descriptor['variant'] ?? null;
            if (! $candidateVariant instanceof ProductVariant) {
                continue;
            }

            $score = 0;
            foreach ($fields as $field) {
                if (($descriptor[$field] ?? '') === ($rowDescriptor[$field] ?? '')) {
                    $score++;
                }
            }

            $ranked[] = [
                'variant' => $candidateVariant,
                'score' => $score,
                'exact_signature' => ($descriptor['signature'] ?? '') === ($rowDescriptor['signature'] ?? ''),
                'id' => (int) $candidateVariant->id,
            ];
        }

        if ($ranked === []) {
            return null;
        }

        usort($ranked, function (array $a, array $b): int {
            $scoreComparison = $b['score'] <=> $a['score'];
            if ($scoreComparison !== 0) {
                return $scoreComparison;
            }

            $signatureComparison = (int) $b['exact_signature'] <=> (int) $a['exact_signature'];
            if ($signatureComparison !== 0) {
                return $signatureComparison;
            }

            return $a['id'] <=> $b['id'];
        });

        return ($ranked[0] ?? null)['variant'] ?? null;
    }

    private function textSimilarity(string $left, string $right): float
    {
        if ($left === '' || $right === '') {
            return 0.0;
        }

        similar_text($left, $right, $percent);

        return $percent / 100;
    }

    private function isVariantSkuCollisionException(\Throwable $exception): bool
    {
        $message = Str::lower($exception->getMessage());

        return str_contains($message, 'expanded sku collision')
            || str_contains($message, 'base sku collision')
            || (str_contains($message, 'sku') && str_contains($message, 'duplicate'))
            || str_contains($message, 'product_variants_sku_unique');
    }

    /**
     * @return array<int, array{
     *     variant: ProductVariant|null,
     *     signature: string,
     *     condition: string,
     *     model_code: string,
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
    private function loadVariantDescriptorsForMaster(int $productMasterId): array
    {
        return ProductVariant::query()
            ->where('product_master_id', $productMasterId)
            ->get()
            ->map(fn (ProductVariant $variant): array => $this->buildVariantDescriptor($variant))
            ->values()
            ->all();
    }

    private function cacheKey(string $importToken): string
    {
        return self::CACHE_PREFIX.$importToken;
    }
}
