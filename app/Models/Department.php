<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'Active';
    public const STATUS_INACTIVE = 'Inactive';

    protected $fillable = [
        'name',
        'status',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $department): void {
            $department->status ??= self::STATUS_ACTIVE;
        });
    }

    public function jobTitles(): HasMany
    {
        return $this->hasMany(JobTitle::class);
    }
}
