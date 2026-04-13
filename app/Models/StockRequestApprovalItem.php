<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockRequestApprovalItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_request_approval_id',
        'stock_request_item_id',
        'approved_quantity',
    ];

    protected $casts = [
        'approved_quantity' => 'integer',
    ];

    public function approval(): BelongsTo
    {
        return $this->belongsTo(StockRequestApproval::class, 'stock_request_approval_id');
    }

    public function stockRequestItem(): BelongsTo
    {
        return $this->belongsTo(StockRequestItem::class, 'stock_request_item_id');
    }
}
