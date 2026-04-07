<?php

namespace Tests\Feature;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SuppliersTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_suppliers_page(): void
    {
        $this->get('/suppliers')->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_suppliers_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('suppliers.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Suppliers')
                ->has('suppliers.data')
                ->where('filters.search', '')
                ->where('filters.sort', 'supplier_code')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_suppliers_index_is_paginated_to_ten_records(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 12) as $index) {
            Supplier::create([
                'supplier_code' => sprintf('S%03d', $index),
                'legal_business_name' => sprintf('Supplier %02d Inc', $index),
                'status' => 'Active',
            ])->contact()->create();
        }

        $this->actingAs($user)
            ->get(route('suppliers.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('suppliers.data', 10)
                ->where('suppliers.total', 12)
                ->where('suppliers.per_page', 10)
                ->where('suppliers.current_page', 1)
            );
    }

    public function test_suppliers_index_searches_supplier_and_contact_fields(): void
    {
        $user = User::factory()->create();
        Supplier::create([
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Corporation',
            'trade_name' => 'Acme',
            'status' => 'Active',
        ])->contact()->create(['email' => 'orders@acme.test', 'mobile' => '09170000001']);
        Supplier::create([
            'supplier_code' => 'S002',
            'legal_business_name' => 'Northwind Traders',
            'trade_name' => 'Northwind',
            'address' => 'Quezon City',
            'status' => 'Active',
        ])->contact()->create(['email' => 'hello@northwind.test', 'mobile' => '09170000002']);

        $this->actingAs($user)
            ->get(route('suppliers.index', ['search' => 'northwind']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('suppliers.data', 1)
                ->where('suppliers.data.0.legal_business_name', 'Northwind Traders')
                ->where('filters.search', 'northwind')
            );

        $this->actingAs($user)
            ->get(route('suppliers.index', ['search' => 'orders@acme.test']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('suppliers.data', 1)
                ->where('suppliers.data.0.legal_business_name', 'Acme Corporation')
            );
    }

    public function test_suppliers_index_sorts_by_visible_core_fields(): void
    {
        $user = User::factory()->create();
        Supplier::create([
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Corporation',
            'trade_name' => 'Acme',
            'status' => 'Archived',
        ])->contact()->create();
        Supplier::create([
            'supplier_code' => 'S002',
            'legal_business_name' => 'Northwind Traders',
            'trade_name' => 'Northwind',
            'status' => 'Active',
        ])->contact()->create();

        $this->actingAs($user)
            ->get(route('suppliers.index', ['sort' => 'legal_business_name', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('suppliers.data.0.legal_business_name', 'Northwind Traders')
                ->where('filters.sort', 'legal_business_name')
                ->where('filters.direction', 'desc')
            );

        $this->actingAs($user)
            ->get(route('suppliers.index', ['sort' => 'status', 'direction' => 'asc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('suppliers.data.0.status', 'Active')
                ->where('filters.sort', 'status')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_user_can_create_supplier_with_contact(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('suppliers.store'), [
                'legal_business_name' => 'Acme Corporation',
                'trade_name' => 'Acme',
                'address' => 'Makati City',
                'status' => 'Active',
                'email' => 'orders@acme.test',
                'mobile' => '09170000001',
            ])
            ->assertRedirect(route('suppliers.index', absolute: false));

        $supplier = Supplier::where('legal_business_name', 'Acme Corporation')->firstOrFail();

        $this->assertSame('S001', $supplier->supplier_code);
        $this->assertDatabaseHas('supplier_contacts', [
            'supplier_id' => $supplier->id,
            'email' => 'orders@acme.test',
            'mobile' => '09170000001',
        ]);
    }

    public function test_user_can_update_supplier_and_contact(): void
    {
        $user = User::factory()->create();
        $supplier = Supplier::create([
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Corporation',
            'trade_name' => 'Acme',
            'status' => 'Active',
        ]);
        $supplier->contact()->create(['email' => 'old@acme.test', 'mobile' => '09170000001']);

        $this->actingAs($user)
            ->put(route('suppliers.update', $supplier), [
                'legal_business_name' => 'Acme Incorporated',
                'trade_name' => 'Acme',
                'address' => 'Pasig City',
                'status' => 'On-Hold',
                'email' => 'new@acme.test',
                'mobile' => '09170000002',
            ])
            ->assertRedirect(route('suppliers.index', absolute: false));

        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Incorporated',
            'status' => 'On-Hold',
        ]);
        $this->assertDatabaseHas('supplier_contacts', [
            'supplier_id' => $supplier->id,
            'email' => 'new@acme.test',
            'mobile' => '09170000002',
        ]);
    }

    public function test_deleting_supplier_cascades_to_contact(): void
    {
        $user = User::factory()->create();
        $supplier = Supplier::create([
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Corporation',
            'status' => 'Active',
        ]);
        $contact = $supplier->contact()->create(['email' => 'orders@acme.test']);

        $this->actingAs($user)
            ->delete(route('suppliers.destroy', $supplier))
            ->assertRedirect(route('suppliers.index', absolute: false));

        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
        $this->assertDatabaseMissing('supplier_contacts', ['id' => $contact->id]);
    }

    public function test_import_creates_suppliers_from_csv(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
Legal Business Name,Trade Name, Address, Email, Mobile
Acme Corporation,Acme, Makati City, orders@acme.test, 09170000001
Northwind Traders,Northwind, Quezon City, hello@northwind.test, 09170000002
CSV;

        $file = UploadedFile::fake()->createWithContent('suppliers.csv', $csv);

        $this->actingAs($user)
            ->post(route('suppliers.import'), ['file' => $file])
            ->assertRedirect(route('suppliers.index', absolute: false))
            ->assertSessionHas('success');

        $acme = Supplier::where('legal_business_name', 'Acme Corporation')->firstOrFail();
        $northwind = Supplier::where('legal_business_name', 'Northwind Traders')->firstOrFail();

        $this->assertSame('S001', $acme->supplier_code);
        $this->assertSame('S002', $northwind->supplier_code);
        $this->assertDatabaseHas('supplier_contacts', [
            'supplier_id' => $acme->id,
            'email' => 'orders@acme.test',
            'mobile' => '09170000001',
        ]);
    }

    public function test_import_skips_existing_suppliers_and_duplicate_csv_rows(): void
    {
        $user = User::factory()->create();
        Supplier::create([
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Corporation',
            'status' => 'Active',
        ])->contact()->create();
        $csv = <<<CSV
Legal Business Name,Trade Name, Address, Email, Mobile
acme corporation,Acme, Makati City, orders@acme.test, 09170000001
Acme Corporation,Acme, Makati City, orders@acme.test, 09170000001
Northwind Traders,Northwind, Quezon City, hello@northwind.test, 09170000002
CSV;

        $file = UploadedFile::fake()->createWithContent('suppliers.csv', $csv);

        $this->actingAs($user)
            ->post(route('suppliers.import'), ['file' => $file])
            ->assertRedirect(route('suppliers.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertSame(1, Supplier::where('legal_business_name', 'Acme Corporation')->count());
        $this->assertDatabaseHas('suppliers', [
            'supplier_code' => 'S002',
            'legal_business_name' => 'Northwind Traders',
        ]);
    }

    public function test_import_rejects_invalid_rows_without_partial_inserts(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
Legal Business Name,Trade Name, Address, Email, Mobile
Acme Corporation,Acme, Makati City, orders@acme.test, 09170000001
,No Legal Name, Pasig City, missing@example.test, 09170000003
CSV;

        $file = UploadedFile::fake()->createWithContent('suppliers.csv', $csv);

        $this->actingAs($user)
            ->post(route('suppliers.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('suppliers', ['legal_business_name' => 'Acme Corporation']);
        $this->assertDatabaseMissing('suppliers', ['trade_name' => 'No Legal Name']);
    }

    public function test_import_requires_expected_csv_headers(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
Name,Email
Acme Corporation,orders@acme.test
CSV;

        $file = UploadedFile::fake()->createWithContent('suppliers.csv', $csv);

        $this->actingAs($user)
            ->post(route('suppliers.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('suppliers', ['legal_business_name' => 'Acme Corporation']);
    }

    public function test_export_returns_expected_csv_shape(): void
    {
        $user = User::factory()->create();
        Supplier::create([
            'supplier_code' => 'S001',
            'legal_business_name' => 'Acme Corporation',
            'trade_name' => 'Acme',
            'address' => 'Makati City',
            'status' => 'Active',
        ])->contact()->create(['email' => 'orders@acme.test', 'mobile' => '09170000001']);

        $response = $this->actingAs($user)->get(route('suppliers.export'));

        $response->assertOk();
        $response->assertDownload('suppliers.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('"Legal Business Name","Trade Name",Address,Email,Mobile', $content);
        $this->assertStringContainsString('"Acme Corporation",Acme,"Makati City",orders@acme.test,09170000001', $content);
    }
}
