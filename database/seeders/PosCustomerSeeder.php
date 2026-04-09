<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerContact;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use Illuminate\Database\Seeder;

class PosCustomerSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedCustomer(
            customerCode: 'POS-CUST-001',
            firstName: 'Walk',
            lastName: 'In',
            phone: '09170000000',
            email: null,
            street: 'Counter 1, Main Branch',
            barangay: 'Bagumbayan',
            city: 'Quezon City',
            province: 'Metro Manila',
            postalCode: '1110',
        );

        $this->seedCustomer(
            customerCode: 'POS-CUST-002',
            firstName: 'Maria',
            lastName: 'Santos',
            phone: '09171234567',
            email: 'maria.santos@example.com',
            street: '24 Emerald Street',
            barangay: 'San Antonio',
            city: 'Pasig City',
            province: 'Metro Manila',
            postalCode: '1605',
        );

        $this->seedCustomer(
            customerCode: 'POS-CUST-003',
            firstName: 'John',
            lastName: 'Dela Cruz',
            phone: '09179876543',
            email: 'john.delacruz@example.com',
            street: '18 Magsaysay Avenue',
            barangay: 'Capitol Site',
            city: 'Cebu City',
            province: 'Cebu',
            postalCode: '6000',
        );
    }

    private function seedCustomer(
        string $customerCode,
        string $firstName,
        string $lastName,
        string $phone,
        ?string $email,
        string $street,
        string $barangay,
        string $city,
        string $province,
        string $postalCode,
    ): void {
        $walkInGroupId = CustomerGroup::query()->where('name', 'Walk-in')->value('id');
        $retailTypeId = CustomerType::query()->where('name', 'retail')->value('id');

        $customer = Customer::query()->firstOrCreate(
            [
                'firstname' => $firstName,
                'lastname' => $lastName,
            ],
            [
                'customer_code' => $customerCode,
                'customer_kind' => Customer::KIND_PERSON,
                'customer_group_id' => $walkInGroupId,
                'customer_type_id' => $retailTypeId,
                'status' => Customer::STATUS_ACTIVE,
            ],
        );

        CustomerContact::query()->updateOrCreate(
            [
                'customer_id' => $customer->id,
                'contact_type' => 'mobile',
                'phone' => $phone,
            ],
            [
                'firstname' => $firstName,
                'lastname' => $lastName,
                'email' => $email,
                'is_primary' => true,
            ],
        );

        CustomerAddress::query()->updateOrCreate(
            [
                'customer_id' => $customer->id,
                'address_type' => 'billing',
            ],
            [
                'is_primary' => true,
                'country' => 'PH',
                'province' => $province,
                'city_municipality' => $city,
                'barangay' => $barangay,
                'postal_code' => $postalCode,
                'street' => $street,
            ],
        );
    }
}
