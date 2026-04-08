<?php

namespace App\Features\Inventory\Actions;

use App\Models\InventoryItem;

class LogInventoryActivity
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function handle(
        InventoryItem $item,
        string $action,
        ?int $actorId = null,
        ?string $notes = null,
        array $meta = [],
    ): void {
        $item->logs()->create([
            'actor_id' => $actorId,
            'logged_at' => now(),
            'action' => $action,
            'notes' => $notes,
            'meta' => $meta !== [] ? $meta : null,
        ]);
    }
}
