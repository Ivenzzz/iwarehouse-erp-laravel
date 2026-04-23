<?php

namespace App\Features\RolesPermissions\Actions;

use App\Features\RolesPermissions\Support\RolesPermissionsManagement;
use Spatie\Permission\Models\Role;

class SyncRolePermissions
{
    public function __construct(private readonly RolesPermissionsManagement $management) {}

    public function handle(Role $role, array $permissions): Role
    {
        $this->management->ensureRoleMutable($role);
        $this->management->ensurePermissionsAllowed($permissions);

        $role->syncPermissions($permissions);

        return $role->fresh('permissions');
    }
}
