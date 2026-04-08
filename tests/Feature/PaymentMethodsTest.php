<?php

namespace Tests\Feature;

use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PaymentMethodsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_payment_methods_page(): void
    {
        $this->get('/payment-methods')->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_payment_methods_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('payment-methods.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PaymentMethods')
                ->has('paymentMethods.data')
                ->has('paymentMethodTypes')
                ->where('filters.search', '')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_payment_methods_index_is_paginated_to_ten_records(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 12) as $index) {
            PaymentMethod::create([
                'name' => sprintf('Payment Method %02d', $index),
                'type' => 'cash',
            ]);
        }

        $this->actingAs($user)
            ->get(route('payment-methods.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods.data', 10)
                ->where('paymentMethods.total', 12)
                ->where('paymentMethods.per_page', 10)
                ->where('paymentMethods.current_page', 1)
            );
    }

    public function test_payment_methods_index_searches_name_type_and_logo(): void
    {
        $user = User::factory()->create();
        PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);
        PaymentMethod::create([
            'name' => 'GCash',
            'type' => 'ewallet',
            'logo' => '/logos/gcash.svg',
        ]);

        $this->actingAs($user)
            ->get(route('payment-methods.index', ['search' => 'ewallet']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods.data', 1)
                ->where('paymentMethods.data.0.name', 'GCash')
                ->where('filters.search', 'ewallet')
            );

        $this->actingAs($user)
            ->get(route('payment-methods.index', ['search' => 'gcash.svg']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods.data', 1)
                ->where('paymentMethods.data.0.type', 'ewallet')
            );
    }

    public function test_payment_methods_index_sorts_by_name_and_type(): void
    {
        $user = User::factory()->create();
        PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        PaymentMethod::create(['name' => 'Bank Transfer', 'type' => 'bank_transfer']);

        $this->actingAs($user)
            ->get(route('payment-methods.index', ['sort' => 'name', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('paymentMethods.data.0.name', 'Cash')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'desc')
            );

        $this->actingAs($user)
            ->get(route('payment-methods.index', ['sort' => 'type', 'direction' => 'asc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('paymentMethods.data.0.type', 'bank_transfer')
                ->where('filters.sort', 'type')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_user_can_create_payment_method(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('payment-methods.store'), [
                'name' => 'GCash',
                'type' => 'ewallet',
                'logo' => '/logos/gcash.svg',
            ])
            ->assertRedirect(route('payment-methods.index', absolute: false));

        $this->assertDatabaseHas('payment_methods', [
            'name' => 'GCash',
            'type' => 'ewallet',
            'logo' => '/logos/gcash.svg',
        ]);
    }

    public function test_user_can_update_payment_method(): void
    {
        $user = User::factory()->create();
        $paymentMethod = PaymentMethod::create([
            'name' => 'Credit Card',
            'type' => 'card',
        ]);

        $this->actingAs($user)
            ->put(route('payment-methods.update', $paymentMethod), [
                'name' => 'Debit Card',
                'type' => 'card',
                'logo' => '/logos/card.svg',
            ])
            ->assertRedirect(route('payment-methods.index', absolute: false));

        $this->assertDatabaseHas('payment_methods', [
            'id' => $paymentMethod->id,
            'name' => 'Debit Card',
            'type' => 'card',
            'logo' => '/logos/card.svg',
        ]);
    }

    public function test_user_can_delete_payment_method(): void
    {
        $user = User::factory()->create();
        $paymentMethod = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);

        $this->actingAs($user)
            ->delete(route('payment-methods.destroy', $paymentMethod))
            ->assertRedirect(route('payment-methods.index', absolute: false));

        $this->assertDatabaseMissing('payment_methods', ['id' => $paymentMethod->id]);
    }

    public function test_payment_method_validation_rejects_duplicate_name_missing_fields_and_invalid_type(): void
    {
        $user = User::factory()->create();
        PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);

        $this->actingAs($user)
            ->post(route('payment-methods.store'), [
                'name' => 'Cash',
                'type' => 'cash',
            ])
            ->assertSessionHasErrors('name');

        $this->actingAs($user)
            ->post(route('payment-methods.store'), [
                'name' => '',
                'type' => '',
            ])
            ->assertSessionHasErrors(['name', 'type']);

        $this->actingAs($user)
            ->post(route('payment-methods.store'), [
                'name' => 'Crypto',
                'type' => 'crypto',
            ])
            ->assertSessionHasErrors('type');
    }

    public function test_import_creates_payment_methods_from_csv(): void
    {
        $user = User::factory()->create();
        $csv = <<<'CSV'
name,type,logo
Cash,cash,
GCash,ewallet,/logos/gcash.svg
CSV;

        $file = UploadedFile::fake()->createWithContent('payment-methods.csv', $csv);

        $this->actingAs($user)
            ->post(route('payment-methods.import'), ['file' => $file])
            ->assertRedirect(route('payment-methods.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payment_methods', [
            'name' => 'Cash',
            'type' => 'cash',
            'logo' => null,
        ]);
        $this->assertDatabaseHas('payment_methods', [
            'name' => 'GCash',
            'type' => 'ewallet',
            'logo' => '/logos/gcash.svg',
        ]);
    }

    public function test_import_skips_existing_payment_methods_and_duplicate_csv_rows(): void
    {
        $user = User::factory()->create();
        PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $csv = <<<'CSV'
name,type,logo
cash,cash,
Cash,cash,
GCash,ewallet,/logos/gcash.svg
CSV;

        $file = UploadedFile::fake()->createWithContent('payment-methods.csv', $csv);

        $this->actingAs($user)
            ->post(route('payment-methods.import'), ['file' => $file])
            ->assertRedirect(route('payment-methods.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertSame(1, PaymentMethod::where('name', 'Cash')->count());
        $this->assertDatabaseHas('payment_methods', [
            'name' => 'GCash',
            'type' => 'ewallet',
        ]);
    }

    public function test_import_rejects_invalid_rows_without_partial_inserts(): void
    {
        $user = User::factory()->create();
        $csv = <<<'CSV'
name,type,logo
Cash,cash,
Crypto,crypto,/logos/crypto.svg
CSV;

        $file = UploadedFile::fake()->createWithContent('payment-methods.csv', $csv);

        $this->actingAs($user)
            ->post(route('payment-methods.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('payment_methods', ['name' => 'Cash']);
        $this->assertDatabaseMissing('payment_methods', ['name' => 'Crypto']);
    }

    public function test_import_requires_expected_csv_headers(): void
    {
        $user = User::factory()->create();
        $csv = <<<'CSV'
method,type
Cash,cash
CSV;

        $file = UploadedFile::fake()->createWithContent('payment-methods.csv', $csv);

        $this->actingAs($user)
            ->post(route('payment-methods.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('payment_methods', ['name' => 'Cash']);
    }

    public function test_export_returns_expected_csv_shape(): void
    {
        $user = User::factory()->create();
        PaymentMethod::create([
            'name' => 'GCash',
            'type' => 'ewallet',
            'logo' => '/logos/gcash.svg',
        ]);

        $response = $this->actingAs($user)->get(route('payment-methods.export'));

        $response->assertOk();
        $response->assertDownload('payment-methods.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('name,type,logo', $content);
        $this->assertStringContainsString('GCash,ewallet,/logos/gcash.svg', $content);
    }
}
