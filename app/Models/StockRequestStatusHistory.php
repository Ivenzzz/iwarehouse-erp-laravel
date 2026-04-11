<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockRequestStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_request_id',
        'status',
        'actor_id',
        'occurred_at',
        'notes',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
    ];

    public function stockRequest(): BelongsTo
    {
        return $this->belongsTo(StockRequest::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
