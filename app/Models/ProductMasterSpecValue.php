<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductMasterSpecValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_master_id',
        'product_spec_definition_id',
        'value',
    ];

    public function productMaster(): BelongsTo
    {
        return $this->belongsTo(ProductMaster::class);
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(ProductSpecDefinition::class, 'product_spec_definition_id');
    }
}
