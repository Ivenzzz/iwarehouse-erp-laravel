<?php

namespace App\Features\RequestForQuotations\Actions;

use App\Models\RequestForQuotation;
use App\Models\RequestForQuotationStatusHistory;
use App\Models\StockRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateRequestForQuotationFromApproval
{
    public function handle(int $stockRequestId, ?int $actorId = null): RequestForQuotation
    {
        return DB::transaction(function () use ($stockRequestId, $actorId): RequestForQuotation {
            $stockRequest = StockRequest::query()
                ->with(['items', 'approval'])
                ->findOrFail($stockRequestId);

            if (! in_array($stockRequest->status, ['rfq_created', 'split_operation_created'], true)) {
                throw ValidationException::withMessages(['stock_request_id' => 'Stock request is not eligible for RFQ creation.']);
            }

            $rfq = RequestForQuotation::query()->firstOrNew(['stock_request_id' => $stockRequest->id]);
            if (! $rfq->exists) {
                $rfq->rfq_number = $this->nextRfqNumber();
                $rfq->created_by_id = $actorId;
            }
            $rfq->stock_request_approval_id = $stockRequest->approval?->id;
            $rfq->status = 'draft';
            $rfq->save();

            $rfq->items()->delete();
            foreach ($stockRequest->items as $item) {
                $rfq->items()->create([
                    'variant_id' => $item->variant_id,
                    'quantity' => $item->quantity,
                    'description' => $item->reason,
                ]);
            }

            RequestForQuotationStatusHistory::query()->create([
                'request_for_quotation_id' => $rfq->id,
                'status' => 'draft',
                'changed_by_id' => $actorId,
                'occurred_at' => now(),
                'notes' => 'RFQ created from stock request approval',
            ]);

            return $rfq->fresh();
        });
    }

    private function nextRfqNumber(): string
    {
        $prefix = 'RFQ-'.now()->format('Ymd').'-';

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
