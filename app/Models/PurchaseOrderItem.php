<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PurchaseOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'product_master_id',
        'quantity',
        'unit_price',
        'discount',
        'description',
    ];

    protected $casts = [
        'quantity' => 'int',
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function productMaster(): BelongsTo
    {
        return $this->belongsTo(ProductMaster::class, 'product_master_id');
    }

    public function spec(): HasOne
    {
        return $this->hasOne(PurchaseOrderItemSpec::class, 'purchase_order_item_id');
    }
}
