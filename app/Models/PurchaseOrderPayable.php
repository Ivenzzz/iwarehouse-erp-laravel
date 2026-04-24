<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrderPayable extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'has_paid',
        'paid_by_id',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'has_paid' => 'bool',
        'paid_at' => 'datetime',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PurchaseOrderPayableDocument::class, 'purchase_order_payable_id')->orderByDesc('id');
    }
}
