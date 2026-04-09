<?php

namespace App\Features\CompanyInfo\Support;

use App\Models\CompanyInfo;
use Illuminate\Support\Facades\Storage;

class CompanyInfoDataTransformer
{
    public static function transform(?CompanyInfo $companyInfo): ?array
    {
        if ($companyInfo === null) {
            return null;
        }

        return [
            'id' => $companyInfo->id,
            'company_name' => $companyInfo->company_name,
            'legal_name' => $companyInfo->legal_name,
            'tax_id' => $companyInfo->tax_id,
            'address' => $companyInfo->address,
            'phone' => $companyInfo->phone,
            'email' => $companyInfo->email,
            'website' => $companyInfo->website,
            'logo_url' => $companyInfo->logo_path ? Storage::disk('public')->url($companyInfo->logo_path) : null,
        ];
    }
}
