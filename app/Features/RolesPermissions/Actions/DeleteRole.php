<?php

namespace App\Features\RolesPermissions\Actions;

use App\Features\RolesPermissions\Support\RolesPermissionsManagement;
use Spatie\Permission\Models\Role;

class DeleteRole
{
    public function __construct(private readonly RolesPermissionsManagement $management) {}

    public function handle(Role $role): void
    {
        $this->management->ensureRoleCanBeDeleted($role);

        $role->delete();
    }
}
