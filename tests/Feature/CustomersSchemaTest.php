<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CustomersSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('customer_groups'));
        $this->assertTrue(Schema::hasTable('customer_types'));
        $this->assertTrue(Schema::hasTable('customers'));
        $this->assertTrue(Schema::hasTable('customer_contacts'));
        $this->assertTrue(Schema::hasTable('customer_addresses'));
    }

    public function test_lookup_seed_rows_exist(): void
    {
        $this->assertDatabaseHas('customer_groups', ['id' => 1, 'name' => 'Walk-in']);
        $this->assertDatabaseHas('customer_groups', ['id' => 2, 'name' => 'Corporate']);
        $this->assertDatabaseHas('customer_groups', ['id' => 3, 'name' => 'Government']);
        $this->assertDatabaseHas('customer_groups', ['id' => 4, 'name' => 'Employee']);
        $this->assertDatabaseHas('customer_groups', ['id' => 5, 'name' => 'Wholesale']);
        $this->assertDatabaseHas('customer_groups', ['id' => 6, 'name' => 'Online']);
        $this->assertDatabaseHas('customer_types', ['id' => 1, 'name' => 'retail']);
        $this->assertDatabaseHas('customer_types', ['id' => 2, 'name' => 'wholesale']);
    }

    public function test_person_customer_uses_default_group_and_type(): void
    {
        $customer = Customer::create([
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
        ]);

        $customer->load(['group', 'type']);

        $this->assertSame('C001', $customer->customer_code);
        $this->assertSame(Customer::KIND_PERSON, $customer->customer_kind);
        $this->assertSame('Walk-in', $customer->group->name);
        $this->assertSame('retail', $customer->type->name);
        $this->assertSame(Customer::STATUS_ACTIVE, $customer->status);
    }

    public function test_organization_customer_can_be_created_with_optional_business_fields(): void
    {
        $customer = Customer::create([
            'customer_kind' => Customer::KIND_ORGANIZATION,
            'organization_name' => 'Acme Corporation',
            'legal_name' => 'Acme Corporation, Inc.',
            'tax_id' => 'TIN-12345',
        ]);

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'organization_name' => 'Acme Corporation',
            'legal_name' => 'Acme Corporation, Inc.',
            'tax_id' => 'TIN-12345',
            'customer_kind' => Customer::KIND_ORGANIZATION,
        ]);
    }

    public function test_contacts_and_addresses_can_be_attached_to_customer(): void
    {
        $customer = Customer::create([
            'customer_kind' => Customer::KIND_ORGANIZATION,
            'organization_name' => 'Northwind Traders',
        ]);

        $contact = $customer->contacts()->create([
            'contact_type' => 'primary_contact',
            'firstname' => 'Ana',
            'lastname' => 'Santos',
            'email' => 'ana@northwind.test',
            'phone' => '09170000001',
            'is_primary' => true,
        ]);

        $address = $customer->addresses()->create([
            'address_type' => 'billing',
            'is_primary' => true,
            'country' => 'PH',
            'region' => 'NCR',
            'province' => 'Metro Manila',
            'city_municipality' => 'Quezon City',
            'barangay' => 'Bagumbayan',
            'postal_code' => '1110',
            'street' => '123 Katipunan Avenue',
        ]);

        $this->assertTrue($contact->is_primary);
        $this->assertTrue($address->is_primary);
        $this->assertDatabaseHas('customer_contacts', [
            'id' => $contact->id,
            'customer_id' => $customer->id,
            'contact_type' => 'primary_contact',
            'email' => 'ana@northwind.test',
        ]);
        $this->assertDatabaseHas('customer_addresses', [
            'id' => $address->id,
            'customer_id' => $customer->id,
            'address_type' => 'billing',
            'city_municipality' => 'Quezon City',
        ]);
    }

    public function test_duplicate_contact_email_is_rejected_but_duplicate_phone_is_allowed(): void
    {
        $firstCustomer = Customer::create([
            'firstname' => 'Maria',
            'lastname' => 'Santos',
        ]);
        $secondCustomer = Customer::create([
            'firstname' => 'Jose',
            'lastname' => 'Reyes',
        ]);

        $firstCustomer->contacts()->create([
            'contact_type' => 'personal',
            'email' => 'shared@example.test',
            'phone' => '09170000001',
        ]);

        $secondCustomer->contacts()->create([
            'contact_type' => 'personal',
            'email' => null,
            'phone' => '09170000001',
        ]);

        $this->assertDatabaseHas('customer_contacts', [
            'customer_id' => $secondCustomer->id,
            'phone' => '09170000001',
            'email' => null,
        ]);

        $this->expectException(QueryException::class);

        $secondCustomer->contacts()->create([
            'contact_type' => 'personal',
            'email' => 'shared@example.test',
            'phone' => '09170000002',
        ]);
    }

    public function test_group_and_type_in_use_cannot_be_deleted(): void
    {
        $customer = Customer::create([
            'firstname' => 'Lito',
            'lastname' => 'Garcia',
        ]);

        $group = CustomerGroup::findOrFail($customer->customer_group_id);
        $type = CustomerType::findOrFail($customer->customer_type_id);

        $this->assertFalse($this->canDelete(fn () => $group->delete()));
        $this->assertFalse($this->canDelete(fn () => $type->delete()));
    }

    public function test_soft_deleting_customer_keeps_related_rows_intact(): void
    {
        $customer = Customer::create([
            'firstname' => 'Paolo',
            'lastname' => 'Rivera',
        ]);
        $contact = $customer->contacts()->create([
            'contact_type' => 'personal',
            'email' => 'paolo@example.test',
        ]);
        $address = $customer->addresses()->create([
            'address_type' => 'home',
            'street' => '456 Rizal Street',
        ]);

        $customer->delete();

        $this->assertSoftDeleted('customers', ['id' => $customer->id]);
        $this->assertDatabaseHas('customer_contacts', ['id' => $contact->id]);
        $this->assertDatabaseHas('customer_addresses', ['id' => $address->id]);
    }

    private function canDelete(callable $callback): bool
    {
        try {
            DB::transaction(function () use ($callback) {
                $callback();

                throw new \RuntimeException('rollback');
            });
        } catch (QueryException) {
            return false;
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() === 'rollback') {
                return true;
            }

            throw $exception;
        }

        return true;
    }
}
