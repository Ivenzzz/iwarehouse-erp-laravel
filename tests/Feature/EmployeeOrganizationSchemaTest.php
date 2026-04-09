<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class EmployeeOrganizationSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_organization_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('departments'));
        $this->assertTrue(Schema::hasTable('job_titles'));
        $this->assertTrue(Schema::hasTable('employees'));
    }

    public function test_department_name_must_be_unique(): void
    {
        Department::create(['name' => 'Sales']);

        $this->expectException(QueryException::class);

        Department::create(['name' => 'Sales']);
    }

    public function test_job_titles_are_unique_per_department_and_reusable_across_departments(): void
    {
        $sales = Department::create(['name' => 'Sales']);
        $service = Department::create(['name' => 'Service']);

        JobTitle::create([
            'department_id' => $sales->id,
            'name' => 'Manager',
        ]);

        JobTitle::create([
            'department_id' => $service->id,
            'name' => 'Manager',
        ]);

        $this->assertDatabaseHas('job_titles', [
            'department_id' => $service->id,
            'name' => 'Manager',
        ]);

        $this->expectException(QueryException::class);

        JobTitle::create([
            'department_id' => $sales->id,
            'name' => 'Manager',
        ]);
    }

    public function test_employee_can_be_created_with_required_fields_and_default_status(): void
    {
        $jobTitle = $this->createJobTitle();

        $employee = Employee::create([
            'employee_id' => 'EMP-0001',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
        ]);

        $this->assertSame(Employee::STATUS_ACTIVE, $employee->status);
        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'employee_id' => 'EMP-0001',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'status' => Employee::STATUS_ACTIVE,
        ]);
    }

    public function test_employee_id_and_email_are_unique_while_null_email_is_allowed(): void
    {
        $jobTitle = $this->createJobTitle();

        Employee::create([
            'employee_id' => 'EMP-0001',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Ana',
            'last_name' => 'Santos',
            'email' => 'ana@example.test',
        ]);

        Employee::create([
            'employee_id' => 'EMP-0002',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Liza',
            'last_name' => 'Reyes',
            'email' => null,
        ]);

        Employee::create([
            'employee_id' => 'EMP-0003',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Mario',
            'last_name' => 'Garcia',
            'email' => null,
        ]);

        $this->expectException(QueryException::class);

        Employee::create([
            'employee_id' => 'EMP-0004',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Nina',
            'last_name' => 'Cruz',
            'email' => 'ana@example.test',
        ]);
    }

    public function test_employee_can_resolve_department_through_job_title(): void
    {
        $department = Department::create(['name' => 'Operations']);
        $jobTitle = JobTitle::create([
            'department_id' => $department->id,
            'name' => 'Supervisor',
        ]);

        $employee = Employee::create([
            'employee_id' => 'EMP-0001',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Paolo',
            'last_name' => 'Rivera',
        ]);

        $employee->load('jobTitle.department');

        $this->assertSame('Supervisor', $employee->jobTitle->name);
        $this->assertSame('Operations', $employee->jobTitle->department->name);
    }

    public function test_deleting_department_with_job_titles_is_blocked(): void
    {
        $department = Department::create(['name' => 'Admin']);
        JobTitle::create([
            'department_id' => $department->id,
            'name' => 'Coordinator',
        ]);

        $this->assertFalse($this->canDelete(fn () => $department->delete()));
    }

    public function test_deleting_job_title_with_employees_is_blocked(): void
    {
        $jobTitle = $this->createJobTitle();

        Employee::create([
            'employee_id' => 'EMP-0001',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Jose',
            'last_name' => 'Lopez',
        ]);

        $this->assertFalse($this->canDelete(fn () => $jobTitle->delete()));
    }

    public function test_oic_password_hash_is_nullable_and_hashes_values_when_present(): void
    {
        $jobTitle = $this->createJobTitle();

        $employeeWithoutHash = Employee::create([
            'employee_id' => 'EMP-0001',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Carla',
            'last_name' => 'Mendoza',
        ]);

        $employeeWithHash = Employee::create([
            'employee_id' => 'EMP-0002',
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Marco',
            'last_name' => 'Flores',
            'oic_password_hash' => 'secret-pass',
        ]);

        $this->assertNull($employeeWithoutHash->oic_password_hash);
        $this->assertNotNull($employeeWithHash->oic_password_hash);
        $this->assertNotSame('secret-pass', $employeeWithHash->oic_password_hash);
        $this->assertTrue(Hash::check('secret-pass', $employeeWithHash->oic_password_hash));
    }

    private function createJobTitle(): JobTitle
    {
        $department = Department::create(['name' => 'Sales']);

        return JobTitle::create([
            'department_id' => $department->id,
            'name' => 'Cashier',
        ]);
    }

    private function canDelete(callable $callback): bool
    {
        try {
            DB::transaction(function () use ($callback) {
                $callback();

                throw new \RuntimeException('rollback');
            });
        } catch (QueryException) {
            return false;
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() === 'rollback') {
                return true;
            }

            throw $exception;
        }

        return true;
    }
}
