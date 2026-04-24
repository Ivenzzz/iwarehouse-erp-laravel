<?php

namespace App\Features\StockTransfers\Support;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Models\InventoryItem;
use App\Models\StockTransfer;
use App\Models\StockTransferConsolidationSource;
use App\Models\StockTransferMilestone;
use App\Models\StockTransferReceipt;
use App\Models\StockTransferReceiptItem;
use App\Models\StockTransferItem;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class StockTransferDataTransformer
{
    public const RELATIONS = [
        'createdBy',
        'sourceWarehouse',
        'destinationWarehouse',
        'items.inventoryItem.productVariant.productMaster.model.brand',
        'milestones.actor',
        'shipment',
        'receipts.items.inventoryItem.productVariant.productMaster.model.brand',
        'receipts.photos',
        'receipts.receivedBy',
        'consolidation.sources.sourceTransfer',
        'sourceConsolidationLink.consolidation.masterTransfer',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function transformTransfer(StockTransfer $transfer): array
    {
        $transfer->loadMissing(self::RELATIONS);

        $milestones = $transfer->milestones->keyBy('milestone_type');
        $latestReceipt = $transfer->receipts->sortByDesc('received_at')->first();
        $productLines = $transfer->items
            ->map(fn (StockTransferItem $item) => self::transformTransferItem($item))
            ->values()
            ->all();

        $missingItems = $transfer->items
            ->filter(fn (StockTransferItem $item) => ! $item->is_received)
            ->map(fn (StockTransferItem $item) => self::transformTransferItem($item))
            ->unique(fn (array $item) => $item['inventory_id'] ?? $item['identifier'])
            ->values()
            ->all();

        $overageItems = $transfer->receipts
            ->flatMap(fn (StockTransferReceipt $receipt) => $receipt->items)
            ->filter(fn (StockTransferReceiptItem $item) => $item->receipt_item_type === 'overage')
            ->map(fn (StockTransferReceiptItem $item) => self::transformReceiptItem($item))
            ->unique(fn (array $item) => $item['inventory_id'] ?? $item['identifier'])
            ->values()
            ->all();

        $unknownItems = $transfer->receipts
            ->flatMap(fn (StockTransferReceipt $receipt) => $receipt->items)
            ->filter(fn (StockTransferReceiptItem $item) => $item->receipt_item_type === 'unknown')
            ->map(fn (StockTransferReceiptItem $item) => [
                'barcode' => $item->scanned_barcode,
            ])
            ->filter(fn (array $item) => ! empty($item['barcode']))
            ->values()
            ->all();

        return [
            'id' => $transfer->id,
            'transfer_number' => $transfer->transfer_number,
            'source_location_id' => $transfer->source_warehouse_id,
            'destination_location_id' => $transfer->destination_warehouse_id,
            'source_location' => $transfer->sourceWarehouse
                ? InventoryDataTransformer::transformWarehouse($transfer->sourceWarehouse)
                : null,
            'destination_location' => $transfer->destinationWarehouse
                ? InventoryDataTransformer::transformWarehouse($transfer->destinationWarehouse)
                : null,
            'created_by' => self::transformUser($transfer->createdBy),
            'reference' => $transfer->reference,
            'notes' => $transfer->notes,
            'status' => $transfer->status,
            'operation_type' => $transfer->operation_type,
            'priority' => $transfer->priority,
            'created_date' => optional($transfer->created_at)?->toDateTimeString(),
            'dates_json' => [
                'picked_date' => self::milestoneDate($milestones, 'picked'),
                'shipped_date' => self::milestoneDate($milestones, 'shipped'),
                'received_date' => self::milestoneDate($milestones, 'received'),
            ],
            'product_lines' => $productLines,
            'summary' => self::buildTransferSummary($productLines),
            'actors_json' => [
                'created_by_id' => $transfer->created_by_id,
                'created_by_name' => $transfer->createdBy?->name,
                'picked_by_id' => self::milestoneActorId($milestones, 'picked'),
                'picked_by_name' => self::milestoneActorName($milestones, 'picked'),
                'shipped_by_id' => self::milestoneActorId($milestones, 'shipped'),
                'shipped_by_name' => self::milestoneActorName($milestones, 'shipped'),
                'received_by_id' => self::milestoneActorId($milestones, 'received'),
                'received_by_name' => self::milestoneActorName($milestones, 'received'),
            ],
            'logistics_json' => [
                'driver_name' => $transfer->shipment?->driver_name,
                'driver_contact' => $transfer->shipment?->driver_contact,
                'courier_name' => $transfer->shipment?->courier_name ?: 'iWarehouse Logistics',
                'proof_of_dispatch_url' => self::fileUrl($transfer->shipment?->proof_of_dispatch_path),
                'remarks' => $transfer->shipment?->remarks,
            ],
            'receiving_json' => [
                'branch_remarks' => $latestReceipt?->branch_remarks,
                'discrepancy_reason' => $latestReceipt?->discrepancy_reason,
                'photo_proof_url' => self::fileUrl($latestReceipt?->photos->first()?->image_path),
            ],
            'missing_items_json' => $missingItems,
            'overage_items_json' => $overageItems,
            'unknown_items_json' => $unknownItems,
            'consolidation_json' => self::transformConsolidation($transfer),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function transformUser(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }

        return [
            'id' => $user->id,
            'email' => $user->email,
            'full_name' => $user->name,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public static function transformInventoryUnit(?InventoryItem $item, array $overrides = []): array
    {
        $item?->loadMissing([
            'productVariant.productMaster.model.brand',
        ]);

        $variant = $item?->productVariant;
        $productMaster = $variant?->productMaster;
        $brand = $productMaster?->model?->brand;
        $productName = trim(implode(' ', array_filter([
            $overrides['brand_name'] ?? $brand?->name,
            $productMaster?->model?->model_name,
        ])));
        $variantName = $overrides['variant_name'] ?? $variant?->variant_name ?? ($productName !== '' ? $productName : 'Unknown Item');
        $identifier = $overrides['identifier']
            ?? $overrides['imei1']
            ?? $overrides['imei2']
            ?? $overrides['serial_number']
            ?? $item?->imei
            ?? $item?->imei2
            ?? $item?->serial_number
            ?? ($item?->id ? (string) $item->id : 'Unknown Identifier');

        return [
            'inventory_id' => $overrides['inventory_id'] ?? $item?->id,
            'product_master_id' => $overrides['product_master_id'] ?? $productMaster?->id,
            'variant_id' => $overrides['variant_id'] ?? $variant?->id,
            'product_name' => $overrides['product_name'] ?? ($productName !== '' ? $productName : 'Unknown Product'),
            'variant_name' => $variantName,
            'brand_name' => $overrides['brand_name'] ?? $brand?->name,
            'model_code' => $overrides['model_code'] ?? $variant?->model_code,
            'ram' => $overrides['ram'] ?? $variant?->ram,
            'rom' => $overrides['rom'] ?? $variant?->rom,
            'cpu' => $overrides['cpu'] ?? $variant?->cpu,
            'gpu' => $overrides['gpu'] ?? $variant?->gpu,
            'color' => $overrides['color'] ?? $variant?->color,
            'condition' => $overrides['condition'] ?? $variant?->condition,
            'identifier' => $identifier,
            'imei1' => $overrides['imei1'] ?? $item?->imei,
            'imei2' => $overrides['imei2'] ?? $item?->imei2,
            'serial_number' => $overrides['serial_number'] ?? $item?->serial_number,
            'cost_price' => array_key_exists('cost_price', $overrides)
                ? $overrides['cost_price']
                : ($item?->cost_price !== null ? (float) $item->cost_price : 0.0),
        ];
    }

    private static function milestoneDate($milestones, string $type): ?string
    {
        /** @var StockTransferMilestone|null $milestone */
        $milestone = $milestones->get($type);

        return optional($milestone?->occurred_at)?->toDateTimeString();
    }

    private static function milestoneActorId($milestones, string $type): ?int
    {
        /** @var StockTransferMilestone|null $milestone */
        $milestone = $milestones->get($type);

        return $milestone?->actor_id;
    }

    private static function milestoneActorName($milestones, string $type): ?string
    {
        /** @var StockTransferMilestone|null $milestone */
        $milestone = $milestones->get($type);

        return $milestone?->actor?->name;
    }

    /**
     * @return array<string, mixed>
     */
    private static function transformTransferItem(StockTransferItem $item): array
    {
        return [
            ...self::transformInventoryUnit($item->inventoryItem, [
                'inventory_id' => $item->inventory_item_id,
            ]),
            'is_picked' => (bool) $item->is_picked,
            'is_shipped' => (bool) $item->is_shipped,
            'is_received' => (bool) $item->is_received,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function transformReceiptItem(StockTransferReceiptItem $item): array
    {
        return self::transformInventoryUnit($item->inventoryItem, [
            'inventory_id' => $item->inventory_item_id,
            'product_name' => $item->product_name,
            'variant_name' => $item->variant_name,
            'imei1' => $item->imei1,
            'imei2' => $item->imei2,
            'serial_number' => $item->serial_number,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $productLines
     * @return array<string, mixed>
     */
    private static function buildTransferSummary(array $productLines): array
    {
        $previewItems = collect($productLines)
            ->groupBy(fn (array $line, int $index) => $line['variant_id'] ?? $line['inventory_id'] ?? "line-{$index}")
            ->map(function ($lines, $key) {
                $identifiers = $lines
                    ->pluck('identifier')
                    ->filter()
                    ->values();

                return [
                    'key' => $key,
                    'variant_name' => $lines->first()['variant_name'] ?? $lines->first()['product_name'] ?? 'Unknown Item',
                    'qty' => $lines->count(),
                    'preview_identifier' => $identifiers->count() <= 1
                        ? ($identifiers->first() ?? 'Quantity Tracked Only')
                        : sprintf('%s +%d more', $identifiers->first(), $identifiers->count() - 1),
                ];
            })
            ->values()
            ->all();

        return [
            'total_items' => count($productLines),
            'total_cost' => round(collect($productLines)->sum(fn (array $line) => (float) ($line['cost_price'] ?? 0)), 2),
            'preview_items' => $previewItems,
        ];
    }

    private static function transformConsolidation(StockTransfer $transfer): array
    {
        if ($transfer->consolidation !== null) {
            return [
                'role' => 'master',
                'source_transfer_ids' => $transfer->consolidation->sources->pluck('source_stock_transfer_id')->values()->all(),
                'source_transfer_numbers' => $transfer->consolidation->sources
                    ->map(fn (StockTransferConsolidationSource $source) => $source->sourceTransfer?->transfer_number)
                    ->filter()
                    ->values()
                    ->all(),
            ];
        }

        $sourceLink = $transfer->sourceConsolidationLink;
        if ($sourceLink !== null) {
            return [
                'role' => 'source',
                'merged_into_transfer_id' => $sourceLink->consolidation?->masterTransfer?->id,
                'merged_into_transfer_number' => $sourceLink->consolidation?->masterTransfer?->transfer_number,
                'source_transfer_ids' => [],
            ];
        }

        return [];
    }

    private static function fileUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
