<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryReceiptBoxPhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_receipt_upload_id',
        'photo_url',
    ];

    public function upload(): BelongsTo
    {
        return $this->belongsTo(DeliveryReceiptUpload::class, 'delivery_receipt_upload_id');
    }
}
