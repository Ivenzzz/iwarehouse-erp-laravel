<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use InvalidArgumentException;

class SalesTransactionPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_transaction_id',
        'payment_method_id',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $payment): void {
            if ($payment->payment_method_id === null || $payment->amount === null) {
                throw new InvalidArgumentException('Sales transaction payments require payment_method_id and amount.');
            }
        });
    }

    public function salesTransaction(): BelongsTo
    {
        return $this->belongsTo(SalesTransaction::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function detail(): HasOne
    {
        return $this->hasOne(SalesTransactionPaymentDetail::class);
    }
}
