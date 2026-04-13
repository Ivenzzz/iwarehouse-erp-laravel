<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockRequestApprovalReference extends Model
{
    use HasFactory;

    public const TYPES = [
        'rfq',
        'stock_transfer',
        'split_operation',
    ];

    protected $fillable = [
        'stock_request_approval_id',
        'reference_type',
        'reference_number',
    ];

    public function approval(): BelongsTo
    {
        return $this->belongsTo(StockRequestApproval::class, 'stock_request_approval_id');
    }
}
