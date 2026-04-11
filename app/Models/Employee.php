<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class Employee extends Model
{
    use HasFactory;

    public const EMPLOYMENT_TYPE_FULL_TIME = 'Full-Time';
    public const EMPLOYMENT_TYPE_PART_TIME = 'Part-Time';
    public const STATUS_ACTIVE = 'Active';
    public const STATUS_INACTIVE = 'Inactive';
    public const STATUS_TERMINATED = 'Terminated';

    protected $fillable = [
        'employee_id',
        'job_title_id',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'phone',
        'address',
        'hire_date',
        'employment_type',
        'oic_password_hash',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'hire_date' => 'date',
            'oic_password_hash' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $employee): void {
            $employee->status ??= self::STATUS_ACTIVE;

            if ($employee->employment_type !== null
                && ! in_array($employee->employment_type, [
                    self::EMPLOYMENT_TYPE_FULL_TIME,
                    self::EMPLOYMENT_TYPE_PART_TIME,
                ], true)) {
                throw new InvalidArgumentException('Employment type must be Full-Time or Part-Time.');
            }

            if (! in_array($employee->status, [
                self::STATUS_ACTIVE,
                self::STATUS_INACTIVE,
                self::STATUS_TERMINATED,
            ], true)) {
                throw new InvalidArgumentException('Employee status is invalid.');
            }
        });
    }

    public function jobTitle(): BelongsTo
    {
        return $this->belongsTo(JobTitle::class);
    }

    public function employeeAccount(): HasOne
    {
        return $this->hasOne(EmployeeAccount::class);
    }

    public function posSessions(): HasMany
    {
        return $this->hasMany(PosSession::class);
    }

    public function salesTransactions(): HasMany
    {
        return $this->hasMany(SalesTransaction::class, 'sales_representative_id');
    }
}
