<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryReceiptItemSpec extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_receipt_item_id',
        'model_code',
        'ram',
        'rom',
        'condition',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(DeliveryReceiptItem::class, 'delivery_receipt_item_id');
    }
}
