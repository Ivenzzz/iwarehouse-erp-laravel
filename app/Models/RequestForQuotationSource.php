<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestForQuotationSource extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_for_quotation_id',
        'source_request_for_quotation_id',
        'source_stock_request_id',
    ];

    public function requestForQuotation(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotation::class);
    }

    public function sourceRequestForQuotation(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotation::class, 'source_request_for_quotation_id');
    }

    public function sourceStockRequest(): BelongsTo
    {
        return $this->belongsTo(StockRequest::class, 'source_stock_request_id');
    }
}
