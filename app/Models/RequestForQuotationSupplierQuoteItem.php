<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestForQuotationSupplierQuoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_quote_id',
        'rfq_item_id',
        'quoted_quantity',
        'unit_price',
        'discount',
    ];

    protected $casts = [
        'quoted_quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
    ];

    public function supplierQuote(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotationSupplierQuote::class, 'supplier_quote_id');
    }

    public function rfqItem(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotationItem::class, 'rfq_item_id');
    }
}
