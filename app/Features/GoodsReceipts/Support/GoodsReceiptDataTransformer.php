<?php

namespace App\Features\GoodsReceipts\Support;

use App\Models\DeliveryReceipt;
use App\Models\GoodsReceipt;

class GoodsReceiptDataTransformer
{
    public static array $DETAIL_RELATIONS = [
        'deliveryReceipt',
        'deliveryReceipt.supplier.contact',
        'deliveryReceipt.purchaseOrder',
        'deliveryReceipt.logistics',
        'deliveryReceipt.items.spec',
        'deliveryReceipt.encodedBy',
        'items',
        'items.productVariant.productMaster.model.brand',
        'items.productVariant.productMaster.subcategory.parent',
        'items.identifiers',
        'items.details',
        'discrepancy',
    ];

    public static function transformReceiptSummary(GoodsReceipt $grn): array
    {
        $dr = $grn->deliveryReceipt;
        $supplier = $dr?->supplier;
        $items = $grn->items ?? collect();

        $itemCount = $items->count();
        $summary = $items
            ->groupBy(fn ($item) => trim((string) ($item->productVariant?->variant_name ?: $item->productVariant?->productMaster?->product_name ?: 'Unknown Product')))
            ->map(fn ($group, $name) => [
                'name' => $name,
                'count' => $group->count(),
            ])->values()->all();

        $totalAmount = $items->sum(fn ($item) => (float) ($item->details?->cost_price ?? 0));

        return [
            'id' => $grn->id,
            'grn_number' => $grn->grn_number,
            'status' => $grn->status,
            'notes' => $grn->notes,
            'total_amount' => $totalAmount,
            'item_count' => $itemCount,
            'item_summary' => $summary,
            'dr_id' => $dr?->id,
            'dr_number' => $dr?->dr_number,
            'po_id' => $dr?->po_id,
            'po_number' => $dr?->purchaseOrder?->po_number,
            'supplier_id' => $dr?->supplier_id,
            'supplier_name' => $supplier?->trade_name ?: $supplier?->legal_business_name,
            'warehouse_id' => $dr?->logistics?->destination,
            'warehouse_name' => $dr?->logistics?->destination ? (string) $dr->logistics->destination : null,
            'encoded_by' => $dr?->encodedBy?->name,
            'encoded_date' => optional($dr?->date_encoded ?? $grn->created_at)?->toDateTimeString(),
            'discrepancy_info' => [
                'has_discrepancy' => (bool) ($grn->discrepancy?->has_discrepancy ?? false),
                'discrepancy_summary' => $grn->discrepancy?->discrepancy_summary,
            ],
            'created_date' => optional($grn->created_at)?->toDateTimeString(),
        ];
    }

    public static function transformReceiptDetail(GoodsReceipt $grn): array
    {
        $dr = $grn->deliveryReceipt;
        $supplier = $dr?->supplier;

        $items = $grn->items->map(function ($item) {
            $identifiers = $item->identifiers;
            $details = $item->details;
            $variant = $item->productVariant;
            $productMaster = $variant?->productMaster;
            $model = $productMaster?->model;
            $brand = $model?->brand;

            return [
                'id' => $item->id,
                'variant_id' => $item->product_variant_id,
                'variant_name' => $variant?->variant_name,
                'condition' => $variant?->condition,
                'product_master_id' => $variant?->product_master_id,
                'product_name' => $productMaster?->product_name,
                'brand_name' => $brand?->name,
                'model_name' => $model?->model_name,
                'category_name' => $productMaster?->subcategory?->parent?->name,
                'subcategory_name' => $productMaster?->subcategory?->name,
                'identifiers' => [
                    'serial_number' => $identifiers?->serial_number,
                    'imei1' => $identifiers?->imei1,
                    'imei2' => $identifiers?->imei2,
                ],
                'pricing' => [
                    'cost_price' => (float) ($details?->cost_price ?? 0),
                    'cash_price' => (float) ($details?->cash_price ?? 0),
                    'srp' => (float) ($details?->srp ?? 0),
                ],
                'spec' => [
                    'product_type' => $details?->product_type,
                    'country_model' => $details?->country_model,
                    'with_charger' => (bool) ($details?->with_charger ?? false),
                ],
                'package' => $details?->package,
                'warranty' => $details?->warranty,
                'item_notes' => $details?->item_notes,
            ];
        })->values()->all();

        $totalAmount = collect($items)->sum(fn (array $item) => (float) ($item['pricing']['cost_price'] ?? 0));

        return [
            'id' => $grn->id,
            'grn_number' => $grn->grn_number,
            'dr_id' => $grn->delivery_receipt_id,
            'status' => $grn->status,
            'notes' => $grn->notes,
            'total_amount' => $totalAmount,
            'supplier_id' => $dr?->supplier_id,
            'parties' => [
                'supplier_id' => $dr?->supplier_id,
                'warehouse_id' => $dr?->logistics?->destination,
                'warehouse_name' => $dr?->logistics?->destination,
                'received_by' => $dr?->encodedBy?->name,
                'encoded_date' => optional($dr?->date_encoded ?? $grn->created_at)?->toDateTimeString(),
            ],
            'receipt_info' => [
                'dr_id' => $dr?->id,
                'dr_number' => $dr?->dr_number,
                'po_id' => $dr?->po_id,
                'po_number' => $dr?->purchaseOrder?->po_number,
                'supplier_name' => $supplier?->trade_name ?: $supplier?->legal_business_name,
            ],
            'discrepancy_info' => [
                'has_discrepancy' => (bool) ($grn->discrepancy?->has_discrepancy ?? false),
                'discrepancy_summary' => $grn->discrepancy?->discrepancy_summary,
            ],
            'items' => $items,
            'created_date' => optional($grn->created_at)?->toDateTimeString(),
        ];
    }

    public static function transformPendingDeliveryReceipt(DeliveryReceipt $dr): array
    {
        $declaredItems = $dr->items->map(function ($item) {
            $productMaster = $item->productMaster;
            $name = $productMaster?->product_name ?: 'Unknown Product';
            $specLabel = collect([
                $item->spec?->ram,
                $item->spec?->rom,
                $item->spec?->condition,
            ])->filter()->implode(' / ');

            return [
                'id' => $item->id,
                'product_master_id' => $item->product_master_id,
                'product_name' => $name,
                'product_label' => trim($name.' '.($specLabel ? "({$specLabel})" : '')),
                'expected_quantity' => (int) ($item->expected_quantity ?? 0),
                'actual_quantity' => (int) ($item->actual_quantity ?? 0),
                'unit_cost' => (float) ($item->unit_cost ?? 0),
                'cash_price' => (float) ($item->cash_price ?? 0),
                'srp_price' => (float) ($item->srp_price ?? 0),
                'product_spec' => [
                    'model_code' => $item->spec?->model_code,
                    'ram' => $item->spec?->ram,
                    'rom' => $item->spec?->rom,
                    'condition' => $item->spec?->condition,
                ],
            ];
        })->values();

        $totalQty = $declaredItems->sum(fn ($item) => (int) ($item['expected_quantity'] ?: $item['actual_quantity']));
        $firstItem = $declaredItems->first();

        return [
            'id' => $dr->id,
            'supplier_id' => $dr->supplier_id,
            'supplier_code' => $dr->supplier?->supplier_code,
            'po_id' => $dr->po_id,
            'dr_number' => $dr->dr_number,
            'vendor_dr_number' => $dr->dr_number,
            'reference_number' => $dr->reference_number,
            'date_received' => optional($dr->date_received)?->toDateTimeString(),
            'date_encoded' => optional($dr->date_encoded)?->toDateTimeString(),
            'status' => $dr->has_goods_receipt ? 'completed' : 'ready_for_warehouse',
            'has_goods_receipt' => (bool) $dr->has_goods_receipt,
            'supplier_name' => $dr->supplier?->trade_name ?: $dr->supplier?->legal_business_name,
            'po_number' => $dr->purchaseOrder?->po_number,
            'destination_warehouse_id' => $dr->logistics?->destination,
            'first_item_label' => $firstItem['product_label'] ?? null,
            'total_quantity' => (int) $totalQty,
            'declared_product_count' => (int) $declaredItems->count(),
            'declared_items_json' => [
                'box_count_declared' => (int) ($dr->box_count_declared ?? 0),
                'box_count_received' => (int) ($dr->box_count_received ?? 0),
                'items' => $declaredItems->all(),
            ],
            'logistics_json' => [
                'logistics_company' => $dr->logistics?->logistics_company,
                'waybill_number' => $dr->logistics?->waybill_number,
                'destination' => $dr->logistics?->destination,
            ],
        ];
    }
}
