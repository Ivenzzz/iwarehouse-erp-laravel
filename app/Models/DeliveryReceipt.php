<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DeliveryReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_id',
        'po_id',
        'dr_number',
        'reference_number',
        'date_received',
        'date_encoded',
        'received_by_user_id',
        'encoded_by_user_id',
        'payment_term_id',
        'box_count_declared',
        'box_count_received',
        'has_variance',
        'variance_notes',
        'dr_value',
        'total_landed_cost',
        'has_goods_receipt',
    ];

    protected $casts = [
        'date_received' => 'datetime',
        'date_encoded' => 'datetime',
        'has_variance' => 'bool',
        'has_goods_receipt' => 'bool',
        'dr_value' => 'decimal:2',
        'total_landed_cost' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }

    public function encodedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'encoded_by_user_id');
    }

    public function paymentTerm(): BelongsTo
    {
        return $this->belongsTo(PaymentTerm::class);
    }

    public function logistics(): HasOne
    {
        return $this->hasOne(DeliveryReceiptLogistics::class);
    }

    public function upload(): HasOne
    {
        return $this->hasOne(DeliveryReceiptUpload::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DeliveryReceiptItem::class)->orderBy('id');
    }

    public function goodsReceipt(): HasOne
    {
        return $this->hasOne(GoodsReceipt::class);
    }
}
