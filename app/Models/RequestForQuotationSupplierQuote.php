<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RequestForQuotationSupplierQuote extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_for_quotation_id',
        'supplier_id',
        'quote_date',
        'tax_amount',
        'shipping_cost',
        'payment_terms',
        'eta',
    ];

    protected $casts = [
        'quote_date' => 'datetime',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'eta' => 'date',
    ];

    public function requestForQuotation(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotation::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RequestForQuotationSupplierQuoteItem::class, 'supplier_quote_id')->orderBy('id');
    }
}
