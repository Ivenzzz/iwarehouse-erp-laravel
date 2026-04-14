<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryReceiptLogistics extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_receipt_id',
        'logistics_company',
        'waybill_number',
        'driver_name',
        'driver_contact',
        'origin',
        'destination',
        'freight_cost',
    ];

    protected $casts = [
        'freight_cost' => 'decimal:2',
    ];

    public function deliveryReceipt(): BelongsTo
    {
        return $this->belongsTo(DeliveryReceipt::class);
    }
}
