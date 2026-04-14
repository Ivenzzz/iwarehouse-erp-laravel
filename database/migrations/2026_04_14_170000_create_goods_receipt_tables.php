<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $statuses = [
            'ongoing',
            'completed',
            'completed_with_discrepancy',
        ];

        Schema::create('goods_receipts', function (Blueprint $table) use ($statuses) {
            $table->id();
            $table->string('grn_number', 100);
            $table->foreignId('delivery_receipt_id')
                ->unique('uq_goods_receipts_delivery_receipt')
                ->constrained('delivery_receipts', indexName: 'idx_goods_receipts_delivery_receipt')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->enum('status', $statuses)->default('ongoing');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique('grn_number', 'uq_goods_receipts_grn_number');
            $table->index('status', 'idx_goods_receipts_status');
        });

        Schema::create('goods_receipt_discrepancies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_id')
                ->unique('uq_goods_receipt_discrepancies_goods_receipt')
                ->constrained('goods_receipts', indexName: 'idx_goods_receipt_discrepancies_goods_receipt')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->boolean('has_discrepancy')->default(false);
            $table->text('discrepancy_summary')->nullable();
            $table->timestamps();
        });

        Schema::create('goods_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_id')
                ->constrained('goods_receipts', indexName: 'idx_goods_receipt_items_goods_receipt')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('product_variant_id')
                ->constrained('product_variants', indexName: 'idx_goods_receipt_items_variant')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();

            $table->index('goods_receipt_id', 'idx_goods_receipt_items_goods_receipt_only');
            $table->index('product_variant_id', 'idx_goods_receipt_items_variant_only');
        });

        Schema::create('goods_receipt_item_identifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_item_id')
                ->unique('uq_goods_receipt_item_identifiers_item')
                ->constrained('goods_receipt_items', indexName: 'idx_goods_receipt_item_identifiers_item')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('serial_number', 100)->nullable();
            $table->string('imei1', 50)->nullable();
            $table->string('imei2', 50)->nullable();
            $table->timestamps();

            $table->unique('serial_number', 'uq_goods_receipt_item_identifiers_serial_number');
            $table->unique('imei1', 'uq_goods_receipt_item_identifiers_imei1');
            $table->unique('imei2', 'uq_goods_receipt_item_identifiers_imei2');
        });

        Schema::create('goods_receipt_item_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_item_id')
                ->unique('uq_goods_receipt_item_details_item')
                ->constrained('goods_receipt_items', indexName: 'idx_goods_receipt_item_details_item')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('package', 150)->nullable();
            $table->string('warranty', 150)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->decimal('cash_price', 12, 2)->nullable();
            $table->decimal('srp', 12, 2)->nullable();
            $table->string('product_type', 100)->nullable();
            $table->string('country_model', 100)->nullable();
            $table->boolean('with_charger')->default(false);
            $table->text('item_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goods_receipt_item_details');
        Schema::dropIfExists('goods_receipt_item_identifiers');
        Schema::dropIfExists('goods_receipt_items');
        Schema::dropIfExists('goods_receipt_discrepancies');
        Schema::dropIfExists('goods_receipts');
    }
};

