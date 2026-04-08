<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('warehouse_type', 30)->default('store');
            $table->string('phone_number', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('street', 200)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('zip_code', 20)->nullable();
            $table->string('country', 10)->default('PH');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique('name', 'uq_warehouses_name');
            $table->index(['warehouse_type', 'sort_order'], 'idx_warehouses_type_sort');
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')
                ->constrained('product_variants', indexName: 'idx_inventory_items_variant')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('warehouse_id')
                ->constrained('warehouses', indexName: 'idx_inventory_items_warehouse')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('supplier_id')
                ->nullable()
                ->constrained('suppliers', indexName: 'idx_inventory_items_supplier')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->string('imei', 50)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('status', 30)->default('active');
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->decimal('cash_price', 12, 2)->nullable();
            $table->decimal('srp_price', 12, 2)->nullable();
            $table->string('package', 150)->nullable();
            $table->string('warranty', 150)->nullable();
            $table->string('cpu', 150)->nullable();
            $table->string('gpu', 150)->nullable();
            $table->string('submodel', 150)->nullable();
            $table->string('ram_type', 100)->nullable();
            $table->string('rom_type', 100)->nullable();
            $table->string('ram_slots', 100)->nullable();
            $table->string('product_type', 100)->nullable();
            $table->string('country_model', 100)->nullable();
            $table->boolean('with_charger')->default(false);
            $table->string('resolution', 100)->nullable();
            $table->timestamps();

            $table->unique('imei', 'uq_inventory_items_imei');
            $table->unique('serial_number', 'uq_inventory_items_serial_number');
            $table->index(['warehouse_id', 'status'], 'idx_inventory_items_warehouse_status');
        });

        Schema::create('inventory_item_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')
                ->constrained('inventory_items', indexName: 'idx_inventory_item_logs_item')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('actor_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_inventory_item_logs_actor')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('logged_at');
            $table->string('action', 50);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['inventory_item_id', 'logged_at'], 'idx_inventory_item_logs_item_logged_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_item_logs');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('warehouses');
    }
};
