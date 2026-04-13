<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RequestForQuotationItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_for_quotation_id',
        'variant_id',
        'quantity',
        'description',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function requestForQuotation(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotation::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function supplierQuoteItems(): HasMany
    {
        return $this->hasMany(RequestForQuotationSupplierQuoteItem::class, 'rfq_item_id')->orderBy('id');
    }
}
