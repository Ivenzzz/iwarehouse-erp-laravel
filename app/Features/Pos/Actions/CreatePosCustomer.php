<?php

namespace App\Features\Pos\Actions;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerContact;
use Illuminate\Support\Facades\DB;

class CreatePosCustomer
{
    public function handle(array $payload): Customer
    {
        return DB::transaction(function () use ($payload) {
            $customer = Customer::create([
                'customer_kind' => Customer::KIND_PERSON,
                'firstname' => $payload['first_name'],
                'lastname' => $payload['last_name'],
                'status' => Customer::STATUS_ACTIVE,
            ]);

            CustomerContact::create([
                'customer_id' => $customer->id,
                'contact_type' => 'primary',
                'firstname' => $payload['first_name'],
                'lastname' => $payload['last_name'],
                'email' => $payload['email'] ?: null,
                'phone' => $payload['phone'],
                'is_primary' => true,
            ]);

            $address = $payload['address_json'] ?? [];

            CustomerAddress::create([
                'customer_id' => $customer->id,
                'address_type' => 'primary',
                'is_primary' => true,
                'country' => strtoupper((string) ($address['country_code'] ?? ($address['country'] ?? 'PH'))) === 'PH'
                    ? 'PH'
                    : (string) ($address['country_code'] ?? $address['country']),
                'region' => $address['region'] ?? null,
                'province' => $address['province'] ?? null,
                'city_municipality' => $address['city_municipality'] ?? null,
                'barangay' => $address['barangay'] ?? null,
                'postal_code' => $address['postal_code'] ?? null,
                'street' => $address['street'] ?? null,
            ]);

            return $customer->fresh([
                'contacts' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
                'addresses' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
                'salesTransactions.items.inventoryItem.productVariant.productMaster.model.brand',
            ]);
        });
    }
}
