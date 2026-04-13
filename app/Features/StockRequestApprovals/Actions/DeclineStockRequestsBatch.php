<?php

namespace App\Features\StockRequestApprovals\Actions;

use App\Models\StockRequest;
use App\Models\StockRequestApproval;
use App\Models\StockRequestStatusHistory;
use Illuminate\Support\Facades\DB;

class DeclineStockRequestsBatch
{
    /** @param array<int> $stockRequestIds */
    public function handle(array $stockRequestIds, ?int $actorId = null): void
    {
        DB::transaction(function () use ($stockRequestIds, $actorId): void {
            $requests = StockRequest::query()
                ->whereIn('id', $stockRequestIds)
                ->with(['items', 'approval'])
                ->get();

            foreach ($requests as $request) {
                $history = StockRequestStatusHistory::query()->create([
                    'stock_request_id' => $request->id,
                    'status' => 'declined',
                    'actor_id' => $actorId,
                    'occurred_at' => now(),
                    'notes' => 'Declined via batch review',
                ]);

                $approval = StockRequestApproval::query()->updateOrCreate(
                    ['stock_request_id' => $request->id],
                    [
                        'status_history_id' => $history->id,
                        'approver_id' => $actorId,
                        'approval_date' => now(),
                        'action' => 'declined',
                        'notes' => 'Declined via batch review',
                    ],
                );

                $approval->items()->delete();
                foreach ($request->items as $item) {
                    $approval->items()->create([
                        'stock_request_item_id' => $item->id,
                        'approved_quantity' => 0,
                    ]);
                }
                $approval->references()->delete();

                $request->update(['status' => 'declined']);
            }
        });
    }
}
