<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_number', 20);
            $table->foreignId('user_id')
                ->constrained('users', indexName: 'idx_pos_sessions_user')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('warehouse_id')
                ->constrained('warehouses', indexName: 'idx_pos_sessions_warehouse')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->decimal('opening_balance', 12, 2);
            $table->decimal('closing_balance', 12, 2)->nullable();
            $table->dateTime('shift_start_time');
            $table->dateTime('shift_end_time')->nullable();
            $table->string('status', 20)->default('opened');
            $table->text('cashier_remarks')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique('session_number', 'uq_pos_sessions_session_number');
            $table->index(['user_id', 'status'], 'idx_pos_sessions_user_status');
            $table->index(['warehouse_id', 'status'], 'idx_pos_sessions_warehouse_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sessions');
    }
};
