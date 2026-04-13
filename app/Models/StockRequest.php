<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StockRequest extends Model
{
    use HasFactory;

    public const PURPOSES = [
        'Replenishment',
        'Display Refill',
        'Fast-Moving Refill',
        'Customer Reservation',
        'Pre-Event Stock',
        'New Store Opening',
        'Other',
    ];

    public const STATUSES = [
        'pending',
        'declined',
        'rfq_created',
        'stock_transfer_created',
        'split_operation_created',
    ];

    protected $fillable = [
        'request_number',
        'warehouse_id',
        'requestor_id',
        'required_at',
        'purpose',
        'status',
        'notes',
    ];

    protected $casts = [
        'required_at' => 'datetime',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function requestor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requestor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockRequestItem::class)->orderBy('id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(StockRequestStatusHistory::class)->orderBy('occurred_at');
    }

    public function approval(): HasOne
    {
        return $this->hasOne(StockRequestApproval::class)->latestOfMany('approval_date');
    }

    public function requestForQuotation(): HasOne
    {
        return $this->hasOne(RequestForQuotation::class)->latestOfMany();
    }
}
