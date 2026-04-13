<?php

namespace App\Features\StockRequests\Actions;

use App\Features\StockRequests\Support\StockRequestDataTransformer;
use App\Models\StockRequest;
use App\Models\StockRequestStatusHistory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CreateStockRequest
{
    public function handle(array $data, ?int $actorId = null): array
    {
        return DB::transaction(function () use ($data, $actorId) {
            $request = StockRequest::query()->create([
                'request_number' => $this->nextRequestNumber(),
                'warehouse_id' => (int) $data['warehouse_id'],
                'requestor_id' => $actorId,
                'required_at' => Carbon::parse($data['required_at']),
                'purpose' => $data['purpose'],
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $request->items()->create([
                    'variant_id' => (int) $item['variant_id'],
                    'quantity' => (int) $item['quantity'],
                    'reason' => $item['reason'] ?? null,
                ]);
            }

            StockRequestStatusHistory::query()->create([
                'stock_request_id' => $request->id,
                'status' => 'pending',
                'actor_id' => $actorId,
                'occurred_at' => now(),
                'notes' => 'Stock request submitted',
            ]);

            $request->load(StockRequestDataTransformer::RELATIONS);

            return StockRequestDataTransformer::transform($request);
        });
    }

    private function nextRequestNumber(): string
    {
        $prefix = 'SR-'.now()->format('Ymd').'-';

        $latest = StockRequest::query()
            ->where('request_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('request_number');

        $next = 1;
        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches)) {
            $next = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
