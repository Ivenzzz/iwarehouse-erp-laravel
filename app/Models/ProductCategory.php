<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductCategory extends Model
{
    use HasFactory;

    protected $table = 'product_categories';

    protected $fillable = [
        'name',
        'parent_category_id',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_category_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_category_id')->orderBy('name');
    }

    public function productMasters(): HasMany
    {
        return $this->hasMany(ProductMaster::class, 'subcategory_id');
    }

    public function variantAttributes(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductVariantAttribute::class,
            'category_variant_attributes',
            'category_id',
            'product_variant_attribute_id',
        )->orderBy('sort_order');
    }
}
