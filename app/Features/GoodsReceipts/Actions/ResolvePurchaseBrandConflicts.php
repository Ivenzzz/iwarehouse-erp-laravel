<?php

namespace App\Features\GoodsReceipts\Actions;

class ResolvePurchaseBrandConflicts
{
    public function handle(array $brandConflicts): array
    {
        return [
            'resolved' => $brandConflicts,
            'errors' => [],
        ];
    }
}
