<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function dropForeignKeyIfExists(string $table, string $column): void
    {
        $database = DB::getDatabaseName();
        $foreignKeyName = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', $table)
            ->where('COLUMN_NAME', $column)
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->value('CONSTRAINT_NAME');

        if (is_string($foreignKeyName) && $foreignKeyName !== '') {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$foreignKeyName}`");
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $database = DB::getDatabaseName();

        return DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', $table)
            ->where('INDEX_NAME', $indexName)
            ->exists();
    }

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        if (! Schema::hasColumn('pos_sessions', 'employee_id')) {
            return;
        }

        if (! Schema::hasColumn('pos_sessions', 'user_id')) {
            Schema::table('pos_sessions', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('session_number');
            });
        }

        DB::table('pos_sessions')
            ->leftJoin('employee_accounts', 'employee_accounts.employee_id', '=', 'pos_sessions.employee_id')
            ->update(['pos_sessions.user_id' => DB::raw('employee_accounts.user_id')]);

        DB::table('pos_sessions')->whereNull('user_id')->delete();

        $this->dropForeignKeyIfExists('pos_sessions', 'employee_id');

        Schema::table('pos_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('pos_sessions', 'employee_id')) {
                $table->dropColumn('employee_id');
            }
        });

        if ($this->indexExists('pos_sessions', 'idx_pos_sessions_employee_status')) {
            Schema::table('pos_sessions', function (Blueprint $table) {
                $table->dropIndex('idx_pos_sessions_employee_status');
            });
        }

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

        if (! Schema::hasColumn('pos_sessions', 'employee_id')) {
            Schema::table('pos_sessions', function (Blueprint $table) {
                $table->foreignId('employee_id')
                    ->nullable()
                    ->after('session_number')
                    ->constrained('employees', indexName: 'idx_pos_sessions_employee')
                    ->restrictOnDelete()
                    ->cascadeOnUpdate();
            });
        }

        DB::table('pos_sessions')->delete();

        $this->dropForeignKeyIfExists('pos_sessions', 'user_id');

        Schema::table('pos_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('pos_sessions', 'user_id')) {
                $table->dropColumn('user_id');
            }
            $table->index(['employee_id', 'status'], 'idx_pos_sessions_employee_status');
        });

        if ($this->indexExists('pos_sessions', 'idx_pos_sessions_user_status')) {
            Schema::table('pos_sessions', function (Blueprint $table) {
                $table->dropIndex('idx_pos_sessions_user_status');
            });
        }
    }
};
