<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        if (! Schema::hasColumn('pos_sessions', 'employee_id')) {
            return;
        }

        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('session_number');
        });

        DB::table('pos_sessions')
            ->leftJoin('employee_accounts', 'employee_accounts.employee_id', '=', 'pos_sessions.employee_id')
            ->update(['pos_sessions.user_id' => DB::raw('employee_accounts.user_id')]);

        DB::table('pos_sessions')->whereNull('user_id')->delete();

        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_pos_sessions_employee_status');
            $table->dropConstrainedForeignId('employee_id');
        });

        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->foreign('user_id', 'idx_pos_sessions_user')
                ->references('id')
                ->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->index(['user_id', 'status'], 'idx_pos_sessions_user_status');
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        if (! Schema::hasColumn('pos_sessions', 'user_id')) {
            return;
        }

        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->foreignId('employee_id')
                ->nullable()
                ->after('session_number')
                ->constrained('employees', indexName: 'idx_pos_sessions_employee')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        DB::table('pos_sessions')->delete();

        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_pos_sessions_user_status');
            $table->dropConstrainedForeignId('user_id');
            $table->index(['employee_id', 'status'], 'idx_pos_sessions_employee_status');
        });
    }
};
