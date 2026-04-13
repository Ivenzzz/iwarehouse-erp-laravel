<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $approvalActions = [
            'declined',
            'rfq_created',
            'stock_transfer_created',
            'split_operation_created',
        ];

        $referenceTypes = [
            'rfq',
            'stock_transfer',
            'split_operation',
        ];

        Schema::create('stock_request_approvals', function (Blueprint $table) use ($approvalActions) {
            $table->id();
            $table->foreignId('stock_request_id')
                ->unique('uq_stock_request_approvals_request')
                ->constrained('stock_requests', indexName: 'idx_stock_request_approvals_request')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('status_history_id')
                ->unique('uq_stock_request_approvals_history')
                ->constrained('stock_request_status_histories', indexName: 'idx_stock_request_approvals_history')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('approver_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_stock_request_approvals_approver')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('approval_date');
            $table->enum('action', $approvalActions);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('action', 'idx_stock_request_approvals_action');
            $table->index('approval_date', 'idx_stock_request_approvals_approval_date');
            $table->index(['approver_id', 'approval_date'], 'idx_stock_request_approvals_approver_date');
        });

        Schema::create('stock_request_approval_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_request_approval_id')
                ->constrained('stock_request_approvals', indexName: 'idx_stock_request_approval_items_approval')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('stock_request_item_id')
                ->constrained('stock_request_items', indexName: 'idx_stock_request_approval_items_request_item')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->unsignedInteger('approved_quantity');
            $table->timestamps();

            $table->unique(['stock_request_approval_id', 'stock_request_item_id'], 'uq_stock_request_approval_items_lookup');
        });

        Schema::create('stock_request_approval_references', function (Blueprint $table) use ($referenceTypes) {
            $table->id();
            $table->foreignId('stock_request_approval_id')
                ->constrained('stock_request_approvals', indexName: 'idx_stock_request_approval_references_approval')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->enum('reference_type', $referenceTypes);
            $table->string('reference_number', 120);
            $table->timestamps();

            $table->unique(['stock_request_approval_id', 'reference_type'], 'uq_stock_request_approval_references_type');
            $table->unique('reference_number', 'uq_stock_request_approval_references_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_request_approval_references');
        Schema::dropIfExists('stock_request_approval_items');
        Schema::dropIfExists('stock_request_approvals');
    }
};
