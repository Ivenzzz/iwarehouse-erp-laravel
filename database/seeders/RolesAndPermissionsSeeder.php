<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    private const ROLES = [
        'SuperAdmin',
        'Company Admin',
        'Warehouse Inventory Admin',
        'Stockman',
    ];

    private const USER_PERMISSIONS = [
        'users.view',
        'users.create',
        'users.update',
        'users.delete',
        'users.activate',
        'users.reset-password',
        'users.link-employees',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = collect(self::USER_PERMISSIONS)
            ->map(fn (string $permission) => Permission::findOrCreate($permission, 'web'));

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::ROLES as $roleName) {
            $role = Role::findOrCreate($roleName, 'web');

            if (in_array($roleName, ['SuperAdmin', 'Company Admin'], true)) {
                $role->syncPermissions($permissions);
                continue;
            }

            $role->syncPermissions([]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
