<?php

namespace App\Support;

class ProductVariantNameSql
{
    public static function expression(
        string $brandColumn = 'product_brands.name',
        string $modelColumn = 'product_models.model_name',
        string $modelCodeColumn = 'product_variants.model_code',
        string $ramColumn = 'product_variants.ram',
        string $romColumn = 'product_variants.rom',
        string $colorColumn = 'product_variants.color',
    ): string {
        return "TRIM(CONCAT_WS(' ', NULLIF({$brandColumn}, ''), NULLIF({$modelColumn}, ''), NULLIF({$modelCodeColumn}, ''), NULLIF({$ramColumn}, ''), NULLIF({$romColumn}, ''), NULLIF({$colorColumn}, '')))";
    }
}

