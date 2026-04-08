<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariantAttribute extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'label',
        'group',
        'data_type',
        'sort_order',
        'is_computer_only',
        'is_dimension',
    ];

    protected $casts = [
        'is_computer_only' => 'bool',
        'is_dimension' => 'bool',
    ];

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductCategory::class,
            'category_variant_attributes',
            'product_variant_attribute_id',
            'category_id',
        );
    }

    public function values(): HasMany
    {
        return $this->hasMany(ProductVariantValue::class);
    }
}
