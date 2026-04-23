<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class PosSession extends Model
{
    use HasFactory;

    public const STATUS_OPENED = 'opened';
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'session_number',
        'user_id',
        'warehouse_id',
        'opening_balance',
        'closing_balance',
        'shift_start_time',
        'shift_end_time',
        'status',
        'cashier_remarks',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'closing_balance' => 'decimal:2',
            'shift_start_time' => 'datetime',
            'shift_end_time' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $session): void {
            $session->status ??= self::STATUS_OPENED;
            $session->session_number ??= static::nextSessionNumber();

            if (! in_array($session->status, [self::STATUS_OPENED, self::STATUS_CLOSED], true)) {
                throw new InvalidArgumentException('POS session status must be opened or closed.');
            }

            if ($session->user_id === null || $session->warehouse_id === null) {
                throw new InvalidArgumentException('Opened POS sessions require user and warehouse.');
            }

            if ($session->opening_balance === null || $session->shift_start_time === null) {
                throw new InvalidArgumentException('Opened POS sessions require opening_balance and shift_start_time.');
            }

            if ($session->status === self::STATUS_CLOSED) {
                if ($session->closing_balance === null || $session->shift_end_time === null) {
                    throw new InvalidArgumentException('Closed POS sessions require closing_balance and shift_end_time.');
                }
            }

            if ($session->exists
                && $session->getOriginal('status') === self::STATUS_CLOSED
                && $session->status !== self::STATUS_CLOSED) {
                throw new InvalidArgumentException('Closed POS sessions cannot be reopened.');
            }

            if ($session->status === self::STATUS_OPENED && static::hasAnotherOpenSession($session)) {
                throw new InvalidArgumentException('User already has an open POS session.');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function salesTransactions(): HasMany
    {
        return $this->hasMany(SalesTransaction::class);
    }

    private static function hasAnotherOpenSession(self $session): bool
    {
        return static::query()
            ->where('user_id', $session->user_id)
            ->where('status', self::STATUS_OPENED)
            ->when($session->exists, fn ($query) => $query->whereKeyNot($session->getKey()))
            ->exists();
    }

    private static function nextSessionNumber(): string
    {
        $latestNumber = static::query()
            ->where('session_number', 'like', 'PSS-%')
            ->orderByDesc('id')
            ->value('session_number');

        if (! is_string($latestNumber) || ! preg_match('/(\d+)$/', $latestNumber, $matches)) {
            return 'PSS-000001';
        }

        return sprintf('PSS-%06d', ((int) $matches[1]) + 1);
    }
}
