<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferConsolidationSource extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_transfer_consolidation_id',
        'source_stock_transfer_id',
    ];

    public function consolidation(): BelongsTo
    {
        return $this->belongsTo(StockTransferConsolidation::class, 'stock_transfer_consolidation_id');
    }

    public function sourceTransfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class, 'source_stock_transfer_id');
    }
}
