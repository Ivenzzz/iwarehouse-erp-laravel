<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_code',
        'legal_business_name',
        'trade_name',
        'address',
        'status',
    ];

    public function contact(): HasOne
    {
        return $this->hasOne(SupplierContact::class);
    }
}
