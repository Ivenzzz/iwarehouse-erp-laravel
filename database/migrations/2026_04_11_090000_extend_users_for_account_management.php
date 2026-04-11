<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('status', 20)->default('active')->after('password');
            $table->foreignId('created_by_id')
                ->nullable()
                ->after('remember_token')
                ->constrained('users', indexName: 'idx_users_created_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->softDeletes();

            $table->index('status', 'idx_users_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign('idx_users_created_by');
            $table->dropIndex('idx_users_status');
            $table->dropColumn(['status', 'created_by_id', 'deleted_at']);
        });
    }
};
