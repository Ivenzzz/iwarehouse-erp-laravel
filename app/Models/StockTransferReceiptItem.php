<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferReceiptItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_transfer_receipt_id',
        'stock_transfer_item_id',
        'inventory_item_id',
        'receipt_item_type',
        'product_name',
        'variant_name',
        'imei1',
        'imei2',
        'serial_number',
        'scanned_barcode',
        'occurred_at',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
    ];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(StockTransferReceipt::class, 'stock_transfer_receipt_id');
    }

    public function transferItem(): BelongsTo
    {
        return $this->belongsTo(StockTransferItem::class, 'stock_transfer_item_id');
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }
}
