<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesTransactionPaymentDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_transaction_payment_detail_id',
        'document_name',
        'document_url',
        'document_type',
    ];

    public function salesTransactionPaymentDetail(): BelongsTo
    {
        return $this->belongsTo(SalesTransactionPaymentDetail::class);
    }
}
