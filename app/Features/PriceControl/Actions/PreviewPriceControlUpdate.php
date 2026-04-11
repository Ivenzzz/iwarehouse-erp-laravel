<?php

namespace App\Features\PriceControl\Actions;

use App\Features\PriceControl\Support\PriceControlQuery;

class PreviewPriceControlUpdate
{
    public function __construct(
        private readonly PriceControlQuery $priceControlQuery,
    ) {
    }

    /**
     * @param  array<int, int>  $itemIds
     * @return array<string, mixed>
     */
    public function handle(array $itemIds, ?float $newCashPrice, ?float $newSrp): array
    {
        $eligibleIds = $this->priceControlQuery
            ->eligibleItemsByIds($itemIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        return [
            'selectedCount' => count($itemIds),
            'eligibleCount' => count($eligibleIds),
            'skippedCount' => max(0, count($itemIds) - count($eligibleIds)),
            'eligibleIds' => $eligibleIds,
            'newCashPrice' => $newCashPrice,
            'newSrp' => $newSrp,
            'newCashPriceFormatted' => $newCashPrice !== null
                ? $this->priceControlQuery->formatCurrency($newCashPrice)
                : null,
            'newSrpFormatted' => $newSrp !== null
                ? $this->priceControlQuery->formatCurrency($newSrp)
                : null,
        ];
    }
}
