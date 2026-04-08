<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryItemLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_item_id',
        'actor_id',
        'logged_at',
        'action',
        'notes',
        'meta',
    ];

    protected $casts = [
        'logged_at' => 'datetime',
        'meta' => 'array',
    ];

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
