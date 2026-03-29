<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductBrand extends Model
{
    use HasFactory;

    protected $table = 'product_brands';

    protected $fillable = [
        'name',
    ];

    public function models(): HasMany
    {
        return $this->hasMany(ProductModel::class, 'brand_id')->orderBy('model_name');
    }
}
