<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptItemDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'goods_receipt_item_id',
        'package',
        'warranty',
        'cost_price',
        'cash_price',
        'srp',
        'product_type',
        'country_model',
        'with_charger',
        'item_notes',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'cash_price' => 'decimal:2',
        'srp' => 'decimal:2',
        'with_charger' => 'bool',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(GoodsReceiptItem::class, 'goods_receipt_item_id');
    }
}
