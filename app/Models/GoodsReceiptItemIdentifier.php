<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptItemIdentifier extends Model
{
    use HasFactory;

    protected $fillable = [
        'goods_receipt_item_id',
        'serial_number',
        'imei1',
        'imei2',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(GoodsReceiptItem::class, 'goods_receipt_item_id');
    }
}
