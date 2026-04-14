<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'po_number',
        'rfq_id',
        'supplier_id',
        'selected_supplier_quote_id',
        'shipping_method_id',
        'payment_term_id',
        'expected_delivery_date',
        'status',
        'has_delivery_receipt',
    ];

    protected $casts = [
        'expected_delivery_date' => 'date',
        'has_delivery_receipt' => 'bool',
    ];

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotation::class, 'rfq_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function selectedSupplierQuote(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotationSupplierQuote::class, 'selected_supplier_quote_id');
    }

    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class);
    }

    public function paymentTerm(): BelongsTo
    {
        return $this->belongsTo(PaymentTerm::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class)->orderBy('id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(PurchaseOrderStatusHistory::class)->orderBy('occurred_at');
    }

    public function approval(): HasOne
    {
        return $this->hasOne(PurchaseOrderApproval::class);
    }

    public function payable(): HasOne
    {
        return $this->hasOne(PurchaseOrderPayable::class);
    }
}

