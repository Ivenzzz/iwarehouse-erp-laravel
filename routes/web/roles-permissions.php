<?php

use App\Features\RolesPermissions\Http\Controllers\RolesPermissionsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'permission:roles-permissions.view'])->prefix('settings')->name('settings.')->group(function () {
    Route::get('/roles-permissions', [RolesPermissionsController::class, 'index'])->name('roles-permissions.index');

    Route::post('/roles-permissions/roles', [RolesPermissionsController::class, 'storeRole'])
        ->middleware('permission:roles-permissions.create')
        ->name('roles-permissions.roles.store');

    Route::match(['put', 'patch'], '/roles-permissions/roles/{role}', [RolesPermissionsController::class, 'updateRole'])
        ->middleware('permission:roles-permissions.update')
        ->name('roles-permissions.roles.update');

    Route::delete('/roles-permissions/roles/{role}', [RolesPermissionsController::class, 'destroyRole'])
        ->middleware('permission:roles-permissions.delete')
        ->name('roles-permissions.roles.destroy');

    Route::put('/roles-permissions/roles/{role}/permissions', [RolesPermissionsController::class, 'syncRolePermissions'])
        ->middleware('permission:roles-permissions.update')
        ->name('roles-permissions.roles.permissions.sync');

    Route::put('/roles-permissions/users/{user}/roles', [RolesPermissionsController::class, 'syncUserRoles'])
        ->middleware('permission:roles-permissions.assign')
        ->name('roles-permissions.users.roles.sync');
});
