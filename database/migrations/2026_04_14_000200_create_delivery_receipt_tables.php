<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')
                ->constrained('suppliers', indexName: 'idx_delivery_receipts_supplier')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('po_id')
                ->nullable()
                ->constrained('purchase_orders', indexName: 'idx_delivery_receipts_po')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->string('dr_number', 50);
            $table->string('reference_number', 100)->nullable();
            $table->dateTime('date_received');
            $table->dateTime('date_encoded');
            $table->foreignId('received_by_user_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_delivery_receipts_received_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('encoded_by_user_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_delivery_receipts_encoded_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('payment_term_id')
                ->nullable()
                ->constrained('payment_terms', indexName: 'idx_delivery_receipts_payment_term')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->unsignedInteger('box_count_declared')->nullable();
            $table->unsignedInteger('box_count_received')->nullable();
            $table->boolean('has_variance')->default(false);
            $table->text('variance_notes')->nullable();
            $table->decimal('dr_value', 12, 2)->nullable();
            $table->decimal('total_landed_cost', 12, 2)->nullable();
            $table->boolean('has_goods_receipt')->default(false);
            $table->timestamps();

            $table->unique(['supplier_id', 'dr_number'], 'uq_delivery_receipts_supplier_dr_number');
            $table->index('po_id', 'idx_delivery_receipts_po_only');
            $table->index('date_received', 'idx_delivery_receipts_date_received');
            $table->index('has_goods_receipt', 'idx_delivery_receipts_has_goods_receipt');
        });

        Schema::create('delivery_receipt_logistics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_receipt_id')
                ->unique('uq_delivery_receipt_logistics_delivery_receipt')
                ->constrained('delivery_receipts', indexName: 'idx_delivery_receipt_logistics_delivery_receipt')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('logistics_company', 150)->nullable();
            $table->string('waybill_number', 100)->nullable();
            $table->string('driver_name', 150)->nullable();
            $table->string('driver_contact', 50)->nullable();
            $table->string('origin', 150)->nullable();
            $table->string('destination', 150)->nullable();
            $table->decimal('freight_cost', 12, 2)->nullable();
            $table->timestamps();

            $table->index('waybill_number', 'idx_delivery_receipt_logistics_waybill');
        });

        Schema::create('delivery_receipt_uploads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_receipt_id')
                ->unique('uq_delivery_receipt_uploads_delivery_receipt')
                ->constrained('delivery_receipts', indexName: 'idx_delivery_receipt_uploads_delivery_receipt')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('vendor_dr_url', 500)->nullable();
            $table->string('waybill_url', 500)->nullable();
            $table->string('freight_invoice_url', 500)->nullable();
            $table->string('driver_id_url', 500)->nullable();
            $table->string('purchase_file_url', 500)->nullable();
            $table->boolean('uploads_complete')->default(false);
            $table->timestamps();
        });

        Schema::create('delivery_receipt_box_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_receipt_upload_id')
                ->constrained('delivery_receipt_uploads', indexName: 'idx_delivery_receipt_box_photos_upload')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('photo_url', 500);
            $table->timestamps();

            $table->index('delivery_receipt_upload_id', 'idx_delivery_receipt_box_photos_upload_only');
        });

        Schema::create('delivery_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_receipt_id')
                ->constrained('delivery_receipts', indexName: 'idx_delivery_receipt_items_delivery_receipt')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('product_master_id')
                ->constrained('product_masters', indexName: 'idx_delivery_receipt_items_product_master')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('purchase_order_item_id')
                ->nullable()
                ->constrained('purchase_order_items', indexName: 'idx_delivery_receipt_items_purchase_order_item')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->unsignedInteger('expected_quantity');
            $table->unsignedInteger('actual_quantity');
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->decimal('cash_price', 12, 2)->nullable();
            $table->decimal('srp_price', 12, 2)->nullable();
            $table->decimal('total_value', 12, 2)->nullable();
            $table->boolean('variance_flag')->default(false);
            $table->text('variance_notes')->nullable();
            $table->timestamps();

            $table->unique(
                ['delivery_receipt_id', 'product_master_id', 'purchase_order_item_id'],
                'uq_delivery_receipt_items_context'
            );
        });

        Schema::create('delivery_receipt_item_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_receipt_item_id')
                ->unique('uq_delivery_receipt_item_specs_item')
                ->constrained('delivery_receipt_items', indexName: 'idx_delivery_receipt_item_specs_item')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('ram', 50)->nullable();
            $table->string('rom', 50)->nullable();
            $table->string('condition', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_receipt_item_specs');
        Schema::dropIfExists('delivery_receipt_items');
        Schema::dropIfExists('delivery_receipt_box_photos');
        Schema::dropIfExists('delivery_receipt_uploads');
        Schema::dropIfExists('delivery_receipt_logistics');
        Schema::dropIfExists('delivery_receipts');
    }
};
