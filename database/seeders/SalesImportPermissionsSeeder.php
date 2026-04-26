<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SalesImportPermissionsSeeder extends Seeder
{
    private const PERMISSIONS = [
        'sales.import.pos-sessions',
        'sales.import.transactions',
    ];

    private const ROLES = [
        'SuperAdmin',
        'Company Admin',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = collect(self::PERMISSIONS)
            ->map(fn (string $permission) => Permission::findOrCreate($permission, 'web'));

        foreach (self::ROLES as $roleName) {
            $role = Role::findByName($roleName, 'web');
            $role->givePermissionTo($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}

