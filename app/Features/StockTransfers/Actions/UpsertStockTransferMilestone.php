<?php

namespace App\Features\StockTransfers\Actions;

use App\Models\StockTransfer;

class UpsertStockTransferMilestone
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function handle(
        StockTransfer $transfer,
        string $type,
        ?int $actorId = null,
        ?string $notes = null,
        array $meta = [],
        ?string $occurredAt = null,
    ): void {
        $transfer->milestones()->updateOrCreate(
            ['milestone_type' => $type],
            [
                'actor_id' => $actorId,
                'occurred_at' => $occurredAt ?? now(),
                'notes' => $notes,
                'meta' => $meta !== [] ? $meta : null,
            ],
        );
    }
}
