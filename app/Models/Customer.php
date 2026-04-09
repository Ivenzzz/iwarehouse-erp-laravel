<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use InvalidArgumentException;

class Customer extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const KIND_PERSON = 'person';
    public const KIND_ORGANIZATION = 'organization';
    public const STATUS_ACTIVE = 'active';

    protected $fillable = [
        'customer_code',
        'customer_kind',
        'firstname',
        'lastname',
        'organization_name',
        'legal_name',
        'tax_id',
        'date_of_birth',
        'customer_group_id',
        'customer_type_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $customer): void {
            $customer->customer_kind ??= self::KIND_PERSON;
            $customer->status ??= self::STATUS_ACTIVE;
            $customer->customer_group_id ??= CustomerGroup::query()->where('name', 'Walk-in')->value('id');
            $customer->customer_type_id ??= CustomerType::query()->where('name', 'retail')->value('id');
            $customer->customer_code ??= static::nextCustomerCode();

            $kind = $customer->customer_kind;

            if (! in_array($kind, [self::KIND_PERSON, self::KIND_ORGANIZATION], true)) {
                throw new InvalidArgumentException('Customer kind must be person or organization.');
            }

            if ($kind === self::KIND_PERSON) {
                if (blank($customer->firstname) || blank($customer->lastname)) {
                    throw new InvalidArgumentException('Person customers require firstname and lastname.');
                }
            }

            if ($kind === self::KIND_ORGANIZATION && blank($customer->organization_name)) {
                throw new InvalidArgumentException('Organization customers require organization_name.');
            }
        });
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(CustomerGroup::class, 'customer_group_id');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(CustomerType::class, 'customer_type_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(CustomerContact::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    public function salesTransactions(): HasMany
    {
        return $this->hasMany(SalesTransaction::class);
    }

    private static function nextCustomerCode(): string
    {
        $latestCode = static::withTrashed()
            ->where('customer_code', 'like', 'C%')
            ->orderByDesc('id')
            ->value('customer_code');

        if (! is_string($latestCode) || ! preg_match('/(\d+)$/', $latestCode, $matches)) {
            return 'C001';
        }

        return sprintf('C%03d', ((int) $matches[1]) + 1);
    }
}
