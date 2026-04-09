<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->timestamps();

            $table->unique('name', 'uq_customer_groups_name');
        });

        Schema::create('customer_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->timestamps();

            $table->unique('name', 'uq_customer_types_name');
        });

        $timestamp = now();

        DB::table('customer_groups')->insert([
            ['id' => 1, 'name' => 'Walk-in', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 2, 'name' => 'Corporate', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 3, 'name' => 'Government', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 4, 'name' => 'Employee', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 5, 'name' => 'Wholesale', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 6, 'name' => 'Online', 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ]);

        DB::table('customer_types')->insert([
            ['id' => 1, 'name' => 'retail', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 2, 'name' => 'wholesale', 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ]);

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('customer_code', 20)->unique('uq_customers_customer_code');
            $table->string('customer_kind', 20)->default('person');
            $table->string('firstname', 100)->nullable();
            $table->string('lastname', 100)->nullable();
            $table->string('organization_name', 150)->nullable();
            $table->string('legal_name', 150)->nullable();
            $table->string('tax_id', 100)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->foreignId('customer_group_id')
                ->default(1)
                ->constrained('customer_groups', indexName: 'idx_customers_group')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('customer_type_id')
                ->default(1)
                ->constrained('customer_types', indexName: 'idx_customers_type')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('status', 30)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['customer_kind', 'status'], 'idx_customers_kind_status');
            $table->index('organization_name', 'idx_customers_organization_name');
            $table->index(['lastname', 'firstname'], 'idx_customers_person_name');
        });

        Schema::create('customer_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')
                ->constrained('customers', indexName: 'idx_customer_contacts_customer')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('contact_type', 50);
            $table->string('firstname', 100)->nullable();
            $table->string('lastname', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique('email', 'uq_customer_contacts_email');
            $table->index(['customer_id', 'is_primary'], 'idx_customer_contacts_primary');
        });

        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')
                ->constrained('customers', indexName: 'idx_customer_addresses_customer')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('address_type', 50);
            $table->boolean('is_primary')->default(false);
            $table->string('country', 10)->default('PH');
            $table->string('region', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('city_municipality', 100)->nullable();
            $table->string('barangay', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('street', 200)->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'is_primary'], 'idx_customer_addresses_primary');
            $table->index(['country', 'province', 'city_municipality'], 'idx_customer_addresses_location');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
        Schema::dropIfExists('customer_contacts');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('customer_types');
        Schema::dropIfExists('customer_groups');
    }
};
