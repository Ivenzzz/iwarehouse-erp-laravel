<?php

namespace App\Features\Customers\Actions;

use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class SaveCustomer
{
    public function handle(array $payload, ?Customer $customer = null): Customer
    {
        return DB::transaction(function () use ($payload, $customer) {
            $customerPayload = [
                'customer_kind' => $payload['customer_kind'],
                'firstname' => $payload['customer_kind'] === Customer::KIND_PERSON ? $payload['firstname'] : null,
                'lastname' => $payload['customer_kind'] === Customer::KIND_PERSON ? $payload['lastname'] : null,
                'organization_name' => $payload['customer_kind'] === Customer::KIND_ORGANIZATION ? $payload['organization_name'] : null,
                'legal_name' => $payload['legal_name'],
                'tax_id' => $payload['tax_id'],
                'date_of_birth' => $payload['date_of_birth'],
                'customer_group_id' => $payload['customer_group_id'],
                'customer_type_id' => $payload['customer_type_id'],
                'status' => $payload['status'],
            ];

            if ($customer === null) {
                $customer = Customer::create($customerPayload);
            } else {
                $customer->update($customerPayload);
            }

            $customer->contacts()->updateOrCreate(
                ['is_primary' => true],
                [
                    'contact_type' => 'primary',
                    'firstname' => $payload['contact_firstname'],
                    'lastname' => $payload['contact_lastname'],
                    'email' => $payload['email'],
                    'phone' => $payload['phone'],
                    'is_primary' => true,
                ],
            );

            $customer->addresses()->updateOrCreate(
                ['is_primary' => true],
                [
                    'address_type' => 'primary',
                    'is_primary' => true,
                    'country' => 'PH',
                    'region' => $payload['region'],
                    'province' => $payload['province'],
                    'city_municipality' => $payload['city_municipality'],
                    'barangay' => $payload['barangay'],
                    'postal_code' => $payload['postal_code'],
                    'street' => $payload['street'],
                ],
            );

            return $customer;
        });
    }
}
