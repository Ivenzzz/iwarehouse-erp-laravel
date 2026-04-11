<?php

namespace App\Features\PriceControl\Actions;

use App\Features\Inventory\Actions\LogInventoryActivity;
use App\Features\PriceControl\Support\PriceControlQuery;
use App\Models\InventoryItem;
use Illuminate\Support\Facades\DB;

class UpdatePriceControlPrices
{
    public function __construct(
        private readonly PriceControlQuery $priceControlQuery,
        private readonly LogInventoryActivity $logInventoryActivity,
    ) {
    }

    /**
     * @param  array<int, int>  $itemIds
     * @return array{
     *     succeeded: array<int, int>,
     *     failed: array<int, array{id: int, error: string}>,
     *     skipped: array<int, int>
     * }
     */
    public function handle(array $itemIds, ?float $newCashPrice, ?float $newSrp, ?int $actorId): array
    {
        $succeeded = [];
        $failed = [];
        $skipped = [];

        DB::transaction(function () use ($itemIds, $newCashPrice, $newSrp, $actorId, &$succeeded, &$failed, &$skipped): void {
            $items = InventoryItem::query()
                ->whereIn('id', $itemIds)
                ->get()
                ->keyBy('id');

            foreach ($itemIds as $itemId) {
                $item = $items->get($itemId);

                if ($item === null) {
                    $failed[] = ['id' => $itemId, 'error' => 'Inventory item not found.'];

                    continue;
                }

                if (! in_array($item->status, PriceControlQuery::ELIGIBLE_STATUSES, true)) {
                    $skipped[] = $itemId;

                    continue;
                }

                $payload = [];
                $changes = [];

                if ($newCashPrice !== null) {
                    $changes['cash_price'] = [
                        'old' => $item->cash_price !== null ? (float) $item->cash_price : 0.0,
                        'new' => $newCashPrice,
                    ];
                    $payload['cash_price'] = $newCashPrice;
                }

                if ($newSrp !== null) {
                    $changes['srp'] = [
                        'old' => $item->srp_price !== null ? (float) $item->srp_price : 0.0,
                        'new' => $newSrp,
                    ];
                    $payload['srp_price'] = $newSrp;
                }

                if ($payload === []) {
                    $failed[] = ['id' => $itemId, 'error' => 'No price fields were provided.'];

                    continue;
                }

                $item->update($payload);
                $this->logInventoryActivity->handle(
                    $item->fresh(),
                    'PRICE_CHANGE',
                    $actorId,
                    'Price updated via Price Controller.',
                    ['changes' => $changes],
                );

                $succeeded[] = $itemId;
            }
        });

        return compact('succeeded', 'failed', 'skipped');
    }
}
