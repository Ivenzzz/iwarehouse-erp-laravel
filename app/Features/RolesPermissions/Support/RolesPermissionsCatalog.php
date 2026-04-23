<?php

namespace App\Features\RolesPermissions\Support;

use App\Features\Users\Support\UserManagement;

class RolesPermissionsCatalog
{
    public const PERMISSIONS = [
        ...UserManagement::USER_PERMISSIONS,
        'companies.view',
        'companies.update',
        'roles-permissions.view',
        'roles-permissions.create',
        'roles-permissions.update',
        'roles-permissions.delete',
        'roles-permissions.assign',
    ];

    public const PROTECTED_ROLES = [
        UserManagement::ROLE_SUPER_ADMIN,
    ];

    public static function allPermissions(): array
    {
        return self::PERMISSIONS;
    }

    public static function groupedPermissions(): array
    {
        $groups = [];

        foreach (self::allPermissions() as $permission) {
            $group = str_contains($permission, '.')
                ? explode('.', $permission)[0]
                : 'misc';

            $groups[$group][] = $permission;
        }

        ksort($groups);

        foreach ($groups as &$permissions) {
            sort($permissions);
        }

        return $groups;
    }

    public static function isProtectedRole(string $name): bool
    {
        return in_array($name, self::PROTECTED_ROLES, true);
    }
}
