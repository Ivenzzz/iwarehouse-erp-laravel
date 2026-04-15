<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_variant_id',
        'warehouse_id',
        'imei',
        'imei2',
        'serial_number',
        'status',
        'cost_price',
        'cash_price',
        'srp_price',
        'package',
        'warranty',
        'product_type',
        'with_charger',
        'encoded_at',
        'grn_number',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'cash_price' => 'decimal:2',
        'srp_price' => 'decimal:2',
        'with_charger' => 'bool',
        'encoded_at' => 'datetime',
    ];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(InventoryItemLog::class)->orderByDesc('logged_at');
    }

    public function salesTransactionItems(): HasMany
    {
        return $this->hasMany(SalesTransactionItem::class);
    }

    public function salesTransactionItemComponents(): HasMany
    {
        return $this->hasMany(SalesTransactionItemComponent::class);
    }

    protected function imei1(): Attribute
    {
        return Attribute::get(fn () => $this->imei);
    }

    protected function warrantyDescription(): Attribute
    {
        return Attribute::get(fn () => $this->warranty);
    }

    protected function srp(): Attribute
    {
        return Attribute::get(fn () => $this->srp_price);
    }

    protected function createdDate(): Attribute
    {
        return Attribute::get(fn () => optional($this->created_at)?->toDateTimeString());
    }

    protected function encodedDate(): Attribute
    {
        return Attribute::get(fn () => optional($this->encoded_at ?? $this->created_at)?->toDateTimeString());
    }
}
