<?php

namespace App\Features\PurchaseOrders\Support;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;

class PurchaseOrderDataTransformer
{
    public const RELATIONS = [
        'rfq:id,rfq_number',
        'supplier:id,legal_business_name,trade_name,address',
        'supplier.contact:id,supplier_id,email,mobile',
        'shippingMethod:id,name',
        'paymentTerm:id,name',
        'selectedSupplierQuote:id,shipping_cost,payment_terms',
        'items:id,purchase_order_id,product_master_id,quantity,unit_price,discount,description',
        'items.spec:id,purchase_order_item_id,model_code,ram,rom,condition',
        'items.productMaster:id,model_id',
        'items.productMaster.model:id,brand_id,model_name',
        'items.productMaster.model.brand:id,name',
        'statusHistories:id,purchase_order_id,status,changed_by_id,occurred_at,notes',
        'statusHistories.changedBy:id,name,email',
        'approval:id,purchase_order_id,approver_id,approved_at,notes',
        'approval.approver:id,name,email',
        'payable:id,purchase_order_id,has_paid',
    ];

    public static function transform(PurchaseOrder $po): array
    {
        $items = $po->items->map(fn (PurchaseOrderItem $item) => self::transformItem($item))->values();
        $subtotal = $items->sum('total_price');
        $shippingAmount = (float) ($po->shipping_amount ?? $po->selectedSupplierQuote?->shipping_cost ?? 0);

        return [
            'id' => $po->id,
            'po_number' => $po->po_number,
            'rfq_id' => $po->rfq_id,
            'rfq_number' => $po->rfq?->rfq_number,
            'supplier_id' => $po->supplier_id,
            'supplier' => [
                'id' => $po->supplier?->id,
                'master_profile' => [
                    'legal_business_name' => $po->supplier?->legal_business_name,
                    'trade_name' => $po->supplier?->trade_name,
                ],
                'legal_tax_compliance' => [
                    'registered_address' => $po->supplier?->address,
                ],
                'contact_details' => [
                    'email' => $po->supplier?->contact?->email,
                    'mobile_landline' => $po->supplier?->contact?->mobile,
                ],
            ],
            'expected_delivery_date' => optional($po->expected_delivery_date)?->toDateString(),
            'shipping_json' => [
                'shipping_method' => $po->shippingMethod?->name,
            ],
            'financials_json' => [
                'subtotal' => $subtotal,
                'shipping_amount' => $shippingAmount,
                'total_amount' => $subtotal + $shippingAmount,
                'payment_terms' => $po->paymentTerm?->name ?? $po->selectedSupplierQuote?->payment_terms,
            ],
            'items_json' => [
                'items' => $items->all(),
            ],
            'status' => $po->status,
            'status_history' => [
                'history' => $po->statusHistories->map(fn ($history) => [
                    'status' => $history->status,
                    'timestamp' => optional($history->occurred_at)?->toIso8601String(),
                    'changed_by' => $history->changed_by_id,
                    'changed_by_name' => $history->changedBy?->name ?? $history->changedBy?->email,
                    'notes' => $history->notes,
                ])->values()->all(),
            ],
            'approval_json' => [
                'approver_id' => $po->approval?->approver_id,
                'approver_name' => $po->approval?->approver?->name ?? $po->approval?->approver?->email,
                'approved_date' => optional($po->approval?->approved_at)?->toIso8601String(),
                'notes' => $po->approval?->notes,
            ],
            'payable_json' => [
                'has_paid' => (bool) ($po->payable?->has_paid ?? false),
            ],
            'created_date' => optional($po->created_at)?->toIso8601String(),
            'updated_date' => optional($po->updated_at)?->toIso8601String(),
        ];
    }

    private static function transformItem(PurchaseOrderItem $item): array
    {
        $gross = (float) $item->quantity * (float) $item->unit_price;
        $discountPercent = min(100, max(0, (float) $item->discount));
        $lineTotal = max(0, $gross * (1 - ($discountPercent / 100)));

        $master = $item->productMaster;
        $model = $master?->model;
        $productDisplayName = trim(implode(' ', array_filter([
            $model?->brand?->name,
            $model?->model_name,
            $item->spec?->model_code,
        ])));

        return [
            'product_master_id' => $item->product_master_id,
            'product_name' => $productDisplayName !== '' ? $productDisplayName : 'Unknown Item',
            'product_spec' => [
                'model_code' => $item->spec?->model_code,
                'ram' => $item->spec?->ram,
                'rom' => $item->spec?->rom,
                'condition' => $item->spec?->condition,
            ],
            'quantity' => (int) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'discount' => (float) $item->discount,
            'total_price' => $lineTotal,
            'description' => $item->description,
        ];
    }
}
