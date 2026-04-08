<?php

namespace App\Features\Warehouses\Actions;

use App\Models\Warehouse;

class SaveWarehouse
{
    /**
     * @param  array{
     *     name: string,
     *     warehouse_type: string,
     *     phone_number: string|null,
     *     email: string|null,
     *     street: string|null,
     *     city: string|null,
     *     province: string|null,
     *     zip_code: string|null,
     *     country: string|null,
     *     latitude: float|null,
     *     longitude: float|null,
     *     sort_order: int
     * }  $payload
     */
    public function handle(array $payload, ?Warehouse $warehouse = null): Warehouse
    {
        if ($warehouse === null) {
            return Warehouse::create($payload);
        }

        $warehouse->update($payload);

        return $warehouse;
    }
}
