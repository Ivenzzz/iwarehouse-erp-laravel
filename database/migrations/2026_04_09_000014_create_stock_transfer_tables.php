<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_number', 30)->unique();
            $table->foreignId('source_warehouse_id')
                ->constrained('warehouses', indexName: 'idx_stock_transfers_source')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('destination_warehouse_id')
                ->constrained('warehouses', indexName: 'idx_stock_transfers_destination')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('created_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_stock_transfers_created_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->string('status', 40)->default('draft');
            $table->string('operation_type', 40)->default('internal_transfer');
            $table->string('priority', 20)->default('normal');
            $table->string('reference', 150)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'idx_stock_transfers_status_created');
            $table->index(['source_warehouse_id', 'destination_warehouse_id'], 'idx_stock_transfers_route');
        });

        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')
                ->constrained('stock_transfers', indexName: 'idx_stock_transfer_items_transfer')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('inventory_item_id')
                ->constrained('inventory_items', indexName: 'idx_stock_transfer_items_inventory')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->boolean('is_picked')->default(false);
            $table->boolean('is_shipped')->default(false);
            $table->boolean('is_received')->default(false);
            $table->timestamps();

            $table->index(['stock_transfer_id', 'inventory_item_id'], 'idx_stock_transfer_items_transfer_inventory');
            $table->index(['inventory_item_id'], 'idx_stock_transfer_items_inventory_only');
        });

        Schema::create('stock_transfer_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')
                ->constrained('stock_transfers', indexName: 'idx_stock_transfer_milestones_transfer')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('actor_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_stock_transfer_milestones_actor')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->string('milestone_type', 40);
            $table->timestamp('occurred_at');
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['stock_transfer_id', 'milestone_type'], 'uq_stock_transfer_milestones_type');
        });

        Schema::create('stock_transfer_shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')
                ->unique('uq_stock_transfer_shipments_transfer')
                ->constrained('stock_transfers', indexName: 'idx_stock_transfer_shipments_transfer')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('driver_name', 150)->nullable();
            $table->string('driver_contact', 50)->nullable();
            $table->string('courier_name', 150)->nullable();
            $table->string('proof_of_dispatch_path', 255)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_transfer_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')
                ->constrained('stock_transfers', indexName: 'idx_stock_transfer_receipts_transfer')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('received_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_stock_transfer_receipts_actor')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->text('branch_remarks')->nullable();
            $table->text('discrepancy_reason')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_transfer_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_receipt_id')
                ->constrained('stock_transfer_receipts', indexName: 'idx_stock_transfer_receipt_items_receipt')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('stock_transfer_item_id')
                ->nullable()
                ->constrained('stock_transfer_items', indexName: 'idx_stock_transfer_receipt_items_transfer_item')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('inventory_item_id')
                ->nullable()
                ->constrained('inventory_items', indexName: 'idx_stock_transfer_receipt_items_inventory')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->string('receipt_item_type', 30);
            $table->string('product_name', 255)->nullable();
            $table->string('variant_name', 255)->nullable();
            $table->string('imei1', 50)->nullable();
            $table->string('imei2', 50)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('scanned_barcode', 100)->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_transfer_receipt_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_receipt_id')
                ->constrained('stock_transfer_receipts', indexName: 'idx_stock_transfer_receipt_photos_receipt')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('image_path', 255);
            $table->timestamp('captured_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_transfer_consolidations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('master_stock_transfer_id')
                ->unique('uq_stock_transfer_consolidations_master')
                ->constrained('stock_transfers', indexName: 'idx_stock_transfer_consolidations_master')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('consolidated_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_stock_transfer_consolidations_actor')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('consolidated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_transfer_consolidation_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_consolidation_id')
                ->constrained('stock_transfer_consolidations', indexName: 'idx_stock_transfer_consolidation_sources_consolidation')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('source_stock_transfer_id')
                ->unique('uq_stock_transfer_consolidation_sources_transfer')
                ->constrained('stock_transfers', indexName: 'idx_stock_transfer_consolidation_sources_transfer')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_consolidation_sources');
        Schema::dropIfExists('stock_transfer_consolidations');
        Schema::dropIfExists('stock_transfer_receipt_photos');
        Schema::dropIfExists('stock_transfer_receipt_items');
        Schema::dropIfExists('stock_transfer_receipts');
        Schema::dropIfExists('stock_transfer_shipments');
        Schema::dropIfExists('stock_transfer_milestones');
        Schema::dropIfExists('stock_transfer_items');
        Schema::dropIfExists('stock_transfers');
    }
};
