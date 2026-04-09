<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class SalesTransactionItem extends Model
{
    use HasFactory;

    public const PRICE_BASIS_CASH = 'cash';
    public const PRICE_BASIS_SRP = 'srp';

    protected $fillable = [
        'sales_transaction_id',
        'inventory_item_id',
        'price_basis',
        'snapshot_cash_price',
        'snapshot_srp',
        'snapshot_cost_price',
        'discount_amount',
        'discount_proof_image_url',
        'discount_validated_at',
        'line_total',
        'is_bundle',
        'bundle_serial',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_cash_price' => 'decimal:2',
            'snapshot_srp' => 'decimal:2',
            'snapshot_cost_price' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'discount_validated_at' => 'datetime',
            'line_total' => 'decimal:2',
            'is_bundle' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $item): void {
            $item->price_basis ??= self::PRICE_BASIS_CASH;
            $item->discount_amount ??= 0;
            $item->is_bundle ??= false;

            if (! in_array($item->price_basis, [self::PRICE_BASIS_CASH, self::PRICE_BASIS_SRP], true)) {
                throw new InvalidArgumentException('Sales transaction item price_basis is invalid.');
            }

            if ($item->inventory_item_id === null || $item->line_total === null) {
                throw new InvalidArgumentException('Sales transaction items require inventory_item_id and line_total.');
            }
        });
    }

    public function salesTransaction(): BelongsTo
    {
        return $this->belongsTo(SalesTransaction::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function components(): HasMany
    {
        return $this->hasMany(SalesTransactionItemComponent::class);
    }
}
