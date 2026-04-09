<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyInfo extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'legal_name',
        'tax_id',
        'address',
        'phone',
        'email',
        'website',
        'logo_path',
    ];
}
