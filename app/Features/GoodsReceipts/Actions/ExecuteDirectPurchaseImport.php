<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Features\DeliveryReceipts\Actions\CreateDeliveryReceipt;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExecuteDirectPurchaseImport
{
    public function __construct(
        private readonly CreateDeliveryReceipt $createDeliveryReceipt,
        private readonly CreateGoodsReceipt $createGoodsReceipt,
        private readonly ValidateGoodsReceiptDuplicates $validateGoodsReceiptDuplicates,
    ) {
    }

    public function handle(array $validated, ?int $userId): array
    {
        return DB::transaction(function () use ($validated, $userId) {
            $validatedRows = $validated['validatedRows'];

            if (! is_array($validatedRows) || count($validatedRows) === 0) {
                throw new RuntimeException('No validated rows found.');
            }

            $grnItems = collect($validatedRows)->map(function (array $row) {
                return [
                    'variant_id' => (int) ($row['variant_id'] ?? 0),
                    'identifiers' => [
                        'imei1' => trim((string) ($row['imei1'] ?? '')),
                        'imei2' => trim((string) ($row['imei2'] ?? '')),
                        'serial_number' => trim((string) ($row['serial_number'] ?? '')),
                    ],
                    'pricing' => [
                        'cost_price' => (float) ($row['cost_price'] ?? 0),
                        'cash_price' => (float) ($row['cash_price'] ?? 0),
                        'srp' => (float) ($row['srp'] ?? 0),
                    ],
                    'spec' => [
                        'cpu' => $row['cpu'] ?? null,
                        'gpu' => $row['gpu'] ?? null,
                        'submodel' => $row['submodel'] ?? null,
                        'ram_type' => $row['ram_type'] ?? null,
                        'rom_type' => $row['rom_type'] ?? null,
                        'ram_slots' => $row['ram_slots'] ?? null,
                        'product_type' => $row['product_type'] ?? null,
                        'country_model' => $row['country_model'] ?? null,
                        'with_charger' => in_array(strtolower((string) ($row['with_charger'] ?? '')), ['1', 'true', 'yes'], true),
                        'resolution' => $row['resolution'] ?? null,
                    ],
                    'package' => $row['package'] ?? null,
                    'warranty' => $row['warranty'] ?? null,
                    'condition' => $row['condition'] ?? null,
                    'item_notes' => $row['details'] ?? null,
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
                ->groupBy(fn (array $row) => (int) ($row['product_master_id'] ?? 0))
                ->map(function ($rows, $productMasterId) {
                    /** @var ProductMaster|null $pm */
                    $pm = ProductMaster::query()->find((int) $productMasterId);
                    $first = $rows[0];
                    return [
                        'product_master_id' => (int) $productMasterId,
                        'actual_quantity' => count($rows),
                        'unit_cost' => (float) ($first['cost_price'] ?? 0),
                        'cash_price' => (float) ($first['cash_price'] ?? 0),
                        'srp_price' => (float) ($first['srp'] ?? 0),
                        'product_spec' => [
                            'model_code' => $first['model_code'] ?? null,
                            'ram' => $first['ram_capacity'] ?? null,
                            'rom' => $first['rom_capacity'] ?? null,
                            'condition' => $first['condition'] ?? null,
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
}
