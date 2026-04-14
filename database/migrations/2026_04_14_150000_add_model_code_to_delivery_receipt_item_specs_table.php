<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_receipt_item_specs', function (Blueprint $table) {
            $table->string('model_code', 100)->nullable()->after('delivery_receipt_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_receipt_item_specs', function (Blueprint $table) {
            $table->dropColumn('model_code');
        });
    }
};
