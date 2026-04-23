<?php

namespace App\Features\RolesPermissions\Http\Controllers;

use App\Features\RolesPermissions\Actions\DeleteRole;
use App\Features\RolesPermissions\Actions\SaveRole;
use App\Features\RolesPermissions\Actions\SyncRolePermissions;
use App\Features\RolesPermissions\Actions\SyncUserRoles;
use App\Features\RolesPermissions\Http\Requests\SaveRoleRequest;
use App\Features\RolesPermissions\Http\Requests\SyncRolePermissionsRequest;
use App\Features\RolesPermissions\Http\Requests\SyncUserRolesRequest;
use App\Features\RolesPermissions\Queries\ListRolesPermissionsPageData;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Spatie\Permission\Models\Role;

class RolesPermissionsController extends Controller
{
    public function index(Request $request, ListRolesPermissionsPageData $listPageData): InertiaResponse
    {
        return Inertia::render('RolesPermissions', $listPageData($request));
    }

    public function storeRole(SaveRoleRequest $request, SaveRole $saveRole): RedirectResponse
    {
        $saveRole->create((string) $request->string('name')->trim());

        return redirect()
            ->route('settings.roles-permissions.index')
            ->with('success', 'Role created.');
    }

    public function updateRole(SaveRoleRequest $request, Role $role, SaveRole $saveRole): RedirectResponse
    {
        $saveRole->update($role, (string) $request->string('name')->trim());

        return redirect()
            ->route('settings.roles-permissions.index')
            ->with('success', 'Role updated.');
    }

    public function destroyRole(Role $role, DeleteRole $deleteRole): RedirectResponse
    {
        $deleteRole->handle($role);

        return redirect()
            ->route('settings.roles-permissions.index')
            ->with('success', 'Role deleted.');
    }

    public function syncRolePermissions(
        SyncRolePermissionsRequest $request,
        Role $role,
        SyncRolePermissions $syncRolePermissions,
    ): RedirectResponse {
        $syncRolePermissions->handle($role, $request->validated('permissions'));

        return redirect()
            ->route('settings.roles-permissions.index')
            ->with('success', 'Role permissions updated.');
    }

    public function syncUserRoles(
        SyncUserRolesRequest $request,
        User $user,
        SyncUserRoles $syncUserRoles,
    ): RedirectResponse {
        $syncUserRoles->handle($request->user(), $user, $request->validated('roles'));

        return redirect()
            ->route('settings.roles-permissions.index')
            ->with('success', 'User role assignments updated.');
    }
}
