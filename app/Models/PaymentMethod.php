<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    public const TYPES = [
        'cash',
        'card',
        'ewallet',
        'financing',
        'bank_transfer',
        'cheque',
        'others',
    ];

    protected $fillable = [
        'name',
        'type',
        'logo',
    ];
}
