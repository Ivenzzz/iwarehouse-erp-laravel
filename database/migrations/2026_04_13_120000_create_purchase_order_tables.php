<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $statuses = [
            'pending',
            'approved',
            'rejected',
        ];

        $approvalActions = [
            'approved',
            'rejected',
        ];

        Schema::create('payment_terms', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique('uq_payment_terms_name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('shipping_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique('uq_shipping_methods_name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('purchase_orders', function (Blueprint $table) use ($statuses) {
            $table->id();
            $table->string('po_number', 30)->unique('uq_purchase_orders_number');
            $table->foreignId('rfq_id')
                ->constrained('request_for_quotations', indexName: 'idx_purchase_orders_rfq')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('supplier_id')
                ->constrained('suppliers', indexName: 'idx_purchase_orders_supplier')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('selected_supplier_quote_id')
                ->unique('uq_purchase_orders_selected_supplier_quote')
                ->constrained('request_for_quotation_supplier_quotes', indexName: 'idx_purchase_orders_selected_supplier_quote')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('shipping_method_id')
                ->constrained('shipping_methods', indexName: 'idx_purchase_orders_shipping_method')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('payment_term_id')
                ->constrained('payment_terms', indexName: 'idx_purchase_orders_payment_term')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->date('expected_delivery_date')->nullable();
            $table->enum('status', $statuses)->default('pending');
            $table->boolean('has_delivery_receipt')->default(false);
            $table->timestamps();

            $table->index('status', 'idx_purchase_orders_status');
            $table->index('supplier_id', 'idx_purchase_orders_supplier_only');
            $table->index('rfq_id', 'idx_purchase_orders_rfq_only');
            $table->index('expected_delivery_date', 'idx_purchase_orders_expected_delivery_date');
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')
                ->constrained('purchase_orders', indexName: 'idx_purchase_order_items_purchase_order')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('supplier_quote_item_id')
                ->constrained('request_for_quotation_supplier_quote_items', indexName: 'idx_purchase_order_items_supplier_quote_item')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('discount', 12, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['purchase_order_id', 'supplier_quote_item_id'], 'uq_purchase_order_items_po_supplier_quote_item');
        });

        Schema::create('purchase_order_item_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_item_id')
                ->unique('uq_purchase_order_item_specs_purchase_order_item')
                ->constrained('purchase_order_items', indexName: 'idx_purchase_order_item_specs_purchase_order_item')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('ram', 50)->nullable();
            $table->string('rom', 50)->nullable();
            $table->string('condition', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_order_status_histories', function (Blueprint $table) use ($statuses) {
            $table->id();
            $table->foreignId('purchase_order_id')
                ->constrained('purchase_orders', indexName: 'idx_purchase_order_status_histories_purchase_order')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->enum('status', $statuses);
            $table->foreignId('changed_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_purchase_order_status_histories_changed_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('occurred_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['purchase_order_id', 'occurred_at'], 'idx_purchase_order_status_histories_po_occurred');
        });

        Schema::create('purchase_order_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')
                ->unique('uq_purchase_order_approvals_purchase_order')
                ->constrained('purchase_orders', indexName: 'idx_purchase_order_approvals_purchase_order')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('approver_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_purchase_order_approvals_approver')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['approver_id', 'approved_at'], 'idx_purchase_order_approvals_approver_approved_at');
        });

        Schema::create('purchase_order_approval_histories', function (Blueprint $table) use ($approvalActions) {
            $table->id();
            $table->foreignId('purchase_order_id')
                ->constrained('purchase_orders', indexName: 'idx_purchase_order_approval_histories_purchase_order')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->enum('action', $approvalActions);
            $table->foreignId('approver_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_purchase_order_approval_histories_approver')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('occurred_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['purchase_order_id', 'occurred_at'], 'idx_purchase_order_approval_histories_po_occurred');
        });

        Schema::create('purchase_order_payables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')
                ->unique('uq_purchase_order_payables_purchase_order')
                ->constrained('purchase_orders', indexName: 'idx_purchase_order_payables_purchase_order')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->boolean('has_paid')->default(false);
            $table->foreignId('paid_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_purchase_order_payables_paid_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('has_paid', 'idx_purchase_order_payables_has_paid');
        });

        Schema::create('purchase_order_payable_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_payable_id')
                ->constrained('purchase_order_payables', indexName: 'idx_purchase_order_payable_documents_payable')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('document_url', 500);
            $table->string('document_name', 255);
            $table->timestamps();

            $table->index('purchase_order_payable_id', 'idx_purchase_order_payable_documents_payable_only');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_payable_documents');
        Schema::dropIfExists('purchase_order_payables');
        Schema::dropIfExists('purchase_order_approval_histories');
        Schema::dropIfExists('purchase_order_approvals');
        Schema::dropIfExists('purchase_order_status_histories');
        Schema::dropIfExists('purchase_order_item_specs');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('shipping_methods');
        Schema::dropIfExists('payment_terms');
    }
};
