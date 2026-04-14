<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $database = (string) DB::getDatabaseName();
        $tableName = 'delivery_receipt_items';
        $tempIndex = 'idx_delivery_receipt_items_delivery_receipt_tmp';

        $foreignKeyName = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', $tableName)
            ->where('COLUMN_NAME', 'purchase_order_item_id')
            ->where('REFERENCED_TABLE_NAME', 'purchase_order_items')
            ->value('CONSTRAINT_NAME');

        if (is_string($foreignKeyName) && $foreignKeyName !== '') {
            DB::statement("ALTER TABLE `{$tableName}` DROP FOREIGN KEY `{$foreignKeyName}`");
        }

        $hasTempIndex = DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', $tableName)
            ->where('INDEX_NAME', $tempIndex)
            ->exists();
        if (! $hasTempIndex) {
            DB::statement("CREATE INDEX `{$tempIndex}` ON `{$tableName}` (`delivery_receipt_id`)");
        }

        Schema::table($tableName, function (Blueprint $table) {
            if (Schema::hasIndex('delivery_receipt_items', 'idx_delivery_receipt_items_purchase_order_item')) {
                $table->dropIndex('idx_delivery_receipt_items_purchase_order_item');
            }
            $table->dropUnique('uq_delivery_receipt_items_context');
            $table->dropColumn('purchase_order_item_id');
        });

        Schema::table($tableName, function (Blueprint $table) {
            $table->unique(
                ['delivery_receipt_id', 'product_master_id'],
                'uq_delivery_receipt_items_context'
            );
        });

        if ($hasTempIndex === false) {
            DB::statement("DROP INDEX `{$tempIndex}` ON `{$tableName}`");
        }
    }

    public function down(): void
    {
        $database = (string) DB::getDatabaseName();
        $tableName = 'delivery_receipt_items';
        $tempIndex = 'idx_delivery_receipt_items_delivery_receipt_tmp';

        $hasTempIndex = DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', $tableName)
            ->where('INDEX_NAME', $tempIndex)
            ->exists();
        if (! $hasTempIndex) {
            DB::statement("CREATE INDEX `{$tempIndex}` ON `{$tableName}` (`delivery_receipt_id`)");
        }

        Schema::table($tableName, function (Blueprint $table) {
            $table->dropUnique('uq_delivery_receipt_items_context');
        });

        Schema::table($tableName, function (Blueprint $table) {
            $table->foreignId('purchase_order_item_id')
                ->nullable()
                ->after('product_master_id')
                ->constrained('purchase_order_items', indexName: 'idx_delivery_receipt_items_purchase_order_item')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });

        Schema::table($tableName, function (Blueprint $table) {
            $table->unique(
                ['delivery_receipt_id', 'product_master_id', 'purchase_order_item_id'],
                'uq_delivery_receipt_items_context'
            );
        });

        if ($hasTempIndex === false) {
            DB::statement("DROP INDEX `{$tempIndex}` ON `{$tableName}`");
        }
    }
};
