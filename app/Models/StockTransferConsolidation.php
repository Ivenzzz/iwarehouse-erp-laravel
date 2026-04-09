<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransferConsolidation extends Model
{
    use HasFactory;

    protected $fillable = [
        'master_stock_transfer_id',
        'consolidated_by_id',
        'consolidated_at',
    ];

    protected $casts = [
        'consolidated_at' => 'datetime',
    ];

    public function masterTransfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class, 'master_stock_transfer_id');
    }

    public function consolidatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'consolidated_by_id');
    }

    public function sources(): HasMany
    {
        return $this->hasMany(StockTransferConsolidationSource::class);
    }
}
