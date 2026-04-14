<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'status',
        'changed_by_id',
        'occurred_at',
        'notes',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_id');
    }
}

