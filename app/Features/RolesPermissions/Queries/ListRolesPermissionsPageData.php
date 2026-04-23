<?php

namespace App\Features\RolesPermissions\Queries;

use App\Features\RolesPermissions\Support\RolesPermissionsCatalog;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class ListRolesPermissionsPageData
{
    public function __invoke(Request $request): array
    {
        return [
            'roles' => Role::query()
                ->with('permissions:id,name')
                ->withCount('users')
                ->orderBy('name')
                ->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'is_protected' => RolesPermissionsCatalog::isProtectedRole($role->name),
                    'users_count' => (int) $role->users_count,
                    'permissions' => $role->permissions->pluck('name')->sort()->values(),
                ])
                ->values(),
            'permissions' => collect(RolesPermissionsCatalog::groupedPermissions())
                ->map(fn (array $items, string $group) => [
                    'group' => $group,
                    'items' => $items,
                ])
                ->values(),
            'users' => User::query()
                ->with('roles:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'username', 'email'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('name')->sort()->values(),
                ])
                ->values(),
            'can' => [
                'create' => $request->user()?->can('roles-permissions.create') ?? false,
                'update' => $request->user()?->can('roles-permissions.update') ?? false,
                'delete' => $request->user()?->can('roles-permissions.delete') ?? false,
                'assign' => $request->user()?->can('roles-permissions.assign') ?? false,
            ],
        ];
    }
}
