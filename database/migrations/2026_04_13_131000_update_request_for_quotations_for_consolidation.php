<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('request_for_quotations', function (Blueprint $table) {
            $table->dropForeign(['stock_request_id']);
            $table->dropForeign(['stock_request_approval_id']);

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
        Schema::table('request_for_quotations', function (Blueprint $table) {
            $table->dropForeign(['stock_request_id']);
            $table->dropForeign(['stock_request_approval_id']);

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
