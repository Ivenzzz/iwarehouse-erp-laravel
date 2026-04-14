<?php

namespace App\Features\DeliveryReceipts\Actions;

use App\Models\DeliveryReceipt;

class GetDeliveryReceiptHistoryChain
{
    public function handle(DeliveryReceipt $dr): array
    {
        $dr->loadMissing([
            'purchaseOrder:id,rfq_id,po_number,created_at',
            'purchaseOrder.statusHistories:id,purchase_order_id,status,changed_by_id,occurred_at,notes',
            'purchaseOrder.statusHistories.changedBy:id,name,email',
            'purchaseOrder.rfq:id,stock_request_id,rfq_number,created_by_id,selected_supplier_quote_id,created_at',
            'purchaseOrder.rfq.createdBy:id,name,email',
            'purchaseOrder.rfq.statusHistories:id,request_for_quotation_id,status,changed_by_id,occurred_at,notes',
            'purchaseOrder.rfq.stockRequest:id,request_number,purpose,requestor_id,created_at',
            'purchaseOrder.rfq.stockRequest.requestor:id,name,email',
            'purchaseOrder.rfq.stockRequest.items:id,stock_request_id',
            'purchaseOrder.rfq.stockRequest.approval:id,stock_request_id,approver_id,approval_date,action',
            'purchaseOrder.rfq.stockRequest.approval.approver:id,name,email',
            'items:id,delivery_receipt_id,total_value',
            'logistics:id,delivery_receipt_id,freight_cost',
            'encodedBy:id,name,email',
        ]);

        $chain = [];
        $po = $dr->purchaseOrder;
        $rfq = $po?->rfq;
        $sr = $rfq?->stockRequest;
        $approval = $sr?->approval;

        if ($sr) {
            $chain[] = [
                'stage' => 'Stock Request Created',
                'number' => $sr->request_number,
                'date' => optional($sr->created_at)?->toIso8601String(),
                'status' => 'submitted',
                'user' => $sr->requestor?->name ?? $sr->requestor?->email,
                'details' => sprintf('Branch Request: %s (%d items requested)', $sr->purpose ?? 'Replenishment', $sr->items->count()),
            ];
        }

        if ($approval) {
            $chain[] = [
                'stage' => 'Admin Review & Approval',
                'number' => $sr?->request_number,
                'date' => optional($approval->approval_date)->toIso8601String(),
                'status' => 'approved',
                'user' => $approval->approver?->name ?? $approval->approver?->email,
                'details' => 'Request approved by Administration.',
            ];
        }

        if ($rfq) {
            $chain[] = [
                'stage' => 'RFQ & Bidding',
                'number' => $rfq->rfq_number,
                'date' => optional($rfq->created_at)->toIso8601String(),
                'status' => 'receiving_quotes',
                'user' => $rfq->createdBy?->name ?? $rfq->createdBy?->email,
                'details' => 'Sourcing from suppliers.',
            ];
        }

        if ($po) {
            $chain[] = [
                'stage' => 'Purchase Order Created',
                'number' => $po->po_number,
                'date' => optional($po->created_at)->toIso8601String(),
                'status' => 'draft',
                'user' => 'System',
                'details' => 'Purchase order generated.',
            ];

            $transit = $po->statusHistories->firstWhere('status', 'approved');
            if ($transit) {
                $chain[] = [
                    'stage' => 'PO Approved',
                    'number' => $po->po_number,
                    'date' => optional($transit->occurred_at)->toIso8601String(),
                    'status' => 'approved',
                    'user' => $transit->changedBy?->name ?? $transit->changedBy?->email,
                    'details' => $transit->notes ?: 'Purchase Order approved',
                ];
            }
        }

        $value = (float) ($dr->total_landed_cost ?? ($dr->items->sum('total_value') + (float) ($dr->logistics?->freight_cost ?? 0)));
        $chain[] = [
            'stage' => 'Delivery Receipt Received',
            'number' => $dr->dr_number,
            'date' => optional($dr->date_received)->toIso8601String(),
            'status' => $dr->has_goods_receipt ? 'completed' : 'ready_for_warehouse',
            'user' => $dr->encodedBy?->name ?? $dr->encodedBy?->email ?? 'Warehouse Staff',
            'details' => 'Items Received. Total Landed Cost: PHP '.number_format($value, 2),
        ];

        return $chain;
    }
}
