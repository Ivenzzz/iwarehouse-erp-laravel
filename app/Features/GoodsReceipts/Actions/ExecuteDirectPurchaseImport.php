<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Features\DeliveryReceipts\Actions\CreateDeliveryReceipt;
use App\Models\ProductMaster;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExecuteDirectPurchaseImport
{
    public function __construct(
        private readonly CreateDeliveryReceipt $createDeliveryReceipt,
        private readonly CreateGoodsReceipt $createGoodsReceipt,
        private readonly ValidateGoodsReceiptDuplicates $validateGoodsReceiptDuplicates,
    ) {}

    public function handle(array $validated, ?int $userId): array
    {
        return DB::transaction(function () use ($validated, $userId) {
            $validatedRows = $validated['validatedRows'];

            if (! is_array($validatedRows) || count($validatedRows) === 0) {
                throw new RuntimeException('No validated rows found.');
            }

            $grnItems = collect($validatedRows)->map(function (array $row) {
                $raw = (array) ($row['row'] ?? []);
                $imei1Direct = trim((string) ($row['imei1'] ?? ($raw['IMEI 1'] ?? '')));
                $imei1 = $imei1Direct !== '' ? $imei1Direct : trim((string) ($raw['Barcode'] ?? ''));
                $imei2 = trim((string) ($row['imei2'] ?? ($raw['IMEI 2'] ?? '')));
                $serial = trim((string) ($row['serial_number'] ?? ($raw['Serial Number'] ?? '')));

                if ($serial === '' && $imei1 === '' && $imei2 === '') {
                    $rowIndex = (int) ($row['rowIndex'] ?? 0);
                    $label = $rowIndex > 0 ? "Row {$rowIndex}" : 'Import row';
                    throw new RuntimeException("{$label}: At least one of Serial Number, IMEI 1, IMEI 2, or Barcode (used when IMEI 1 is empty) is required.");
                }

                return [
                    'variant_id' => (int) ($row['variant_id'] ?? 0),
                    'identifiers' => [
                        'imei1' => $imei1,
                        'imei2' => $imei2,
                        'serial_number' => $serial,
                    ],
                    'pricing' => [
                        'cost_price' => (float) ($row['cost_price'] ?? $this->parseNumber($raw['Cost'] ?? 0)),
                        'cash_price' => (float) ($row['cash_price'] ?? $this->parseNumber($raw['Cash Price'] ?? 0)),
                        'srp' => (float) ($row['srp'] ?? $this->parseNumber($raw['SRP'] ?? 0)),
                    ],
                    'spec' => [
                        'cpu' => $row['cpu'] ?? ($raw['CPU'] ?? null),
                        'gpu' => $row['gpu'] ?? ($raw['GPU'] ?? null),
                        'submodel' => $row['submodel'] ?? ($raw['Submodel'] ?? null),
                        'ram_type' => $row['ram_type'] ?? ($raw['Ram Type'] ?? null),
                        'rom_type' => $row['rom_type'] ?? ($raw['Rom Type'] ?? null),
                        'ram_slots' => $row['ram_slots'] ?? ($raw['Ram Slots'] ?? null),
                        'product_type' => $row['product_type'] ?? ($raw['Product Type'] ?? null),
                        'country_model' => $row['country_model'] ?? ($raw['Country Model'] ?? null),
                        'with_charger' => $this->parseBooleanLike($row['with_charger'] ?? ($raw['With Charger'] ?? '')),
                        'resolution' => $row['resolution'] ?? ($raw['Resolution'] ?? null),
                    ],
                    'package' => $row['package'] ?? ($raw['Package'] ?? null),
                    'warranty' => $row['warranty'] ?? ($raw['Warranty'] ?? null),
                    'condition' => $this->normalizeCondition((string) ($row['condition'] ?? ($raw['Condition'] ?? ''))),
                    'item_notes' => $this->buildItemNotes($row, $raw),
                ];
            })->values()->all();

            $duplicates = $this->validateGoodsReceiptDuplicates->handle($grnItems);
            if (count($duplicates) > 0) {
                return ['duplicates' => $duplicates];
            }

            $warehouseId = (int) $validated['warehouseId'];
            $warehouse = Warehouse::query()->find($warehouseId);
            if (! $warehouse) {
                throw new RuntimeException('Warehouse not found.');
            }

            $supplierId = (int) data_get($validated, 'formData.supplierId');
            $drNumber = trim((string) data_get($validated, 'formData.drNumber'));
            $arrivalDate = data_get($validated, 'formData.arrivalDate') ?: now()->toDateTimeString();

            $declaredItems = collect($validatedRows)
                ->groupBy(function (array $row) {
                    $raw = (array) ($row['row'] ?? []);
                    $condition = $this->normalizeCondition((string) ($row['condition'] ?? ($raw['Condition'] ?? '')));
                    $ram = trim((string) ($row['ram_capacity'] ?? ($raw['Ram Capacity'] ?? '')));
                    $rom = trim((string) ($row['rom_capacity'] ?? ($raw['Rom Capacity'] ?? '')));
                    $cost = (float) ($row['cost_price'] ?? $this->parseNumber($raw['Cost'] ?? 0));
                    $cash = (float) ($row['cash_price'] ?? $this->parseNumber($raw['Cash Price'] ?? 0));
                    $srp = (float) ($row['srp'] ?? $this->parseNumber($raw['SRP'] ?? 0));

                    return implode('::', [(int) ($row['product_master_id'] ?? 0), $ram, $rom, $condition, $cost, $cash, $srp]);
                })
                ->map(function ($rows, $groupKey) {
                    /** @var ProductMaster|null $pm */
                    $first = $rows->first();
                    $raw = (array) (($first['row'] ?? []));
                    $parts = explode('::', (string) $groupKey);
                    $productMasterId = (int) ($parts[0] ?? 0);
                    $pm = ProductMaster::query()->find($productMasterId);
                    $condition = $this->normalizeCondition((string) ($first['condition'] ?? ($raw['Condition'] ?? '')));

                    return [
                        'product_master_id' => (int) $productMasterId,
                        'actual_quantity' => count($rows),
                        'unit_cost' => (float) ($first['cost_price'] ?? $this->parseNumber($raw['Cost'] ?? 0)),
                        'cash_price' => (float) ($first['cash_price'] ?? $this->parseNumber($raw['Cash Price'] ?? 0)),
                        'srp_price' => (float) ($first['srp'] ?? $this->parseNumber($raw['SRP'] ?? 0)),
                        'product_spec' => [
                            'model_code' => $first['model_code'] ?? ($raw['Model Code'] ?? null),
                            'ram' => $first['ram_capacity'] ?? ($raw['Ram Capacity'] ?? null),
                            'rom' => $first['rom_capacity'] ?? ($raw['Rom Capacity'] ?? null),
                            'condition' => $condition,
                        ],
                    ];
                })->values()->all();

            $dr = $this->createDeliveryReceipt->handle([
                'supplier_id' => $supplierId,
                'dr_number' => $drNumber !== '' ? $drNumber : 'DR-'.now()->format('YmdHis'),
                'date_received' => $arrivalDate,
                'reference_number' => data_get($validated, 'formData.trackingNumber'),
                'logistics' => [
                    'logistics_company' => 'Direct Purchase',
                    'waybill_number' => data_get($validated, 'formData.trackingNumber'),
                    'origin' => 'Direct Purchase',
                    'destination' => $warehouse->name,
                    'freight_cost' => 0,
                ],
                'uploads' => [
                    'purchase_file_url' => data_get($validated, 'formData.purchaseFileUrl'),
                    'uploads_complete' => true,
                    'box_photos' => [],
                ],
                'declared_items' => $declaredItems,
                'summary' => [
                    'box_count_declared' => 1,
                    'box_count_received' => 1,
                ],
            ], $userId);

            $grnNumber = 'GRN-'.now()->format('ymdHis');
            $grn = $this->createGoodsReceipt->handle([
                'grn_number' => $grnNumber,
                'dr_id' => $dr->id,
                'status' => 'completed',
                'notes' => 'Auto-generated from direct purchase import',
                'warehouse_id' => $warehouseId,
                'items' => $grnItems,
                'discrepancy_info' => [
                    'has_discrepancy' => false,
                    'discrepancy_summary' => null,
                ],
            ], $userId);

            return [
                'drNumber' => $dr->dr_number,
                'grnNumber' => $grn->grn_number,
                'itemCount' => count($grnItems),
            ];
        });
    }

    private function parseNumber(mixed $value): float
    {
        $clean = preg_replace('/[^\d.\-]/', '', (string) $value);

        return is_numeric($clean) ? (float) $clean : 0.0;
    }

    private function parseBooleanLike(mixed $value): bool
    {
        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'yes', 'y', 'with charger', 'included'], true);
    }

    private function normalizeCondition(string $value): string
    {
        $normalized = preg_replace('/[^a-z0-9]/', '', strtolower(trim($value))) ?: '';
        if (in_array($normalized, ['certifiedpreowned', 'preowned', 'cpo'], true)) {
            return 'Certified Pre-Owned';
        }
        if ($normalized === 'refurbished') {
            return 'Refurbished';
        }

        return 'Brand New';
    }

    private function buildItemNotes(array $row, array $raw): ?string
    {
        $notes = array_filter([
            trim((string) ($row['details'] ?? ($raw['Details'] ?? ''))),
            trim((string) ($raw['Intro'] ?? '')),
            trim((string) ($raw['Product Details'] ?? '')),
        ], fn ($value) => $value !== '');

        if (count($notes) === 0) {
            return null;
        }

        return implode(' | ', $notes);
    }
}
