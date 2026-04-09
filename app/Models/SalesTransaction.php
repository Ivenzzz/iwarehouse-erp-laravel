<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class SalesTransaction extends Model
{
    use HasFactory;

    public const MODE_PICKUP = 'Item Claimed / Pick-up';
    public const MODE_DELIVERY = 'Delivery';

    protected $fillable = [
        'transaction_number',
        'or_number',
        'customer_id',
        'pos_session_id',
        'sales_representative_id',
        'mode_of_release',
        'remarks',
        'notes',
        'total_amount',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $transaction): void {
            $transaction->transaction_number ??= static::nextTransactionNumber();
            $transaction->mode_of_release ??= self::MODE_PICKUP;

            if (blank($transaction->or_number)) {
                throw new InvalidArgumentException('Sales transactions require or_number.');
            }

            if ($transaction->customer_id === null || $transaction->pos_session_id === null) {
                throw new InvalidArgumentException('Sales transactions require customer and POS session.');
            }

            if ($transaction->total_amount === null) {
                throw new InvalidArgumentException('Sales transactions require total_amount.');
            }

            if (! in_array($transaction->mode_of_release, [self::MODE_PICKUP, self::MODE_DELIVERY], true)) {
                throw new InvalidArgumentException('Mode of release is invalid.');
            }
        });
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function posSession(): BelongsTo
    {
        return $this->belongsTo(PosSession::class);
    }

    public function salesRepresentative(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'sales_representative_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesTransactionItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalesTransactionPayment::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(SalesTransactionDocument::class);
    }

    private static function nextTransactionNumber(): string
    {
        $latestNumber = static::query()
            ->orderByDesc('id')
            ->value('transaction_number');

        if (! is_string($latestNumber) || ! preg_match('/(\d+)$/', $latestNumber, $matches)) {
            return '000001';
        }

        return sprintf('%06d', ((int) $matches[1]) + 1);
    }
}
