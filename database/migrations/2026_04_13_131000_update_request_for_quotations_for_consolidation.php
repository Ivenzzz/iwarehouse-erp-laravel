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

        Schema::table('request_for_quotations', function (Blueprint $table) use ($driver) {
            if ($driver === 'sqlite') {
                $table->dropForeign(['stock_request_id']);
                $table->dropForeign(['stock_request_approval_id']);
            } else {
                $table->dropForeign('idx_request_for_quotations_stock_request');
                $table->dropForeign('idx_request_for_quotations_stock_request_approval');
            }

            $table->dropUnique('uq_request_for_quotations_stock_request');
            $table->dropUnique('uq_request_for_quotations_stock_request_approval');

            $table->foreign('stock_request_id', 'idx_request_for_quotations_stock_request')
                ->references('id')
                ->on('stock_requests')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('stock_request_approval_id', 'idx_request_for_quotations_stock_request_approval')
                ->references('id')
                ->on('stock_request_approvals')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        Schema::table('request_for_quotations', function (Blueprint $table) use ($driver) {
            if ($driver === 'sqlite') {
                $table->dropForeign(['stock_request_id']);
                $table->dropForeign(['stock_request_approval_id']);
            } else {
                $table->dropForeign('idx_request_for_quotations_stock_request');
                $table->dropForeign('idx_request_for_quotations_stock_request_approval');
            }

            $table->unique('stock_request_id', 'uq_request_for_quotations_stock_request');
            $table->unique('stock_request_approval_id', 'uq_request_for_quotations_stock_request_approval');

            $table->foreign('stock_request_id', 'idx_request_for_quotations_stock_request')
                ->references('id')
                ->on('stock_requests')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('stock_request_approval_id', 'idx_request_for_quotations_stock_request_approval')
                ->references('id')
                ->on('stock_request_approvals')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }
};
