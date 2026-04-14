<?php

namespace App\Features\RequestForQuotations\Support;

use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationItem;
use App\Models\RequestForQuotationSupplierQuote;
use App\Models\RequestForQuotationSupplierQuoteItem;

class RequestForQuotationDataTransformer
{
    public const RELATIONS = [
        'createdBy:id,name,email',
        'stockRequest:id,request_number,warehouse_id,requestor_id,required_at,purpose,status',
        'stockRequest.warehouse:id,name',
        'stockRequest.requestor:id,name,email',
        'stockRequest.approval',
        'stockRequest.approval.approver:id,name,email',
        'stockRequest.approval.references',
        'items:id,request_for_quotation_id,variant_id,quantity,description',
        'items.variant:id,product_master_id,variant_name,sku,condition,color,ram,rom,cpu,gpu,ram_type,rom_type,operating_system,screen',
        'items.variant.productMaster:id,model_id',
        'items.variant.productMaster.model:id,brand_id,model_name',
        'items.variant.productMaster.model.brand:id,name',
        'supplierQuotes:id,request_for_quotation_id,supplier_id,quote_date,tax_amount,shipping_cost,payment_terms,eta',
        'supplierQuotes.supplier:id,legal_business_name,trade_name',
        'supplierQuotes.items:id,supplier_quote_id,rfq_item_id,quoted_quantity,unit_price,discount',
        'statusHistories:id,request_for_quotation_id,status,changed_by_id,occurred_at,notes',
        'statusHistories.changedBy:id,name,email',
        'selectedSupplierQuote:id,supplier_id',
        'sourceLinks:id,request_for_quotation_id,source_request_for_quotation_id,source_stock_request_id',
        'sourceLinks.sourceRequestForQuotation:id,rfq_number',
    ];

    public static function transform(RequestForQuotation $rfq): array
    {
        $items = $rfq->items->map(fn (RequestForQuotationItem $item) => self::transformItem($item))->values()->all();
        $quotes = $rfq->supplierQuotes->map(fn (RequestForQuotationSupplierQuote $quote) => self::transformQuote($quote))->values()->all();

        $requestedBy = $rfq->stockRequest?->requestor?->name ?? $rfq->stockRequest?->requestor?->email;
        $approvedBy = $rfq->stockRequest?->approval?->approver?->name ?? $rfq->stockRequest?->approval?->approver?->email;

        return [
            'id' => $rfq->id,
            'rfq_number' => $rfq->rfq_number,
            'sr_id' => $rfq->stock_request_id,
            'sr_number' => $rfq->stockRequest?->request_number,
            'requested_by_name' => $requestedBy,
            'requested_store' => $rfq->stockRequest?->warehouse?->name,
            'approved_by_name' => $approvedBy,
            'required_date' => optional($rfq->stockRequest?->required_at)?->toDateString(),
            'items' => ['items' => $items],
            'supplier_quotes' => ['supplier_quotes' => $quotes],
            'status' => $rfq->status,
            'selected_supplier_id' => $rfq->selectedSupplierQuote?->supplier_id,
            'created_by' => $rfq->createdBy?->name ?? $rfq->createdBy?->email,
            'created_at' => optional($rfq->created_at)?->toIso8601String(),
            'updated_at' => optional($rfq->updated_at)?->toIso8601String(),
            'source_rfqs' => $rfq->sourceLinks->map(fn ($source) => [
                'rfq_id' => $source->source_request_for_quotation_id,
                'rfq_number' => $source->sourceRequestForQuotation?->rfq_number,
                'stock_request_id' => $source->source_stock_request_id,
            ])->values()->all(),
            'status_history' => [
                'history' => $rfq->statusHistories
                    ->map(fn ($history) => [
                        'status' => $history->status,
                        'timestamp' => optional($history->occurred_at)?->toIso8601String(),
                        'changed_by' => $history->changed_by_id,
                        'changed_by_name' => $history->changedBy?->name ?? $history->changedBy?->email,
                        'notes' => $history->notes,
                    ])
                    ->values()
                    ->all(),
            ],
        ];
    }

    private static function transformItem(RequestForQuotationItem $item): array
    {
        $variant = $item->variant;
        $master = $variant?->productMaster;
        $model = $master?->model;
        $attributes = $variant?->attributesMap() ?? [];

        return [
            'id' => $item->id,
            'variant_id' => $item->variant_id,
            'brand' => $model?->brand?->name,
            'model' => $model?->model_name,
            'variant_sku' => $variant?->sku,
            'variant_name' => $variant?->variant_name,
            'condition' => $variant?->condition,
            'attributes' => $attributes,
            'quantity' => $item->quantity,
            'description' => $item->description,
        ];
    }

    private static function transformQuote(RequestForQuotationSupplierQuote $quote): array
    {
        $normalizedItems = $quote->items->map(function (RequestForQuotationSupplierQuoteItem $item) {
            $lineTotal = ((float) $item->quoted_quantity * (float) $item->unit_price) - (float) $item->discount;
            $rfqItem = $item->rfqItem;

            return [
                'rfq_item_id' => $item->rfq_item_id,
                'variant_id' => $rfqItem?->variant_id,
                'quantity' => $item->quoted_quantity,
                'unit_price' => (float) $item->unit_price,
                'discount' => (float) $item->discount,
                'total_price' => max(0, $lineTotal),
            ];
        })->values();

        $subtotal = $normalizedItems->sum('total_price');
        $shippingCost = (float) $quote->shipping_cost;
        $taxAmount = (float) $quote->tax_amount;

        return [
            'id' => $quote->id,
            'supplier_id' => $quote->supplier_id,
            'supplier_name' => $quote->supplier?->legal_business_name ?? $quote->supplier?->trade_name,
            'quote_date' => optional($quote->quote_date)?->toDateString(),
            'items' => $normalizedItems->all(),
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'shipping_cost' => $shippingCost,
            'total_amount' => $subtotal + $shippingCost + $taxAmount,
            'payment_terms' => $quote->payment_terms,
            'eta' => optional($quote->eta)?->toDateString(),
        ];
    }
}
