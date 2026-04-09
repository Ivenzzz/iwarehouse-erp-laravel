<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_number', 20);
            $table->string('or_number', 50);
            $table->foreignId('customer_id')
                ->constrained('customers', indexName: 'idx_sales_transactions_customer')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('pos_session_id')
                ->constrained('pos_sessions', indexName: 'idx_sales_transactions_pos_session')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('sales_representative_id')
                ->nullable()
                ->constrained('employees', indexName: 'idx_sales_transactions_sales_representative')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('mode_of_release', 50)->default('Item Claimed / Pick-up');
            $table->text('remarks')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();

            $table->unique('transaction_number', 'uq_sales_transactions_transaction_number');
            $table->unique('or_number', 'uq_sales_transactions_or_number');
            $table->index(['customer_id', 'created_at'], 'idx_sales_transactions_customer_created_at');
            $table->index(['pos_session_id', 'created_at'], 'idx_sales_transactions_pos_session_created_at');
        });

        Schema::create('sales_transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_transaction_id')
                ->constrained('sales_transactions', indexName: 'idx_sales_transaction_items_transaction')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('inventory_item_id')
                ->constrained('inventory_items', indexName: 'idx_sales_transaction_items_inventory_item')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('price_basis', 20)->default('cash');
            $table->decimal('snapshot_cash_price', 12, 2)->nullable();
            $table->decimal('snapshot_srp', 12, 2)->nullable();
            $table->decimal('snapshot_cost_price', 12, 2)->nullable();
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->string('discount_proof_image_url', 255)->nullable();
            $table->dateTime('discount_validated_at')->nullable();
            $table->decimal('line_total', 12, 2);
            $table->boolean('is_bundle')->default(false);
            $table->string('bundle_serial', 100)->nullable();
            $table->timestamps();

            $table->index(['sales_transaction_id', 'price_basis'], 'idx_sales_transaction_items_transaction_basis');
            $table->index(['inventory_item_id', 'is_bundle'], 'idx_sales_transaction_items_inventory_bundle');
        });

        Schema::create('sales_transaction_item_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_transaction_item_id')
                ->constrained('sales_transaction_items', indexName: 'idx_sales_transaction_item_components_item')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('inventory_item_id')
                ->constrained('inventory_items', indexName: 'idx_sales_transaction_item_components_inventory_item')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();

            $table->index(['sales_transaction_item_id', 'inventory_item_id'], 'idx_sales_transaction_item_components_lookup');
        });

        Schema::create('sales_transaction_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_transaction_id')
                ->constrained('sales_transactions', indexName: 'idx_sales_transaction_payments_transaction')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('payment_method_id')
                ->constrained('payment_methods', indexName: 'idx_sales_transaction_payments_payment_method')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            $table->index(['sales_transaction_id', 'payment_method_id'], 'idx_sales_transaction_payments_lookup');
        });

        Schema::create('sales_transaction_payment_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_transaction_payment_id')
                ->constrained('sales_transaction_payments', indexName: 'idx_sales_transaction_payment_details_payment')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->boolean('is_cash')->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->string('downpayment', 100)->nullable();
            $table->string('bank', 150)->nullable();
            $table->string('terminal_used', 150)->nullable();
            $table->string('card_holder_name', 150)->nullable();
            $table->unsignedSmallInteger('loan_term_months')->nullable();
            $table->string('sender_mobile', 50)->nullable();
            $table->string('contract_id', 100)->nullable();
            $table->string('registered_mobile', 50)->nullable();
            $table->timestamps();

            $table->unique('sales_transaction_payment_id', 'uq_sales_transaction_payment_details_payment');
        });

        Schema::create('sales_transaction_payment_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_transaction_payment_detail_id')
                ->constrained('sales_transaction_payment_details', indexName: 'idx_sales_transaction_payment_documents_detail')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('document_name', 150)->nullable();
            $table->string('document_url', 255);
            $table->string('document_type', 100)->nullable();
            $table->timestamps();

            $table->index('document_type', 'idx_sales_transaction_payment_documents_type');
        });

        Schema::create('sales_transaction_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_transaction_id')
                ->constrained('sales_transactions', indexName: 'idx_sales_transaction_documents_transaction')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('document_type', 100);
            $table->string('document_name', 150)->nullable();
            $table->string('document_url', 255);
            $table->timestamps();

            $table->index(['sales_transaction_id', 'document_type'], 'idx_sales_transaction_documents_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_transaction_documents');
        Schema::dropIfExists('sales_transaction_payment_documents');
        Schema::dropIfExists('sales_transaction_payment_details');
        Schema::dropIfExists('sales_transaction_payments');
        Schema::dropIfExists('sales_transaction_item_components');
        Schema::dropIfExists('sales_transaction_items');
        Schema::dropIfExists('sales_transactions');
    }
};
