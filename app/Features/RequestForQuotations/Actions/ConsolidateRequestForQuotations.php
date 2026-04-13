<?php

namespace App\Features\RequestForQuotations\Actions;

use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationStatusHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConsolidateRequestForQuotations
{
    /** @param array<int> $rfqIds */
    public function handle(array $rfqIds, ?int $actorId = null): RequestForQuotation
    {
        return DB::transaction(function () use ($rfqIds, $actorId): RequestForQuotation {
            $rfqs = RequestForQuotation::query()
                ->with(['items'])
                ->whereIn('id', $rfqIds)
                ->get();

            if ($rfqs->count() < 2) {
                throw ValidationException::withMessages(['rfq_ids' => 'At least two RFQs are required for consolidation.']);
            }

            $newRfq = RequestForQuotation::query()->create([
                'rfq_number' => $this->nextConsolidatedRfqNumber(),
                'stock_request_id' => $rfqs->first()->stock_request_id,
                'stock_request_approval_id' => $rfqs->first()->stock_request_approval_id,
                'created_by_id' => $actorId,
                'status' => 'draft',
            ]);

            $byVariant = [];
            foreach ($rfqs as $rfq) {
                foreach ($rfq->items as $item) {
                    $variantId = (int) $item->variant_id;
                    if (! isset($byVariant[$variantId])) {
                        $byVariant[$variantId] = [
                            'variant_id' => $variantId,
                            'quantity' => 0,
                            'description' => $item->description,
                        ];
                    }
                    $byVariant[$variantId]['quantity'] += (int) $item->quantity;
                }
            }

            foreach ($byVariant as $payload) {
                $newRfq->items()->create($payload);
            }

            foreach ($rfqs as $rfq) {
                $newRfq->sourceLinks()->create([
                    'source_request_for_quotation_id' => $rfq->id,
                    'source_stock_request_id' => $rfq->stock_request_id,
                ]);

                $rfq->update(['status' => 'consolidated']);

                RequestForQuotationStatusHistory::query()->create([
                    'request_for_quotation_id' => $rfq->id,
                    'status' => 'consolidated',
                    'changed_by_id' => $actorId,
                    'occurred_at' => now(),
                    'notes' => 'Consolidated into '.$newRfq->rfq_number,
                ]);
            }

            RequestForQuotationStatusHistory::query()->create([
                'request_for_quotation_id' => $newRfq->id,
                'status' => 'draft',
                'changed_by_id' => $actorId,
                'occurred_at' => now(),
                'notes' => 'Created from consolidation',
            ]);

            return $newRfq->fresh();
        });
    }

    private function nextConsolidatedRfqNumber(): string
    {
        $prefix = 'RFQ-C-'.now()->format('Ymd').'-';

        $latest = RequestForQuotation::query()
            ->where('rfq_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('rfq_number');

        $next = 1;
        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches)) {
            $next = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
