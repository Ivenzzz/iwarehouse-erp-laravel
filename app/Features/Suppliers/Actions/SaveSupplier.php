<?php

namespace App\Features\Suppliers\Actions;

use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

class SaveSupplier
{
    use GeneratesSupplierCodes;

    /**
     * @param  array{legal_business_name: string, trade_name: string|null, address: string|null, status: string, email: string|null, mobile: string|null}  $payload
     */
    public function handle(array $payload, ?Supplier $supplier = null): Supplier
    {
        return DB::transaction(function () use ($payload, $supplier) {
            $supplierPayload = [
                'legal_business_name' => $payload['legal_business_name'],
                'trade_name' => $payload['trade_name'],
                'address' => $payload['address'],
                'status' => $payload['status'],
            ];

            if ($supplier === null) {
                $supplier = Supplier::create([
                    ...$supplierPayload,
                    'supplier_code' => $this->nextSupplierCode(),
                ]);
            } else {
                $supplier->update($supplierPayload);
            }

            $supplier->contact()->updateOrCreate(
                ['supplier_id' => $supplier->id],
                [
                    'email' => $payload['email'],
                    'mobile' => $payload['mobile'],
                ],
            );

            return $supplier;
        });
    }
}
