<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class ProductMaster extends Model
{
    use HasFactory;

    protected $fillable = [
        'master_sku',
        'model_id',
        'subcategory_id',
        'image_path',
        'description',
    ];

    protected $appends = [
        'image_url',
        'product_name',
    ];

    public function model(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'model_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'subcategory_id');
    }

    public function specValues(): HasMany
    {
        return $this->hasMany(ProductMasterSpecValue::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => $this->image_path
            ? Storage::disk('public')->url($this->image_path)
            : null);
    }

    protected function productName(): Attribute
    {
        return Attribute::get(function () {
            $this->loadMissing('model.brand');

            return trim($this->model->brand->name.' '.$this->model->model_name);
        });
    }
}
