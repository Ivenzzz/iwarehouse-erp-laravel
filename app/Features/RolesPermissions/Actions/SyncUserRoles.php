<?php

namespace App\Features\RolesPermissions\Actions;

use App\Features\Users\Support\UserManagement;
use App\Models\User;

class SyncUserRoles
{
    public function __construct(private readonly UserManagement $userManagement) {}

    public function handle(User $actor, User $target, array $roles): User
    {
        $this->userManagement->ensureCanAssignRoles($actor, $roles);
        $this->userManagement->ensureCanManageTarget($actor, $target);
        $this->userManagement->ensureCanRemoveRoles($target, $roles);

        $target->syncRoles($roles);

        return $target->fresh('roles');
    }
}
