<?php

namespace App\Features\RolesPermissions\Support;

use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class RolesPermissionsManagement
{
    public function ensureRoleMutable(Role $role): void
    {
        if (! RolesPermissionsCatalog::isProtectedRole($role->name)) {
            return;
        }

        throw ValidationException::withMessages([
            'role' => 'This role is protected and cannot be modified.',
        ]);
    }

    public function ensureRoleCanBeDeleted(Role $role): void
    {
        $this->ensureRoleMutable($role);

        if ($role->users()->count() === 0) {
            return;
        }

        throw ValidationException::withMessages([
            'role' => 'Cannot delete a role that is assigned to users.',
        ]);
    }

    public function ensurePermissionsAllowed(array $permissions): void
    {
        $allowed = RolesPermissionsCatalog::allPermissions();

        foreach ($permissions as $permission) {
            if (in_array($permission, $allowed, true)) {
                continue;
            }

            throw ValidationException::withMessages([
                'permissions' => 'Permission list contains unsupported values.',
            ]);
        }
    }
}
