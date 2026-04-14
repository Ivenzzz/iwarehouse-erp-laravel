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
        'variant_name',
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

    public function productMaster(): BelongsTo
    {
        return $this->belongsTo(ProductMaster::class);
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
