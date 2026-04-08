<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_master_id',
        'variant_name',
        'sku',
        'condition',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'bool',
    ];

    public function productMaster(): BelongsTo
    {
        return $this->belongsTo(ProductMaster::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(ProductVariantValue::class)->with('attribute');
    }
}
