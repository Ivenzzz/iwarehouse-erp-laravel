<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StockRequestApproval extends Model
{
    use HasFactory;

    public const ACTIONS = [
        'declined',
        'rfq_created',
        'stock_transfer_created',
        'split_operation_created',
    ];

    protected $fillable = [
        'stock_request_id',
        'status_history_id',
        'approver_id',
        'approval_date',
        'action',
        'notes',
    ];

    protected $casts = [
        'approval_date' => 'datetime',
    ];

    public function stockRequest(): BelongsTo
    {
        return $this->belongsTo(StockRequest::class);
    }

    public function statusHistory(): BelongsTo
    {
        return $this->belongsTo(StockRequestStatusHistory::class, 'status_history_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockRequestApprovalItem::class)->orderBy('id');
    }

    public function references(): HasMany
    {
        return $this->hasMany(StockRequestApprovalReference::class)->orderBy('id');
    }

    public function requestForQuotation(): HasOne
    {
        return $this->hasOne(RequestForQuotation::class, 'stock_request_approval_id');
    }
}
