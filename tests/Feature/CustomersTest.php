<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomersTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_customers_page(): void
    {
        $this->get('/customers')->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_customers_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('customers.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Customers')
                ->has('customers.data')
                ->has('customerGroups')
                ->has('customerTypes')
                ->where('filters.search', '')
                ->where('filters.sort', 'customer_code')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_customers_index_searches_sorts_and_filters(): void
    {
        $user = User::factory()->create();
        $group = CustomerGroup::where('name', 'Corporate')->firstOrFail();
        $type = CustomerType::where('name', 'wholesale')->firstOrFail();

        $this->createCustomer([
            'customer_code' => 'C001',
            'firstname' => 'Ada',
            'lastname' => 'Lovelace',
            'status' => 'active',
        ], ['email' => 'ada@example.test', 'phone' => '09170000001']);

        $this->createCustomer([
            'customer_code' => 'C002',
            'customer_kind' => Customer::KIND_ORGANIZATION,
            'firstname' => null,
            'lastname' => null,
            'organization_name' => 'Northwind Traders',
            'customer_group_id' => $group->id,
            'customer_type_id' => $type->id,
            'status' => 'blacklisted',
        ], ['email' => 'orders@northwind.test', 'phone' => '09170000002']);

        $this->actingAs($user)
            ->get(route('customers.index', ['search' => 'northwind']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customers.data', 1)
                ->where('customers.data.0.display_name', 'Northwind Traders')
            );

        $this->actingAs($user)
            ->get(route('customers.index', [
                'status' => 'blacklisted',
                'customer_kind' => 'organization',
                'customer_group_id' => $group->id,
                'customer_type_id' => $type->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('customers.data', 1)
                ->where('customers.data.0.customer_code', 'C002')
                ->where('filters.status', 'blacklisted')
            );

        $this->actingAs($user)
            ->get(route('customers.index', ['sort' => 'name', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('customers.data.0.display_name', 'Northwind Traders')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'desc')
            );
    }

    public function test_user_can_create_update_and_soft_delete_customer(): void
    {
        $user = User::factory()->create();
        $group = CustomerGroup::where('name', 'Walk-in')->firstOrFail();
        $type = CustomerType::where('name', 'retail')->firstOrFail();

        $payload = $this->payload([
            'customer_group_id' => $group->id,
            'customer_type_id' => $type->id,
        ]);

        $this->actingAs($user)
            ->post(route('customers.store'), $payload)
            ->assertRedirect(route('customers.index', absolute: false));

        $customer = Customer::where('firstname', 'Ada')->firstOrFail();

        $this->assertSame('C001', $customer->customer_code);
        $this->assertDatabaseHas('customer_contacts', [
            'customer_id' => $customer->id,
            'email' => 'ada@example.test',
            'phone' => '09170000001',
            'is_primary' => true,
        ]);

        $this->actingAs($user)
            ->put(route('customers.update', $customer), $this->payload([
                'customer_kind' => Customer::KIND_ORGANIZATION,
                'firstname' => '',
                'lastname' => '',
                'organization_name' => 'Ada Labs',
                'email' => 'hello@adalabs.test',
                'phone' => '09170000003',
                'status' => 'inactive',
                'customer_group_id' => $group->id,
                'customer_type_id' => $type->id,
            ]))
            ->assertRedirect(route('customers.index', absolute: false));

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'customer_kind' => Customer::KIND_ORGANIZATION,
            'organization_name' => 'Ada Labs',
            'status' => 'inactive',
        ]);

        $this->actingAs($user)
            ->delete(route('customers.destroy', $customer))
            ->assertRedirect(route('customers.index', absolute: false));

        $this->assertSoftDeleted('customers', ['id' => $customer->id]);
    }

    public function test_customer_validation_rejects_duplicate_phone_and_email(): void
    {
        $user = User::factory()->create();
        $existing = $this->createCustomer();
        $existing->contacts()->first()->update([
            'email' => 'taken@example.test',
            'phone' => '09170000009',
        ]);

        $this->actingAs($user)
            ->post(route('customers.store'), $this->payload([
                'email' => 'new@example.test',
                'phone' => '09170000009',
            ]))
            ->assertSessionHasErrors('phone');

        $this->actingAs($user)
            ->post(route('customers.store'), $this->payload([
                'email' => 'taken@example.test',
                'phone' => '09170000010',
            ]))
            ->assertSessionHasErrors('email');
    }

    public function test_import_creates_customers_and_skips_existing_or_duplicate_contacts(): void
    {
        $user = User::factory()->create();
        $this->createCustomer([], ['email' => 'existing@example.test', 'phone' => '09170000001']);
        $csv = <<<'CSV'
customer_kind,firstname,lastname,organization_name,legal_name,tax_id,date_of_birth,customer_group,customer_type,status,contact_firstname,contact_lastname,email,phone,street,region,province,city_municipality,barangay,postal_code
person,Ada,Lovelace,,,,,Walk-in,retail,active,Ada,Lovelace,existing@example.test,09170000001,Main Street,NCR,,Manila,Ermita,1000
person,Grace,Hopper,,,,,Walk-in,retail,active,Grace,Hopper,grace@example.test,09170000002,Main Street,NCR,,Manila,Ermita,1000
person,Grace,Hopper,,,,,Walk-in,retail,active,Grace,Hopper,grace@example.test,09170000002,Main Street,NCR,,Manila,Ermita,1000
organization,,,Northwind Traders,Northwind LLC,TAX-1,,Corporate,wholesale,inactive,Northwind,Orders,orders@northwind.test,09170000003,Commerce Ave,NCR,,Makati,Poblacion,1200
CSV;

        $file = UploadedFile::fake()->createWithContent('customers.csv', $csv);

        $this->actingAs($user)
            ->post(route('customers.import'), ['file' => $file])
            ->assertRedirect(route('customers.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('customers', ['firstname' => 'Grace', 'lastname' => 'Hopper']);
        $this->assertDatabaseHas('customers', ['organization_name' => 'Northwind Traders']);
        $this->assertSame(1, Customer::where('firstname', 'Grace')->count());
    }

    public function test_import_rejects_invalid_rows_without_partial_inserts(): void
    {
        $user = User::factory()->create();
        $csv = <<<'CSV'
customer_kind,firstname,lastname,organization_name,legal_name,tax_id,date_of_birth,customer_group,customer_type,status,contact_firstname,contact_lastname,email,phone,street,region,province,city_municipality,barangay,postal_code
person,Ada,Lovelace,,,,,Walk-in,retail,active,Ada,Lovelace,ada@example.test,09170000001,Main Street,NCR,,Manila,Ermita,1000
person,Missing,,,,,,Walk-in,retail,active,Missing,Name,missing@example.test,09170000002,Main Street,NCR,,Manila,Ermita,1000
CSV;

        $file = UploadedFile::fake()->createWithContent('customers.csv', $csv);

        $this->actingAs($user)
            ->post(route('customers.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('customers', ['firstname' => 'Ada']);
    }

    public function test_export_returns_expected_csv_shape(): void
    {
        $user = User::factory()->create();
        $this->createCustomer([], ['email' => 'ada@example.test', 'phone' => '09170000001']);

        $response = $this->actingAs($user)->get(route('customers.export'));

        $response->assertOk();
        $response->assertDownload('customers.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('customer_kind,firstname,lastname,organization_name', $content);
        $this->assertStringContainsString('person,Ada,Lovelace', $content);
        $this->assertStringContainsString('ada@example.test,09170000001', $content);
    }

    private function createCustomer(array $attributes = [], array $contact = []): Customer
    {
        $customer = Customer::create([
            'customer_code' => $attributes['customer_code'] ?? null,
            'customer_kind' => $attributes['customer_kind'] ?? Customer::KIND_PERSON,
            'firstname' => array_key_exists('firstname', $attributes) ? $attributes['firstname'] : 'Ada',
            'lastname' => array_key_exists('lastname', $attributes) ? $attributes['lastname'] : 'Lovelace',
            'organization_name' => $attributes['organization_name'] ?? null,
            'legal_name' => $attributes['legal_name'] ?? null,
            'tax_id' => $attributes['tax_id'] ?? null,
            'customer_group_id' => $attributes['customer_group_id'] ?? CustomerGroup::where('name', 'Walk-in')->value('id'),
            'customer_type_id' => $attributes['customer_type_id'] ?? CustomerType::where('name', 'retail')->value('id'),
            'status' => $attributes['status'] ?? 'active',
        ]);

        $customer->contacts()->create([
            'contact_type' => 'primary',
            'firstname' => $contact['firstname'] ?? $customer->firstname,
            'lastname' => $contact['lastname'] ?? $customer->lastname,
            'email' => $contact['email'] ?? 'ada@example.test',
            'phone' => $contact['phone'] ?? '09170000001',
            'is_primary' => true,
        ]);

        $customer->addresses()->create([
            'address_type' => 'primary',
            'is_primary' => true,
            'country' => 'PH',
            'region' => 'NCR',
            'city_municipality' => 'Manila',
            'barangay' => 'Ermita',
            'street' => 'Main Street',
        ]);

        return $customer;
    }

    private function payload(array $overrides = []): array
    {
        return [
            'customer_kind' => Customer::KIND_PERSON,
            'firstname' => 'Ada',
            'lastname' => 'Lovelace',
            'organization_name' => '',
            'legal_name' => '',
            'tax_id' => '',
            'date_of_birth' => '',
            'customer_group_id' => CustomerGroup::where('name', 'Walk-in')->value('id'),
            'customer_type_id' => CustomerType::where('name', 'retail')->value('id'),
            'status' => 'active',
            'contact_firstname' => 'Ada',
            'contact_lastname' => 'Lovelace',
            'email' => 'ada@example.test',
            'phone' => '09170000001',
            'street' => 'Main Street',
            'region' => 'NCR',
            'province' => '',
            'city_municipality' => 'Manila',
            'barangay' => 'Ermita',
            'postal_code' => '1000',
            ...$overrides,
        ];
    }
}
