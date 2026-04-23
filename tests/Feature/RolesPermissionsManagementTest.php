<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RolesPermissionsManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_roles_permissions_page_requires_roles_permissions_view_permission(): void
    {
        $stockman = $this->userWithRole('Stockman');
        $companyAdmin = $this->userWithRole('Company Admin');

        $this->actingAs($stockman)
            ->get(route('settings.roles-permissions.index'))
            ->assertForbidden();

        $this->actingAs($companyAdmin)
            ->get(route('settings.roles-permissions.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('RolesPermissions')
                ->has('roles')
                ->has('permissions')
                ->has('users')
                ->where('can.create', true)
                ->where('can.update', true)
                ->where('can.delete', true)
                ->where('can.assign', true)
            );
    }

    public function test_company_admin_can_create_and_rename_custom_role(): void
    {
        $admin = $this->userWithRole('Company Admin');

        $this->actingAs($admin)
            ->post(route('settings.roles-permissions.roles.store'), [
                'name' => 'Auditor',
            ])
            ->assertRedirect(route('settings.roles-permissions.index'));

        $this->assertDatabaseHas('roles', [
            'name' => 'Auditor',
            'guard_name' => 'web',
        ]);

        $roleId = (int) \Spatie\Permission\Models\Role::query()->where('name', 'Auditor')->value('id');

        $this->actingAs($admin)
            ->put(route('settings.roles-permissions.roles.update', $roleId), [
                'name' => 'Audit Manager',
            ])
            ->assertRedirect(route('settings.roles-permissions.index'));

        $this->assertDatabaseMissing('roles', ['name' => 'Auditor']);
        $this->assertDatabaseHas('roles', ['name' => 'Audit Manager']);
    }

    public function test_super_admin_role_is_immutable(): void
    {
        $admin = $this->userWithRole('Company Admin');
        $superAdminRole = \Spatie\Permission\Models\Role::findByName('SuperAdmin', 'web');

        $this->actingAs($admin)
            ->put(route('settings.roles-permissions.roles.update', $superAdminRole), [
                'name' => 'Root Admin',
            ])
            ->assertSessionHasErrors('role');

        $this->actingAs($admin)
            ->put(route('settings.roles-permissions.roles.permissions.sync', $superAdminRole), [
                'permissions' => ['users.view'],
            ])
            ->assertSessionHasErrors('role');

        $this->actingAs($admin)
            ->delete(route('settings.roles-permissions.roles.destroy', $superAdminRole))
            ->assertSessionHasErrors('role');
    }

    public function test_role_delete_is_blocked_when_assigned_users_exist(): void
    {
        $admin = $this->userWithRole('Company Admin');
        $target = $this->userWithRole('Stockman');
        $role = \Spatie\Permission\Models\Role::create([
            'name' => 'Temporary Role',
            'guard_name' => 'web',
        ]);

        $target->syncRoles([$role->name]);

        $this->actingAs($admin)
            ->delete(route('settings.roles-permissions.roles.destroy', $role))
            ->assertSessionHasErrors('role');

        $this->assertDatabaseHas('roles', ['name' => 'Temporary Role']);
    }

    public function test_sync_role_permissions_rejects_unknown_permission_keys(): void
    {
        $admin = $this->userWithRole('Company Admin');
        $role = \Spatie\Permission\Models\Role::create([
            'name' => 'Ops Viewer',
            'guard_name' => 'web',
        ]);

        $this->actingAs($admin)
            ->put(route('settings.roles-permissions.roles.permissions.sync', $role), [
                'permissions' => ['permissions.unknown'],
            ])
            ->assertSessionHasErrors('permissions.0');
    }

    public function test_sync_user_roles_applies_assignments_and_respects_super_admin_guardrails(): void
    {
        $companyAdmin = $this->userWithRole('Company Admin');
        $stockman = $this->userWithRole('Stockman');
        $superAdminUser = $this->userWithRole('SuperAdmin');

        $this->actingAs($companyAdmin)
            ->put(route('settings.roles-permissions.users.roles.sync', $stockman), [
                'roles' => ['Warehouse Inventory Admin'],
            ])
            ->assertRedirect(route('settings.roles-permissions.index'));

        $this->assertTrue($stockman->fresh()->hasRole('Warehouse Inventory Admin'));

        $this->actingAs($companyAdmin)
            ->put(route('settings.roles-permissions.users.roles.sync', $superAdminUser), [
                'roles' => ['Stockman'],
            ])
            ->assertForbidden();
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
        ]);

        $user->assignRole($role);

        return $user;
    }
}
