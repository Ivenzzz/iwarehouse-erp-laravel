<?php

namespace App\Features\Suppliers\Actions;

use App\Models\Supplier;

trait GeneratesSupplierCodes
{
    private function nextSupplierCode(): string
    {
        $lastCode = Supplier::query()
            ->where('supplier_code', 'like', 'S%')
            ->orderByDesc('id')
            ->value('supplier_code');

        $nextNumber = $lastCode !== null
            ? ((int) substr($lastCode, 1)) + 1
            : 1;

        return 'S'.str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);
    }
}
