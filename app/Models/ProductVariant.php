<?php

namespace App\Models;

use App\Support\ProductVariantDefinitions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_master_id',
        'model_code',
        'sku',
        'condition',
        'color',
        'ram',
        'rom',
        'cpu',
        'gpu',
        'ram_type',
        'rom_type',
        'operating_system',
        'screen',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'bool',
    ];

    protected $appends = [
        'variant_name',
    ];

    public function productMaster(): BelongsTo
    {
        return $this->belongsTo(ProductMaster::class);
    }

    public function getVariantNameAttribute(): string
    {
        $this->loadMissing('productMaster.model.brand');

        $parts = array_filter([
            trim((string) $this->productMaster?->model?->brand?->name),
            trim((string) $this->productMaster?->model?->model_name),
            trim((string) $this->model_code),
            trim((string) $this->ram),
            trim((string) $this->rom),
            trim((string) $this->color),
        ]);

        return implode(' ', $parts);
    }

    public function attributesMap(bool $includeEmpty = false): array
    {
        return collect(ProductVariantDefinitions::all())
            ->reject(fn (array $definition) => $definition['key'] === 'condition')
            ->sortBy('sort_order')
            ->mapWithKeys(fn (array $definition) => [
                $definition['key'] => $this->getAttribute($definition['key']),
            ])
            ->filter(fn ($value) => $includeEmpty || trim((string) $value) !== '')
            ->all();
    }

    public function attributeTags(bool $includeEmpty = false): array
    {
        return collect(ProductVariantDefinitions::all())
            ->reject(fn (array $definition) => $definition['key'] === 'condition')
            ->sortBy('sort_order')
            ->map(fn (array $definition) => [
                'key' => $definition['key'],
                'label' => $definition['label'],
                'value' => $this->getAttribute($definition['key']),
            ])
            ->filter(fn (array $tag) => $includeEmpty || trim((string) $tag['value']) !== '')
            ->values()
            ->all();
    }
}
