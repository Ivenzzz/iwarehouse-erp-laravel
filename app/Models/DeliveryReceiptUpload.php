<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryReceiptUpload extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_receipt_id',
        'vendor_dr_url',
        'waybill_url',
        'freight_invoice_url',
        'driver_id_url',
        'purchase_file_url',
        'uploads_complete',
    ];

    protected $casts = [
        'uploads_complete' => 'bool',
    ];

    public function deliveryReceipt(): BelongsTo
    {
        return $this->belongsTo(DeliveryReceipt::class);
    }

    public function boxPhotos(): HasMany
    {
        return $this->hasMany(DeliveryReceiptBoxPhoto::class);
    }
}
