<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferShipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_transfer_id',
        'driver_name',
        'driver_contact',
        'courier_name',
        'proof_of_dispatch_path',
        'remarks',
    ];

    public function stockTransfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class);
    }
}
