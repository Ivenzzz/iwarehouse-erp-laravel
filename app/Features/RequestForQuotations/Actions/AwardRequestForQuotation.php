<?php

namespace App\Features\RequestForQuotations\Actions;

use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationStatusHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AwardRequestForQuotation
{
    public function handle(int $rfqId, int $supplierQuoteId, ?int $actorId = null): string
    {
        return DB::transaction(function () use ($rfqId, $supplierQuoteId, $actorId): string {
            $rfq = RequestForQuotation::query()
                ->with(['supplierQuotes.items.rfqItem'])
                ->findOrFail($rfqId);

            $quote = $rfq->supplierQuotes->firstWhere('id', $supplierQuoteId);
            if (! $quote) {
                throw ValidationException::withMessages(['supplier_quote_id' => 'Supplier quote does not belong to the RFQ.']);
            }

            $paymentTermId = (int) DB::table('payment_terms')->where('name', $quote->payment_terms ?: 'Net 30')->value('id');
            if ($paymentTermId <= 0) {
                $paymentTermId = (int) DB::table('payment_terms')->insertGetId([
                    'name' => $quote->payment_terms ?: 'Net 30',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $shippingMethodId = (int) DB::table('shipping_methods')->where('name', 'Standard Delivery')->value('id');
            if ($shippingMethodId <= 0) {
                $shippingMethodId = (int) DB::table('shipping_methods')->insertGetId([
                    'name' => 'Standard Delivery',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $poNumber = $this->nextPoNumber();

            $purchaseOrderId = (int) DB::table('purchase_orders')->insertGetId([
                'po_number' => $poNumber,
                'rfq_id' => $rfq->id,
                'supplier_id' => $quote->supplier_id,
                'selected_supplier_quote_id' => $quote->id,
                'shipping_method_id' => $shippingMethodId,
                'payment_term_id' => $paymentTermId,
                'expected_delivery_date' => $quote->eta,
                'status' => 'pending',
                'has_delivery_receipt' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($quote->items as $quoteItem) {
                DB::table('purchase_order_items')->insert([
                    'purchase_order_id' => $purchaseOrderId,
                    'supplier_quote_item_id' => $quoteItem->id,
                    'quantity' => $quoteItem->quoted_quantity,
                    'unit_price' => $quoteItem->unit_price,
                    'discount' => $quoteItem->discount,
                    'description' => $quoteItem->rfqItem?->description,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('purchase_order_status_histories')->insert([
                'purchase_order_id' => $purchaseOrderId,
                'status' => 'pending',
                'changed_by_id' => $actorId,
                'occurred_at' => now(),
                'notes' => 'PO created from RFQ '.$rfq->rfq_number,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $rfq->update([
                'selected_supplier_quote_id' => $quote->id,
                'status' => 'converted_to_po',
            ]);

            RequestForQuotationStatusHistory::query()->create([
                'request_for_quotation_id' => $rfq->id,
                'status' => 'converted_to_po',
                'changed_by_id' => $actorId,
                'occurred_at' => now(),
                'notes' => 'Converted to PO '.$poNumber,
            ]);

            return $poNumber;
        });
    }

    private function nextPoNumber(): string
    {
        $prefix = 'PO-'.now()->format('Ymd').'-';

        $latest = DB::table('purchase_orders')
            ->where('po_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('po_number');

        $next = 1;
        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches)) {
            $next = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
