<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $statuses = [
            'draft',
            'receiving_quotes',
            'converted_to_po',
            'consolidated',
            'closed',
            'cancelled',
        ];

        Schema::create('request_for_quotations', function (Blueprint $table) use ($statuses) {
            $table->id();
            $table->string('rfq_number', 30)->unique('uq_request_for_quotations_number');
            $table->foreignId('stock_request_id')
                ->unique('uq_request_for_quotations_stock_request')
                ->constrained('stock_requests', indexName: 'idx_request_for_quotations_stock_request')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('stock_request_approval_id')
                ->nullable()
                ->unique('uq_request_for_quotations_stock_request_approval')
                ->constrained('stock_request_approvals', indexName: 'idx_request_for_quotations_stock_request_approval')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('created_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_request_for_quotations_created_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->enum('status', $statuses)->default('draft');
            $table->unsignedBigInteger('selected_supplier_quote_id')->nullable()->unique('uq_request_for_quotations_selected_supplier_quote');
            $table->timestamps();

            $table->index('status', 'idx_request_for_quotations_status');
            $table->index('created_by_id', 'idx_request_for_quotations_created_by_only');
        });

        Schema::create('request_for_quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_for_quotation_id')
                ->constrained('request_for_quotations', indexName: 'idx_request_for_quotation_items_rfq')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('variant_id')
                ->constrained('product_variants', indexName: 'idx_request_for_quotation_items_variant')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->unsignedInteger('quantity');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['request_for_quotation_id', 'variant_id'], 'uq_request_for_quotation_items_rfq_variant');
        });

        Schema::create('request_for_quotation_supplier_quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_for_quotation_id')
                ->constrained('request_for_quotations', indexName: 'idx_request_for_quotation_supplier_quotes_rfq')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('supplier_id')
                ->constrained('suppliers', indexName: 'idx_request_for_quotation_supplier_quotes_supplier')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('quote_date');
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('shipping_cost', 12, 2)->default(0);
            $table->string('payment_terms', 150)->nullable();
            $table->date('eta')->nullable();
            $table->timestamps();

            $table->unique(['request_for_quotation_id', 'supplier_id'], 'uq_request_for_quotation_supplier_quotes_rfq_supplier');
        });

        Schema::create('request_for_quotation_supplier_quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_quote_id')
                ->constrained('request_for_quotation_supplier_quotes', indexName: 'idx_request_for_quotation_supplier_quote_items_quote')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('rfq_item_id')
                ->constrained('request_for_quotation_items', indexName: 'idx_request_for_quotation_supplier_quote_items_rfq_item')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->unsignedInteger('quoted_quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('discount', 12, 2)->default(0);
            $table->timestamps();

            $table->unique(['supplier_quote_id', 'rfq_item_id'], 'uq_request_for_quotation_supplier_quote_items_quote_item');
        });

        Schema::create('request_for_quotation_status_histories', function (Blueprint $table) use ($statuses) {
            $table->id();
            $table->foreignId('request_for_quotation_id')
                ->constrained('request_for_quotations', indexName: 'idx_request_for_quotation_status_histories_rfq')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->enum('status', $statuses);
            $table->foreignId('changed_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_request_for_quotation_status_histories_changed_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamp('occurred_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['request_for_quotation_id', 'occurred_at'], 'idx_request_for_quotation_status_histories_rfq_occurred');
        });

        Schema::table('request_for_quotations', function (Blueprint $table) {
            $table->foreign('selected_supplier_quote_id', 'fk_request_for_quotations_selected_supplier_quote')
                ->references('id')
                ->on('request_for_quotation_supplier_quotes')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('request_for_quotations', function (Blueprint $table) {
            $table->dropForeign(['selected_supplier_quote_id']);
        });

        Schema::dropIfExists('request_for_quotation_status_histories');
        Schema::dropIfExists('request_for_quotation_supplier_quote_items');
        Schema::dropIfExists('request_for_quotation_supplier_quotes');
        Schema::dropIfExists('request_for_quotation_items');
        Schema::dropIfExists('request_for_quotations');
    }
};
