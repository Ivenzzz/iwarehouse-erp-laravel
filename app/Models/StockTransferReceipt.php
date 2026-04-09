<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransferReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_transfer_id',
        'received_by_id',
        'branch_remarks',
        'discrepancy_reason',
        'received_at',
    ];

    protected $casts = [
        'received_at' => 'datetime',
    ];

    public function stockTransfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferReceiptItem::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(StockTransferReceiptPhoto::class);
    }
}
