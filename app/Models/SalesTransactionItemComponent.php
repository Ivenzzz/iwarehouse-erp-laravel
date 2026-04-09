<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesTransactionItemComponent extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_transaction_item_id',
        'inventory_item_id',
    ];

    public function salesTransactionItem(): BelongsTo
    {
        return $this->belongsTo(SalesTransactionItem::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }
}
