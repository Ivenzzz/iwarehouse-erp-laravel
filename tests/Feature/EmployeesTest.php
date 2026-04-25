<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmployeesTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_employees_page(): void
    {
        $this->get('/employees')->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_employees_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('employees.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees')
                ->has('employees.data')
                ->where('filters.search', '')
                ->where('filters.sort', 'employee_code')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_employees_index_searches_sorts_and_paginates(): void
    {
        $user = User::factory()->create();

        $salesDepartment = Department::create(['name' => 'Sales']);
        $adminDepartment = Department::create(['name' => 'Admin']);
        $salesAgent = JobTitle::create(['department_id' => $salesDepartment->id, 'name' => 'Sales Agent']);
        $hrOfficer = JobTitle::create(['department_id' => $adminDepartment->id, 'name' => 'HR Officer']);

        Employee::create([
            'employee_id' => 'EMP-001',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'job_title_id' => $salesAgent->id,
            'status' => Employee::STATUS_ACTIVE,
        ]);

        Employee::create([
            'employee_id' => 'EMP-002',
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'job_title_id' => $hrOfficer->id,
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $this->actingAs($user)
            ->get(route('employees.index', ['search' => 'sales']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('employees.data', 1)
                ->where('employees.data.0.employee_code', 'EMP-001')
            );

        $this->actingAs($user)
            ->get(route('employees.index', ['sort' => 'lastname', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('employees.data.0.lastname', 'Smith')
                ->where('filters.sort', 'lastname')
                ->where('filters.direction', 'desc')
            );
    }

    public function test_user_can_create_update_and_delete_employee(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('employees.store'), [
                'employee_code' => 'EMP-100',
                'firstname' => 'Alice',
                'lastname' => 'Walker',
                'department_name' => 'Operations',
                'job_title' => 'Coordinator',
            ])
            ->assertRedirect(route('employees.index', absolute: false));

        $employee = Employee::query()->where('employee_id', 'EMP-100')->firstOrFail();

        $this->assertDatabaseHas('departments', ['name' => 'Operations']);
        $this->assertDatabaseHas('job_titles', ['name' => 'Coordinator']);

        $this->actingAs($user)
            ->put(route('employees.update', $employee), [
                'employee_code' => 'EMP-101',
                'firstname' => 'Alice',
                'lastname' => 'Johnson',
                'department_name' => 'Sales',
                'job_title' => 'Senior Agent',
            ])
            ->assertRedirect(route('employees.index', absolute: false));

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'employee_id' => 'EMP-101',
            'last_name' => 'Johnson',
        ]);

        $this->actingAs($user)
            ->delete(route('employees.destroy', $employee))
            ->assertRedirect(route('employees.index', absolute: false));

        $this->assertDatabaseMissing('employees', ['id' => $employee->id]);
    }

    public function test_import_creates_employees_and_skips_existing_or_duplicate_employee_codes(): void
    {
        $user = User::factory()->create();

        $department = Department::create(['name' => 'Sales']);
        $jobTitle = JobTitle::create(['department_id' => $department->id, 'name' => 'Agent']);

        Employee::create([
            'employee_id' => 'EMP-001',
            'first_name' => 'Existing',
            'last_name' => 'Employee',
            'job_title_id' => $jobTitle->id,
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $csv = <<<'CSV'
Employee Code,Firstname,Lastname,Department Name,JobTitle
EMP-001,John,Doe,Sales,Agent
EMP-002,Jane,Smith,Sales,Agent
EMP-002,Jane,Smith,Sales,Agent
EMP-003,Mark,Taylor,Operations,Supervisor
CSV;

        $file = UploadedFile::fake()->createWithContent('employees.csv', $csv);

        $this->actingAs($user)
            ->post(route('employees.import'), ['file' => $file])
            ->assertRedirect(route('employees.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('employees', ['employee_id' => 'EMP-002', 'first_name' => 'Jane']);
        $this->assertDatabaseHas('employees', ['employee_id' => 'EMP-003', 'first_name' => 'Mark']);
        $this->assertDatabaseHas('departments', ['name' => 'Operations']);
        $this->assertDatabaseHas('job_titles', ['name' => 'Supervisor']);
        $this->assertSame(1, Employee::query()->where('employee_id', 'EMP-002')->count());
    }

    public function test_import_rejects_invalid_rows_without_partial_inserts(): void
    {
        $user = User::factory()->create();
        $csv = <<<'CSV'
Employee Code,Firstname,Lastname,Department Name,JobTitle
EMP-010,Ada,Lovelace,Operations,Manager
,Missing,Code,Operations,Manager
CSV;

        $file = UploadedFile::fake()->createWithContent('employees.csv', $csv);

        $this->actingAs($user)
            ->post(route('employees.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('employees', ['employee_id' => 'EMP-010']);
    }

    public function test_import_requires_expected_csv_headers(): void
    {
        $user = User::factory()->create();
        $csv = <<<'CSV'
Employee Code,Firstname,Lastname,Department Name
EMP-010,Ada,Lovelace,Operations
CSV;

        $file = UploadedFile::fake()->createWithContent('employees.csv', $csv);

        $this->actingAs($user)
            ->post(route('employees.import'), ['file' => $file])
            ->assertSessionHasErrors('file');
    }

    public function test_export_returns_expected_csv_shape(): void
    {
        $user = User::factory()->create();

        $department = Department::create(['name' => 'Sales']);
        $jobTitle = JobTitle::create(['department_id' => $department->id, 'name' => 'Agent']);

        Employee::create([
            'employee_id' => 'EMP-900',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'job_title_id' => $jobTitle->id,
            'status' => Employee::STATUS_ACTIVE,
        ]);

        $response = $this->actingAs($user)->get(route('employees.export'));

        $response->assertOk();
        $response->assertDownload('employees.csv');

        $content = $response->streamedContent();
        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        $header = str_getcsv($lines[0] ?? '');

        $this->assertSame(
            ['Employee Code', 'Firstname', 'Lastname', 'Department Name', 'JobTitle'],
            $header,
        );
        $this->assertStringContainsString('EMP-900,John,Doe,Sales,Agent', $content);
    }
}
