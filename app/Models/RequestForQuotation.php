<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RequestForQuotation extends Model
{
    use HasFactory;

    public const STATUSES = [
        'draft',
        'receiving_quotes',
        'converted_to_po',
        'consolidated',
        'closed',
        'cancelled',
    ];

    protected $fillable = [
        'rfq_number',
        'stock_request_id',
        'stock_request_approval_id',
        'created_by_id',
        'status',
        'selected_supplier_quote_id',
    ];

    public function stockRequest(): BelongsTo
    {
        return $this->belongsTo(StockRequest::class);
    }

    public function stockRequestApproval(): BelongsTo
    {
        return $this->belongsTo(StockRequestApproval::class, 'stock_request_approval_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function selectedSupplierQuote(): BelongsTo
    {
        return $this->belongsTo(RequestForQuotationSupplierQuote::class, 'selected_supplier_quote_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RequestForQuotationItem::class)->orderBy('id');
    }

    public function supplierQuotes(): HasMany
    {
        return $this->hasMany(RequestForQuotationSupplierQuote::class)->orderBy('id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(RequestForQuotationStatusHistory::class)->orderBy('occurred_at');
    }

    public function sourceLinks(): HasMany
    {
        return $this->hasMany(RequestForQuotationSource::class)->orderBy('id');
    }
}
