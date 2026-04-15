<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptDiscrepancy extends Model
{
    use HasFactory;

    protected $fillable = [
        'goods_receipt_id',
        'has_discrepancy',
        'discrepancy_summary',
    ];

    protected $casts = [
        'has_discrepancy' => 'bool',
    ];

    public function goodsReceipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class);
    }
}
