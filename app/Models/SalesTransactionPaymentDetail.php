<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesTransactionPaymentDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_transaction_payment_id',
        'is_cash',
        'reference_number',
        'downpayment',
        'bank',
        'terminal_used',
        'card_holder_name',
        'loan_term_months',
        'sender_mobile',
        'contract_id',
        'registered_mobile',
    ];

    protected function casts(): array
    {
        return [
            'is_cash' => 'boolean',
            'loan_term_months' => 'integer',
        ];
    }

    public function salesTransactionPayment(): BelongsTo
    {
        return $this->belongsTo(SalesTransactionPayment::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(SalesTransactionPaymentDocument::class);
    }
}
