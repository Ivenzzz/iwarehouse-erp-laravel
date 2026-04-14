<?php

namespace App\Features\DeliveryReceipts\Support;

use App\Models\DeliveryReceipt;
use App\Models\DeliveryReceiptItem;

class DeliveryReceiptDataTransformer
{
    public const RELATIONS = [
        'supplier:id,legal_business_name,trade_name,address',
        'supplier.contact:id,supplier_id,email,mobile',
        'purchaseOrder:id,po_number,supplier_id,expected_delivery_date,status',
        'purchaseOrder.items:id,purchase_order_id,product_master_id,quantity,unit_price,discount',
        'receivedBy:id,name,email',
        'encodedBy:id,name,email',
        'logistics:id,delivery_receipt_id,logistics_company,waybill_number,driver_name,driver_contact,origin,destination,freight_cost',
        'upload:id,delivery_receipt_id,vendor_dr_url,waybill_url,freight_invoice_url,driver_id_url,purchase_file_url,uploads_complete',
        'upload.boxPhotos:id,delivery_receipt_upload_id,photo_url',
        'items:id,delivery_receipt_id,product_master_id,expected_quantity,actual_quantity,unit_cost,cash_price,srp_price,total_value,variance_flag,variance_notes',
        'items.spec:id,delivery_receipt_item_id,model_code,ram,rom,condition',
        'items.productMaster:id,model_id,name',
        'items.productMaster.model:id,brand_id,model_name',
        'items.productMaster.model.brand:id,name',
    ];

    public static function transform(DeliveryReceipt $dr): array
    {
        $items = $dr->items->map(fn (DeliveryReceiptItem $item) => self::transformItem($item))->values();

        return [
            'id' => $dr->id,
            'po_id' => $dr->po_id,
            'po_number' => $dr->purchaseOrder?->po_number,
            'dr_number' => $dr->dr_number,
            'reference_number' => $dr->reference_number,
            'status' => $dr->has_variance ? 'with_variance' : ($dr->has_goods_receipt ? 'completed' : 'ready_for_warehouse'),
            'supplier_id' => $dr->supplier_id,
            'supplier_name' => self::supplierName($dr),
            'date_received' => optional($dr->date_received)?->toIso8601String(),
            'date_encoded' => optional($dr->date_encoded)?->toIso8601String(),
            'received_by' => $dr->receivedBy?->name ?? $dr->receivedBy?->email,
            'encoded_by' => $dr->encodedBy?->name ?? $dr->encodedBy?->email,
            'declared_items_json' => [
                'items' => $items->all(),
                'box_count_declared' => $dr->box_count_declared,
                'box_count_received' => $dr->box_count_received,
                'dr_value' => (float) ($dr->dr_value ?? $items->sum('total_value')),
                'total_landed_cost' => (float) ($dr->total_landed_cost ?? (($dr->dr_value ?? $items->sum('total_value')) + (float) ($dr->logistics?->freight_cost ?? 0))),
                'has_variance' => (bool) $dr->has_variance,
                'variance_notes' => $dr->variance_notes,
            ],
            'logistics_json' => [
                'logistics_company' => $dr->logistics?->logistics_company,
                'waybill_number' => $dr->logistics?->waybill_number,
                'driver_name' => $dr->logistics?->driver_name,
                'driver_contact' => $dr->logistics?->driver_contact,
                'origin' => $dr->logistics?->origin,
                'destination' => $dr->logistics?->destination,
                'freight_cost' => (float) ($dr->logistics?->freight_cost ?? 0),
            ],
            'uploads_json' => [
                'vendor_dr_url' => $dr->upload?->vendor_dr_url,
                'waybill_url' => $dr->upload?->waybill_url,
                'freight_invoice_url' => $dr->upload?->freight_invoice_url,
                'driver_id_url' => $dr->upload?->driver_id_url,
                'purchase_file_url' => $dr->upload?->purchase_file_url,
                'uploads_complete' => (bool) ($dr->upload?->uploads_complete ?? false),
                'box_photos' => $dr->upload?->boxPhotos->pluck('photo_url')->values()->all() ?? [],
            ],
            'metadata_json' => [
                'notes' => $dr->variance_notes,
            ],
            'created_date' => optional($dr->created_at)?->toIso8601String(),
            'updated_date' => optional($dr->updated_at)?->toIso8601String(),
        ];
    }

    private static function transformItem(DeliveryReceiptItem $item): array
    {
        return [
            'product_master_id' => $item->product_master_id,
            'product_name' => $item->productMaster?->product_name,
            'product_model' => $item->productMaster?->model?->model_name,
            'brand_name' => $item->productMaster?->model?->brand?->name,
            'product_spec' => [
                'model_code' => $item->spec?->model_code,
                'ram' => $item->spec?->ram,
                'rom' => $item->spec?->rom,
                'condition' => $item->spec?->condition,
            ],
            'declared_quantity' => (int) $item->expected_quantity,
            'actual_quantity' => (int) $item->actual_quantity,
            'expected_quantity' => (int) $item->expected_quantity,
            'unit_cost' => (float) ($item->unit_cost ?? 0),
            'cash_price' => (float) ($item->cash_price ?? 0),
            'srp_price' => (float) ($item->srp_price ?? 0),
            'total_value' => (float) ($item->total_value ?? 0),
            'variance_flag' => (bool) $item->variance_flag,
            'variance_notes' => $item->variance_notes,
            'is_extra_item' => (int) $item->expected_quantity === 0,
        ];
    }

    private static function supplierName(DeliveryReceipt $dr): string
    {
        return $dr->supplier?->trade_name
            ?? $dr->supplier?->legal_business_name
            ?? 'Unknown Supplier';
    }
}
