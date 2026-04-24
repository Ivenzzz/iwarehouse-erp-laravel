<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement("
                UPDATE purchase_order_items
                SET product_master_id = (
                    SELECT pv.product_master_id
                    FROM request_for_quotation_supplier_quote_items sqi
                    JOIN request_for_quotation_items rfi ON rfi.id = sqi.rfq_item_id
                    JOIN product_variants pv ON pv.id = rfi.variant_id
                    WHERE sqi.id = purchase_order_items.supplier_quote_item_id
                )
                WHERE product_master_id IS NULL
            ");
        } else {
            DB::statement("
                UPDATE purchase_order_items poi
                INNER JOIN request_for_quotation_supplier_quote_items sqi ON sqi.id = poi.supplier_quote_item_id
                INNER JOIN request_for_quotation_items rfi ON rfi.id = sqi.rfq_item_id
                INNER JOIN product_variants pv ON pv.id = rfi.variant_id
                SET poi.product_master_id = pv.product_master_id
                WHERE poi.product_master_id IS NULL
            ");
        }

        $missingProductMasterCount = DB::table('purchase_order_items')
            ->whereNull('product_master_id')
            ->count();

        if ($missingProductMasterCount > 0) {
            throw new RuntimeException(
                'Cannot drop supplier_quote_item_id: '.$missingProductMasterCount.' purchase_order_items rows still have null product_master_id.'
            );
        }

        if ($driver === 'sqlite') {
            Schema::table('purchase_order_items', function (Blueprint $table) {
                try {
                    $table->dropForeign(['supplier_quote_item_id']);
                } catch (Throwable) {
                    // no-op when FK is already absent
                }

                try {
                    $table->index('purchase_order_id', 'idx_purchase_order_items_purchase_order_only');
                } catch (Throwable) {
                    // no-op when index already exists
                }
            });
        } else {
            $databaseName = DB::getDatabaseName();
            $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->select('CONSTRAINT_NAME')
                ->where('TABLE_SCHEMA', $databaseName)
                ->where('TABLE_NAME', 'purchase_order_items')
                ->where('COLUMN_NAME', 'supplier_quote_item_id')
                ->whereNotNull('REFERENCED_TABLE_NAME')
                ->pluck('CONSTRAINT_NAME');

            foreach ($foreignKeys as $foreignKeyName) {
                DB::statement(sprintf(
                    'ALTER TABLE `purchase_order_items` DROP FOREIGN KEY `%s`',
                    str_replace('`', '``', (string) $foreignKeyName)
                ));
            }

            $hasPurchaseOrderIndex = DB::table('information_schema.STATISTICS')
                ->where('TABLE_SCHEMA', $databaseName)
                ->where('TABLE_NAME', 'purchase_order_items')
                ->where('INDEX_NAME', 'idx_purchase_order_items_purchase_order_only')
                ->exists();
            if (! $hasPurchaseOrderIndex) {
                DB::statement('ALTER TABLE `purchase_order_items` ADD INDEX `idx_purchase_order_items_purchase_order_only` (`purchase_order_id`)');
            }
        }

        Schema::table('purchase_order_items', function (Blueprint $table) {
            try {
                $table->dropUnique('uq_purchase_order_items_po_supplier_quote_item');
            } catch (Throwable) {
                // no-op when the unique index is already absent
            }
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_order_items', 'supplier_quote_item_id')) {
                $table->dropColumn('supplier_quote_item_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_order_items', 'supplier_quote_item_id')) {
                $table->unsignedBigInteger('supplier_quote_item_id')->nullable()->after('purchase_order_id');
            }
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->foreign('supplier_quote_item_id', 'idx_purchase_order_items_supplier_quote_item')
                ->references('id')
                ->on('request_for_quotation_supplier_quote_items')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            try {
                $table->unique(['purchase_order_id', 'supplier_quote_item_id'], 'uq_purchase_order_items_po_supplier_quote_item');
            } catch (Throwable) {
                // no-op when unique index already exists
            }

            try {
                $table->dropIndex('idx_purchase_order_items_purchase_order_only');
            } catch (Throwable) {
                // no-op when index does not exist
            }
        });
    }
};
