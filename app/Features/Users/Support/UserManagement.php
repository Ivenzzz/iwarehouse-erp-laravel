<?php

namespace App\Features\Users\Support;

use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

class UserManagement
{
    public const ROLE_SUPER_ADMIN = 'SuperAdmin';
    public const ROLE_COMPANY_ADMIN = 'Company Admin';
    public const ROLE_WAREHOUSE_INVENTORY_ADMIN = 'Warehouse Inventory Admin';
    public const ROLE_STOCKMAN = 'Stockman';
    public const ROLE_DEFAULT = 'Default';

    public const USER_PERMISSIONS = [
        'users.view',
        'users.create',
        'users.update',
        'users.delete',
        'users.activate',
        'users.reset-password',
        'users.link-employees',
    ];

    public const ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_COMPANY_ADMIN,
        self::ROLE_WAREHOUSE_INVENTORY_ADMIN,
        self::ROLE_STOCKMAN,
        self::ROLE_DEFAULT,
    ];

    public static function statuses(): array
    {
        return [
            User::STATUS_ACTIVE,
            User::STATUS_INACTIVE,
        ];
    }

    public function ensureCanManageTarget(User $actor, User $target): void
    {
        if ($target->hasRole(self::ROLE_SUPER_ADMIN) && ! $actor->hasRole(self::ROLE_SUPER_ADMIN)) {
            throw new AuthorizationException('Only SuperAdmin users can modify SuperAdmin accounts.');
        }
    }

    public function ensureCanAssignRoles(User $actor, array $roleNames): void
    {
        if (in_array(self::ROLE_SUPER_ADMIN, $roleNames, true) && ! $actor->hasRole(self::ROLE_SUPER_ADMIN)) {
            throw ValidationException::withMessages([
                'roles' => 'Only SuperAdmin users can assign the SuperAdmin role.',
            ]);
        }
    }

    public function ensureCanRemoveRoles(User $target, array $nextRoleNames): void
    {
        if (! $target->hasRole(self::ROLE_SUPER_ADMIN) || in_array(self::ROLE_SUPER_ADMIN, $nextRoleNames, true)) {
            return;
        }

        $this->ensureNotLastActiveSuperAdmin($target, 'remove the last active SuperAdmin role');
    }

    public function ensureNotSelfDestructive(User $actor, User $target, string $action): void
    {
        if ($actor->is($target)) {
            throw ValidationException::withMessages([
                'user' => "You cannot {$action} your own account.",
            ]);
        }
    }

    public function ensureNotLastActiveSuperAdmin(User $target, string $action): void
    {
        if (! $target->hasRole(self::ROLE_SUPER_ADMIN) || ! $target->isActive()) {
            return;
        }

        $activeSuperAdmins = User::query()
            ->role(self::ROLE_SUPER_ADMIN)
            ->where('status', User::STATUS_ACTIVE)
            ->count();

        if ($activeSuperAdmins <= 1) {
            throw ValidationException::withMessages([
                'user' => "You cannot {$action}.",
            ]);
        }
    }
}
