<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        Schema::table('purchase_orders', function (Blueprint $table) use ($driver) {
            $table->decimal('shipping_amount', 12, 2)->default(0)->after('expected_delivery_date');

            if ($driver === 'sqlite') {
                $table->dropForeign(['rfq_id']);
                $table->dropForeign(['selected_supplier_quote_id']);
            } else {
                $table->dropForeign('idx_purchase_orders_rfq');
                $table->dropForeign('idx_purchase_orders_selected_supplier_quote');
            }

            $table->unsignedBigInteger('rfq_id')->nullable()->change();
            $table->unsignedBigInteger('selected_supplier_quote_id')->nullable()->change();

            $table->foreign('rfq_id', 'idx_purchase_orders_rfq')
                ->references('id')
                ->on('request_for_quotations')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('selected_supplier_quote_id', 'idx_purchase_orders_selected_supplier_quote')
                ->references('id')
                ->on('request_for_quotation_supplier_quotes')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });

        Schema::table('purchase_order_items', function (Blueprint $table) use ($driver) {
            $table->foreignId('product_master_id')
                ->nullable()
                ->after('supplier_quote_item_id')
                ->constrained('product_masters', indexName: 'idx_purchase_order_items_product_master')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            if ($driver === 'sqlite') {
                $table->dropForeign(['supplier_quote_item_id']);
            } else {
                $table->dropForeign('idx_purchase_order_items_supplier_quote_item');
            }
            $table->unsignedBigInteger('supplier_quote_item_id')->nullable()->change();
            $table->foreign('supplier_quote_item_id', 'idx_purchase_order_items_supplier_quote_item')
                ->references('id')
                ->on('request_for_quotation_supplier_quote_items')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        Schema::table('purchase_order_items', function (Blueprint $table) use ($driver) {
            if ($driver === 'sqlite') {
                $table->dropForeign(['product_master_id']);
            } else {
                $table->dropForeign('idx_purchase_order_items_product_master');
            }
            $table->dropColumn('product_master_id');

            if ($driver === 'sqlite') {
                $table->dropForeign(['supplier_quote_item_id']);
            } else {
                $table->dropForeign('idx_purchase_order_items_supplier_quote_item');
            }
            $table->unsignedBigInteger('supplier_quote_item_id')->nullable(false)->change();
            $table->foreign('supplier_quote_item_id', 'idx_purchase_order_items_supplier_quote_item')
                ->references('id')
                ->on('request_for_quotation_supplier_quote_items')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        Schema::table('purchase_orders', function (Blueprint $table) use ($driver) {
            if ($driver === 'sqlite') {
                $table->dropForeign(['rfq_id']);
                $table->dropForeign(['selected_supplier_quote_id']);
            } else {
                $table->dropForeign('idx_purchase_orders_rfq');
                $table->dropForeign('idx_purchase_orders_selected_supplier_quote');
            }

            $table->unsignedBigInteger('rfq_id')->nullable(false)->change();
            $table->unsignedBigInteger('selected_supplier_quote_id')->nullable(false)->change();

            $table->foreign('rfq_id', 'idx_purchase_orders_rfq')
                ->references('id')
                ->on('request_for_quotations')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('selected_supplier_quote_id', 'idx_purchase_orders_selected_supplier_quote')
                ->references('id')
                ->on('request_for_quotation_supplier_quotes')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->dropColumn('shipping_amount');
        });
    }
};
