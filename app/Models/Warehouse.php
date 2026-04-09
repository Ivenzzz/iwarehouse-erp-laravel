<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    use HasFactory;

    public const TYPES = [
        'main_warehouse',
        'warehouse',
        'store',
        'kiosk',
        'third_party',
    ];

    protected $fillable = [
        'name',
        'warehouse_type',
        'phone_number',
        'email',
        'street',
        'city',
        'province',
        'zip_code',
        'country',
        'latitude',
        'longitude',
        'sort_order',
    ];

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function posSessions(): HasMany
    {
        return $this->hasMany(PosSession::class);
    }
}
