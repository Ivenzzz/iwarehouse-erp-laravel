<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'transfer_number',
        'source_warehouse_id',
        'destination_warehouse_id',
        'created_by_id',
        'status',
        'operation_type',
        'priority',
        'reference',
        'notes',
    ];

    public function sourceWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'source_warehouse_id');
    }

    public function destinationWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'destination_warehouse_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItem::class)->orderBy('id');
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(StockTransferMilestone::class)->orderBy('occurred_at');
    }

    public function shipment(): HasOne
    {
        return $this->hasOne(StockTransferShipment::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(StockTransferReceipt::class)->orderBy('received_at');
    }

    public function consolidation(): HasOne
    {
        return $this->hasOne(StockTransferConsolidation::class, 'master_stock_transfer_id');
    }

    public function sourceConsolidationLink(): HasOne
    {
        return $this->hasOne(StockTransferConsolidationSource::class, 'source_stock_transfer_id');
    }
}
