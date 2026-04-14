<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DeliveryReceiptItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_receipt_id',
        'product_master_id',
        'expected_quantity',
        'actual_quantity',
        'unit_cost',
        'cash_price',
        'srp_price',
        'total_value',
        'variance_flag',
        'variance_notes',
    ];

    protected $casts = [
        'variance_flag' => 'bool',
        'unit_cost' => 'decimal:2',
        'cash_price' => 'decimal:2',
        'srp_price' => 'decimal:2',
        'total_value' => 'decimal:2',
    ];

    public function deliveryReceipt(): BelongsTo
    {
        return $this->belongsTo(DeliveryReceipt::class);
    }

    public function productMaster(): BelongsTo
    {
        return $this->belongsTo(ProductMaster::class, 'product_master_id');
    }

    public function spec(): HasOne
    {
        return $this->hasOne(DeliveryReceiptItemSpec::class);
    }
}
