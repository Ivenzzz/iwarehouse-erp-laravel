<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductSpecDefinition extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'label',
        'group',
        'sort_order',
    ];

    public function values(): HasMany
    {
        return $this->hasMany(ProductMasterSpecValue::class);
    }
}
