<?php

namespace Database\Seeders;

use App\Features\RolesPermissions\Support\RolesPermissionsCatalog;
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

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = collect(RolesPermissionsCatalog::allPermissions())
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
