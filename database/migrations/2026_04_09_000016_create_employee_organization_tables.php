<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('status', 30)->default('Active');
            $table->timestamps();

            $table->unique('name', 'uq_departments_name');
            $table->index('status', 'idx_departments_status');
        });

        Schema::create('job_titles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')
                ->constrained('departments', indexName: 'idx_job_titles_department')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('name', 150);
            $table->string('status', 30)->default('Active');
            $table->timestamps();

            $table->unique(['department_id', 'name'], 'uq_job_titles_department_name');
            $table->index('status', 'idx_job_titles_status');
        });

        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 30);
            $table->foreignId('job_title_id')
                ->constrained('job_titles', indexName: 'idx_employees_job_title')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('email', 150)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('address', 255)->nullable();
            $table->date('hire_date')->nullable();
            $table->string('employment_type', 30)->nullable();
            $table->string('oic_password_hash')->nullable();
            $table->string('status', 30)->default('Active');
            $table->timestamps();

            $table->unique('employee_id', 'uq_employees_employee_id');
            $table->unique('email', 'uq_employees_email');
            $table->index(['job_title_id', 'status'], 'idx_employees_job_title_status');
            $table->index(['last_name', 'first_name'], 'idx_employees_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
        Schema::dropIfExists('job_titles');
        Schema::dropIfExists('departments');
    }
};
