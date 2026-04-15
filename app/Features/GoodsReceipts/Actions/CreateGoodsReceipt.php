<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Models\DeliveryReceipt;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptDiscrepancy;
use App\Models\GoodsReceiptItem;
use App\Models\GoodsReceiptItemDetail;
use App\Models\GoodsReceiptItemIdentifier;
use App\Models\InventoryItem;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CreateGoodsReceipt
{
    public function handle(array $validated, ?int $userId): GoodsReceipt
    {
        return DB::transaction(function () use ($validated, $userId) {
            $deliveryReceipt = DeliveryReceipt::query()->lockForUpdate()->findOrFail($validated['dr_id']);

            if ($deliveryReceipt->has_goods_receipt) {
                throw new RuntimeException('This delivery receipt already has a goods receipt.');
            }

            $grn = GoodsReceipt::query()->create([
                'grn_number' => $validated['grn_number'],
                'delivery_receipt_id' => $deliveryReceipt->id,
                'status' => $validated['status'] ?? 'completed',
                'notes' => $validated['notes'] ?? null,
            ]);

            GoodsReceiptDiscrepancy::query()->create([
                'goods_receipt_id' => $grn->id,
                'has_discrepancy' => (bool) data_get($validated, 'discrepancy_info.has_discrepancy', false),
                'discrepancy_summary' => data_get($validated, 'discrepancy_info.discrepancy_summary'),
            ]);

            foreach ($validated['items'] as $item) {
                $grnItem = GoodsReceiptItem::query()->create([
                    'goods_receipt_id' => $grn->id,
                    'product_variant_id' => $item['variant_id'],
                ]);

                GoodsReceiptItemIdentifier::query()->create([
                    'goods_receipt_item_id' => $grnItem->id,
                    'serial_number' => data_get($item, 'identifiers.serial_number'),
                    'imei1' => data_get($item, 'identifiers.imei1'),
                    'imei2' => data_get($item, 'identifiers.imei2'),
                ]);

                GoodsReceiptItemDetail::query()->create([
                    'goods_receipt_item_id' => $grnItem->id,
                    'package' => $item['package'] ?? null,
                    'warranty' => $item['warranty'] ?? null,
                    'cost_price' => data_get($item, 'pricing.cost_price'),
                    'cash_price' => data_get($item, 'pricing.cash_price'),
                    'srp' => data_get($item, 'pricing.srp'),
                    'product_type' => data_get($item, 'spec.product_type'),
                    'country_model' => data_get($item, 'spec.country_model'),
                    'with_charger' => (bool) data_get($item, 'spec.with_charger', false),
                    'item_notes' => $item['item_notes'] ?? null,
                ]);

                InventoryItem::query()->create([
                    'product_variant_id' => $item['variant_id'],
                    'warehouse_id' => (int) ($validated['warehouse_id'] ?? 0),
                    'imei' => data_get($item, 'identifiers.imei1'),
                    'imei2' => data_get($item, 'identifiers.imei2'),
                    'serial_number' => data_get($item, 'identifiers.serial_number'),
                    'status' => data_get($item, 'condition') === 'Certified Pre-Owned' ? 'quality_check' : 'available',
                    'cost_price' => data_get($item, 'pricing.cost_price', 0),
                    'cash_price' => data_get($item, 'pricing.cash_price', 0),
                    'srp_price' => data_get($item, 'pricing.srp', 0),
                    'package' => $item['package'] ?? null,
                    'warranty' => $item['warranty'] ?? null,
                    'product_type' => data_get($item, 'spec.product_type'),
                    'with_charger' => (bool) data_get($item, 'spec.with_charger', false),
                    'encoded_at' => now(),
                    'grn_number' => $validated['grn_number'],
                ]);
            }

            $deliveryReceipt->forceFill([
                'has_goods_receipt' => true,
                'date_encoded' => now(),
                'encoded_by_user_id' => $userId,
            ])->save();

            return $grn->fresh(['deliveryReceipt', 'discrepancy', 'items.identifiers', 'items.details']);
        });
    }
}
