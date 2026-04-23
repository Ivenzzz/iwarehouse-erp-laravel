<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeAccount;
use App\Models\JobTitle;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

class UsersManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_users_page_requires_users_view_permission(): void
    {
        $stockman = $this->userWithRole('Stockman');
        $companyAdmin = $this->userWithRole('Company Admin');

        $this->actingAs($stockman)
            ->get(route('settings.users.index'))
            ->assertForbidden();

        $this->actingAs($companyAdmin)
            ->get(route('settings.users.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Users')
                ->has('users.data')
                ->has('roles')
                ->has('employees')
            );
    }

    public function test_company_admin_can_create_update_and_soft_delete_non_super_admin_users(): void
    {
        $admin = $this->userWithRole('Company Admin');
        $employee = $this->createEmployee('EMP-USR-001');

        $this->actingAs($admin)
            ->post(route('settings.users.store'), [
                'name' => 'Warehouse User',
                'username' => 'warehouse.user',
                'email' => 'warehouse.user@example.test',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'status' => User::STATUS_ACTIVE,
                'roles' => ['Stockman'],
                'employee_id' => $employee->id,
            ])
            ->assertRedirect(route('settings.users.index'));

        $created = User::query()->where('username', 'warehouse.user')->firstOrFail();
        $this->assertTrue($created->hasRole('Stockman'));
        $this->assertSame($admin->id, $created->created_by_id);
        $this->assertDatabaseHas('employee_accounts', [
            'user_id' => $created->id,
            'employee_id' => $employee->id,
        ]);

        $this->actingAs($admin)
            ->put(route('settings.users.update', $created), [
                'name' => 'Updated Warehouse User',
                'username' => 'warehouse.user',
                'email' => 'updated.warehouse.user@example.test',
                'password' => '',
                'password_confirmation' => '',
                'status' => User::STATUS_ACTIVE,
                'roles' => ['Warehouse Inventory Admin'],
                'employee_id' => '',
            ])
            ->assertRedirect(route('settings.users.index'));

        $created->refresh();
        $this->assertSame('Updated Warehouse User', $created->name);
        $this->assertTrue($created->hasRole('Warehouse Inventory Admin'));
        $this->assertDatabaseMissing('employee_accounts', ['user_id' => $created->id]);

        $this->actingAs($admin)
            ->delete(route('settings.users.destroy', $created))
            ->assertRedirect(route('settings.users.index'));

        $this->assertSoftDeleted('users', ['id' => $created->id]);
    }

    public function test_company_admin_cannot_modify_super_admin_accounts(): void
    {
        $companyAdmin = $this->userWithRole('Company Admin');
        $superAdmin = $this->userWithRole('SuperAdmin');

        $this->actingAs($companyAdmin)
            ->patch(route('settings.users.password', $superAdmin), [
                'password' => 'Password456!',
                'password_confirmation' => 'Password456!',
            ])
            ->assertForbidden();
    }

    public function test_deactivation_purges_sessions_and_blocks_login(): void
    {
        $admin = $this->userWithRole('Company Admin');
        $target = $this->userWithRole('Stockman', [
            'username' => 'inactive.target',
            'password' => 'Password123!',
        ]);

        DB::table('sessions')->insert([
            'id' => 'session-to-delete',
            'user_id' => $target->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($admin)
            ->patch(route('settings.users.status', $target), [
                'status' => User::STATUS_INACTIVE,
            ])
            ->assertRedirect(route('settings.users.index'));

        $this->assertDatabaseMissing('sessions', ['id' => 'session-to-delete']);

        $this->post(route('logout'));

        $this->post(route('login'), [
            'username' => 'inactive.target',
            'password' => 'Password123!',
        ])->assertSessionHasErrors('username');
    }

    public function test_password_reset_updates_credentials(): void
    {
        $admin = $this->userWithRole('Company Admin');
        $target = $this->userWithRole('Stockman');

        $this->actingAs($admin)
            ->patch(route('settings.users.password', $target), [
                'password' => 'Password456!',
                'password_confirmation' => 'Password456!',
            ])
            ->assertRedirect(route('settings.users.index'));

        $this->assertTrue(Hash::check('Password456!', $target->fresh()->password));
    }

    public function test_successful_login_writes_activitylog_and_profile_reads_history(): void
    {
        $admin = $this->userWithRole('Company Admin', [
            'username' => 'activity.admin',
            'password' => 'Password123!',
        ]);

        $this->post(route('login'), [
            'username' => 'activity.admin',
            'password' => 'Password123!',
        ])->assertRedirect(route('dashboard', absolute: false));

        $activity = Activity::query()
            ->where('log_name', 'auth')
            ->where('description', 'user.logged_in')
            ->where('subject_type', User::class)
            ->where('subject_id', $admin->id)
            ->first();

        $this->assertNotNull($activity);
        $this->assertSame($admin->id, $activity->causer_id);
        $this->assertNotNull($activity->getExtraProperty('session_id'));

        $this->actingAs($admin)
            ->getJson(route('settings.users.profile', $admin))
            ->assertOk()
            ->assertJsonPath('user.last_login_at', $activity->created_at->toDateTimeString())
            ->assertJsonPath('loginHistory.0.id', $activity->id);
    }

    public function test_pos_resolves_cashier_using_authenticated_user(): void
    {
        $user = $this->userWithRole('Stockman');
        $employee = $this->createEmployee('EMP-POS-LINK');

        EmployeeAccount::create([
            'user_id' => $user->id,
            'employee_id' => $employee->id,
        ]);

        $this->actingAs($user)
            ->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('POS')
                ->where('cashier.user_id', $user->id)
                ->where('cashier.setup_error', null)
            );
    }

    private function userWithRole(string $role, array $attributes = []): User
    {
        $user = User::factory()->create([
            ...$attributes,
            'status' => $attributes['status'] ?? User::STATUS_ACTIVE,
        ]);

        $user->assignRole($role);

        return $user;
    }

    private function createEmployee(string $employeeCode): Employee
    {
        $department = Department::firstOrCreate(
            ['name' => 'Operations'],
            ['status' => Department::STATUS_ACTIVE],
        );
        $jobTitle = JobTitle::firstOrCreate(
            ['department_id' => $department->id, 'name' => 'Staff'],
            ['status' => JobTitle::STATUS_ACTIVE],
        );

        return Employee::create([
            'employee_id' => $employeeCode,
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Test',
            'last_name' => 'Employee',
            'email' => strtolower($employeeCode).'@example.test',
            'status' => Employee::STATUS_ACTIVE,
        ]);
    }
}
