<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProductModel extends Model
{
    use HasFactory;

    protected $table = 'product_models';

    protected $fillable = [
        'brand_id',
        'model_name',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(ProductBrand::class, 'brand_id');
    }

    public function productMaster(): HasOne
    {
        return $this->hasOne(ProductMaster::class, 'model_id');
    }
}
