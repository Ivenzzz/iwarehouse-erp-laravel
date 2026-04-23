<?php

namespace App\Features\RolesPermissions\Actions;

use App\Features\RolesPermissions\Support\RolesPermissionsManagement;
use Spatie\Permission\Models\Role;

class SaveRole
{
    public function __construct(private readonly RolesPermissionsManagement $management) {}

    public function create(string $name): Role
    {
        return Role::create([
            'name' => $name,
            'guard_name' => 'web',
        ]);
    }

    public function update(Role $role, string $name): Role
    {
        $this->management->ensureRoleMutable($role);

        $role->update(['name' => $name]);

        return $role->fresh();
    }
}
