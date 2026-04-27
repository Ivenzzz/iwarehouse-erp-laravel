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

    private const TRANSACTION_NUMBER_MIN_WIDTH = 6;
    private const TRANSACTION_NUMBER_MAX_LENGTH = 20;
    private const TEMP_TRANSACTION_PREFIX = 'tmp_';

    public bool $shouldResolveTransactionNumberFromId = false;

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

        static::creating(function (self $transaction): void {
            if (blank($transaction->transaction_number)) {
                $transaction->shouldResolveTransactionNumberFromId = true;
                $transaction->transaction_number = static::temporaryTransactionNumber();
            }
        });

        static::created(function (self $transaction): void {
            if (! $transaction->shouldResolveTransactionNumberFromId) {
                return;
            }

            $resolved = static::resolveUniqueTransactionNumberForId($transaction->id, $transaction->id);

            static::query()
                ->whereKey($transaction->id)
                ->update(['transaction_number' => $resolved]);

            $transaction->transaction_number = $resolved;
            $transaction->syncOriginalAttribute('transaction_number');
            $transaction->shouldResolveTransactionNumberFromId = false;
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

    public static function resolveUniqueTransactionNumberForId(int|string $id, ?int $ignoreRecordId = null): string
    {
        $suffixIndex = 0;

        while (true) {
            $candidate = static::formatTransactionNumberFromId($id, $suffixIndex);
            $query = static::query()->where('transaction_number', $candidate);

            if ($ignoreRecordId !== null) {
                $query->where('id', '!=', $ignoreRecordId);
            }

            if (! $query->exists()) {
                return $candidate;
            }

            $suffixIndex++;
        }
    }

    public static function formatTransactionNumberFromId(int|string $id, int $suffixIndex = 0): string
    {
        $base = str_pad((string) $id, self::TRANSACTION_NUMBER_MIN_WIDTH, '0', STR_PAD_LEFT);

        if ($suffixIndex <= 0) {
            return substr($base, 0, self::TRANSACTION_NUMBER_MAX_LENGTH);
        }

        $suffix = '-'.$suffixIndex;
        $baseLength = self::TRANSACTION_NUMBER_MAX_LENGTH - strlen($suffix);
        $trimmedBase = $baseLength > 0 ? substr($base, 0, $baseLength) : '';

        return $trimmedBase.$suffix;
    }

    private static function temporaryTransactionNumber(): string
    {
        return self::TEMP_TRANSACTION_PREFIX.bin2hex(random_bytes(8));
    }
}
