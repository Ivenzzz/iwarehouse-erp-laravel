<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->string('imei2', 50)->nullable()->after('imei');
            $table->timestamp('encoded_at')->nullable()->after('resolution');
            $table->string('grn_number', 100)->nullable()->after('encoded_at');
            $table->string('purchase_reference', 150)->nullable()->after('grn_number');
            $table->json('purchase_file_data')->nullable()->after('purchase_reference');

            $table->unique('imei2', 'uq_inventory_items_imei2');
            $table->index(['status', 'encoded_at'], 'idx_inventory_items_status_encoded_at');
        });

        Schema::table('inventory_item_logs', function (Blueprint $table) {
            $table->json('meta')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_item_logs', function (Blueprint $table) {
            $table->dropColumn('meta');
        });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropIndex('idx_inventory_items_status_encoded_at');
            $table->dropUnique('uq_inventory_items_imei2');
            $table->dropColumn([
                'imei2',
                'encoded_at',
                'grn_number',
                'purchase_reference',
                'purchase_file_data',
            ]);
        });
    }
};
