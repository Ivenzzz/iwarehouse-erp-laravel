<?php

namespace App\Features\RequestForQuotations\Actions;

use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationStatusHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddRequestForQuotationSupplierQuote
{
    /**
     * @param array<int,array{rfq_item_id:int,quoted_quantity:int,unit_price:numeric,discount:numeric}> $items
     */
    public function handle(int $rfqId, int $supplierId, string $quoteDate, ?string $eta, ?string $paymentTerms, float $taxAmount, float $shippingCost, array $items, ?int $actorId = null): void
    {
        DB::transaction(function () use ($rfqId, $supplierId, $quoteDate, $eta, $paymentTerms, $taxAmount, $shippingCost, $items, $actorId): void {
            $rfq = RequestForQuotation::query()->with('items')->findOrFail($rfqId);

            if ($items === []) {
                throw ValidationException::withMessages(['items' => 'Quote items are required.']);
            }

            $rfqItemIds = $rfq->items->pluck('id')->all();
            foreach ($items as $item) {
                if (! in_array((int) $item['rfq_item_id'], $rfqItemIds, true)) {
                    throw ValidationException::withMessages(['items' => 'Quote item contains invalid RFQ item.']);
                }
            }

            $quote = $rfq->supplierQuotes()->create([
                'supplier_id' => $supplierId,
                'quote_date' => $quoteDate,
                'eta' => $eta,
                'payment_terms' => $paymentTerms,
                'tax_amount' => $taxAmount,
                'shipping_cost' => $shippingCost,
            ]);

            foreach ($items as $item) {
                $quote->items()->create([
                    'rfq_item_id' => (int) $item['rfq_item_id'],
                    'quoted_quantity' => (int) $item['quoted_quantity'],
                    'unit_price' => (float) $item['unit_price'],
                    'discount' => (float) $item['discount'],
                ]);
            }

            $rfq->update(['status' => 'receiving_quotes']);

            RequestForQuotationStatusHistory::query()->create([
                'request_for_quotation_id' => $rfq->id,
                'status' => 'receiving_quotes',
                'changed_by_id' => $actorId,
                'occurred_at' => now(),
                'notes' => 'Supplier quote added',
            ]);
        });
    }
}
