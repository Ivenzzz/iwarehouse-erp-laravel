<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users', indexName: 'idx_employee_accounts_user')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('employee_id')
                ->constrained('employees', indexName: 'idx_employee_accounts_employee')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('created_by_id')
                ->nullable()
                ->constrained('users', indexName: 'idx_employee_accounts_created_by')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();

            $table->unique('user_id', 'uq_employee_accounts_user');
            $table->unique('employee_id', 'uq_employee_accounts_employee');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_accounts');
    }
};
