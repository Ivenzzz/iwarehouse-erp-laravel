<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $purposes = [
            'Replenishment',
            'Display Refill',
            'Fast-Moving Refill',
            'Customer Reservation',
            'Pre-Event Stock',
            'New Store Opening',
            'Other',
        ];

        $statuses = [
            'pending',
            'declined',
            'rfq_created',
            'stock_transfer_created',
            'split_operation_created',
        ];

        Schema::create('stock_requests', function (Blueprint $table) use ($purposes, $statuses) {
            $table->id();
            $table->string('request_number', 30)->unique();
            $table->foreignId('warehouse_id')
                ->constrained('warehouses', indexName: 'idx_stock_requests_warehouse')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('requestor_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_stock_requests_requestor')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('required_at');
            $table->enum('purpose', $purposes)->default('Replenishment');
            $table->enum('status', $statuses)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'idx_stock_requests_status_created');
            $table->index(['warehouse_id', 'status'], 'idx_stock_requests_warehouse_status');
        });

        Schema::create('stock_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_request_id')
                ->constrained('stock_requests', indexName: 'idx_stock_request_items_request')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('variant_id')
                ->constrained('product_variants', indexName: 'idx_stock_request_items_variant')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->unsignedInteger('quantity');
            $table->string('reason', 255)->nullable();
            $table->timestamps();

            $table->index(['stock_request_id', 'variant_id'], 'idx_stock_request_items_request_variant');
            $table->index('variant_id', 'idx_stock_request_items_variant_only');
        });

        Schema::create('stock_request_status_histories', function (Blueprint $table) use ($statuses) {
            $table->id();
            $table->foreignId('stock_request_id')
                ->constrained('stock_requests', indexName: 'idx_stock_request_status_histories_request')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->enum('status', $statuses);
            $table->foreignId('actor_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_stock_request_status_histories_actor')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('occurred_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['stock_request_id', 'occurred_at'], 'idx_stock_request_histories_request_occurred');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_request_status_histories');
        Schema::dropIfExists('stock_request_items');
        Schema::dropIfExists('stock_requests');
    }
};
