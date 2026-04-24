<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderPayableDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_payable_id',
        'document_url',
        'document_name',
    ];

    public function payable(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrderPayable::class, 'purchase_order_payable_id');
    }
}

