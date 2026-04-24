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

        Schema::table('inventory_items', function (Blueprint $table) use ($driver) {
            if ($driver === 'sqlite') {
                $table->dropForeign(['supplier_id']);
            } else {
                $table->dropForeign('idx_inventory_items_supplier');
            }

            $table->dropColumn([
                'supplier_id',
                'cpu',
                'gpu',
                'submodel',
                'ram_type',
                'rom_type',
                'ram_slots',
                'country_model',
                'resolution',
                'purchase_reference',
                'purchase_file_data',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->foreignId('supplier_id')
                ->nullable()
                ->after('warehouse_id');
            $table->string('cpu', 150)->nullable()->after('warranty');
            $table->string('gpu', 150)->nullable()->after('cpu');
            $table->string('submodel', 150)->nullable()->after('gpu');
            $table->string('ram_type', 100)->nullable()->after('submodel');
            $table->string('rom_type', 100)->nullable()->after('ram_type');
            $table->string('ram_slots', 100)->nullable()->after('rom_type');
            $table->string('country_model', 100)->nullable()->after('product_type');
            $table->string('resolution', 100)->nullable()->after('with_charger');
            $table->string('purchase_reference', 150)->nullable()->after('grn_number');
            $table->json('purchase_file_data')->nullable()->after('purchase_reference');
        });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->foreign('supplier_id', 'idx_inventory_items_supplier')
                ->references('id')
                ->on('suppliers')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }
};
