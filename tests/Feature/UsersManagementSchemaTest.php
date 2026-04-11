<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UsersManagementSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_management_schema_exists(): void
    {
        $this->assertTrue(Schema::hasColumn('users', 'status'));
        $this->assertTrue(Schema::hasColumn('users', 'created_by_id'));
        $this->assertTrue(Schema::hasColumn('users', 'deleted_at'));

        $this->assertTrue(Schema::hasTable('employee_accounts'));
        $this->assertTrue(Schema::hasColumn('employee_accounts', 'user_id'));
        $this->assertTrue(Schema::hasColumn('employee_accounts', 'employee_id'));
        $this->assertTrue(Schema::hasColumn('employee_accounts', 'created_by_id'));

        $this->assertTrue(Schema::hasTable('roles'));
        $this->assertTrue(Schema::hasTable('permissions'));
        $this->assertTrue(Schema::hasTable('activity_log'));
    }
}
