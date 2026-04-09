<?php

namespace Database\Seeders;

use App\Models\CompanyInfo;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class PosLookupSeeder extends Seeder
{
    public function run(): void
    {
        CompanyInfo::query()->updateOrCreate(
            ['company_name' => 'iWarehouse Demo'],
            [
                'legal_name' => 'iWarehouse Demo Inc.',
                'tax_id' => 'TIN-123-456-789-000',
                'address' => '123 Aurora Boulevard, Quezon City, Metro Manila, Philippines',
                'phone' => '+63 917 000 0000',
                'email' => 'sales@iwarehouse.demo',
                'website' => 'https://iwarehouse.demo',
            ],
        );

        CustomerGroup::query()->firstOrCreate(['name' => 'Walk-in']);
        CustomerGroup::query()->firstOrCreate(['name' => 'VIP']);

        CustomerType::query()->firstOrCreate(['name' => 'retail']);
        CustomerType::query()->firstOrCreate(['name' => 'installment']);

        $operationsDepartment = Department::query()->updateOrCreate(
            ['name' => 'Operations'],
            ['status' => Department::STATUS_ACTIVE],
        );

        $salesDepartment = Department::query()->updateOrCreate(
            ['name' => 'Sales'],
            ['status' => Department::STATUS_ACTIVE],
        );

        $cashierJobTitle = JobTitle::query()->updateOrCreate(
            ['department_id' => $operationsDepartment->id, 'name' => 'Cashier'],
            ['status' => JobTitle::STATUS_ACTIVE],
        );

        $salesRepresentativeJobTitle = JobTitle::query()->updateOrCreate(
            ['department_id' => $salesDepartment->id, 'name' => 'Sales Representative'],
            ['status' => JobTitle::STATUS_ACTIVE],
        );

        JobTitle::query()->updateOrCreate(
            ['department_id' => $salesDepartment->id, 'name' => 'Senior Sales Associate'],
            ['status' => JobTitle::STATUS_ACTIVE],
        );

        Warehouse::query()->updateOrCreate(
            ['name' => 'Main Branch'],
            [
                'warehouse_type' => 'store',
                'phone_number' => '+63 917 100 0001',
                'email' => 'main.branch@iwarehouse.demo',
                'street' => '123 Aurora Boulevard',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'zip_code' => '1109',
                'country' => 'PH',
                'sort_order' => 10,
            ],
        );

        Warehouse::query()->updateOrCreate(
            ['name' => 'Annex Branch'],
            [
                'warehouse_type' => 'store',
                'phone_number' => '+63 917 100 0002',
                'email' => 'annex.branch@iwarehouse.demo',
                'street' => '45 Shaw Boulevard',
                'city' => 'Mandaluyong',
                'province' => 'Metro Manila',
                'zip_code' => '1550',
                'country' => 'PH',
                'sort_order' => 20,
            ],
        );

        foreach ([
            ['name' => 'Cash', 'type' => 'cash'],
            ['name' => 'Credit Card', 'type' => 'card'],
            ['name' => 'Debit Card', 'type' => 'card'],
            ['name' => 'GCash', 'type' => 'ewallet'],
            ['name' => 'Maya', 'type' => 'ewallet'],
            ['name' => 'Bank Transfer', 'type' => 'bank_transfer'],
            ['name' => 'Home Credit', 'type' => 'financing'],
            ['name' => 'Samsung Finance+', 'type' => 'financing'],
            ['name' => 'Cheque', 'type' => 'cheque'],
            ['name' => 'Others', 'type' => 'others'],
        ] as $paymentMethod) {
            PaymentMethod::query()->updateOrCreate(
                ['name' => $paymentMethod['name']],
                $paymentMethod,
            );
        }

        User::query()->updateOrCreate(
            ['username' => 'cashier'],
            [
                'name' => 'POS Cashier',
                'email' => 'pos.cashier@example.com',
                'password' => 'Password123!',
            ],
        );

        Employee::query()->updateOrCreate(
            ['employee_id' => 'EMP-000001'],
            [
                'job_title_id' => $cashierJobTitle->id,
                'first_name' => 'ERP',
                'last_name' => 'Administrator',
                'email' => null,
                'status' => Employee::STATUS_ACTIVE,
            ],
        );

        Employee::query()->updateOrCreate(
            ['employee_id' => 'EMP-000002'],
            [
                'job_title_id' => $cashierJobTitle->id,
                'first_name' => 'POS',
                'last_name' => 'Cashier',
                'email' => 'pos.cashier@example.com',
                'status' => Employee::STATUS_ACTIVE,
            ],
        );

        Employee::query()->updateOrCreate(
            ['employee_id' => 'EMP-000003'],
            [
                'job_title_id' => $salesRepresentativeJobTitle->id,
                'first_name' => 'Mia',
                'last_name' => 'Santos',
                'email' => 'mia.santos@iwarehouse.demo',
                'status' => Employee::STATUS_ACTIVE,
            ],
        );

        Employee::query()->updateOrCreate(
            ['employee_id' => 'EMP-000004'],
            [
                'job_title_id' => $salesRepresentativeJobTitle->id,
                'first_name' => 'Noel',
                'last_name' => 'Reyes',
                'email' => 'noel.reyes@iwarehouse.demo',
                'status' => Employee::STATUS_ACTIVE,
            ],
        );
    }
}
