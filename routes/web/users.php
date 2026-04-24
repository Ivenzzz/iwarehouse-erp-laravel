<?php

use App\Features\Users\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'permission:users.view'])->prefix('settings')->name('settings.')->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:users.create')->name('users.store');
    Route::post('/users/import', [UserController::class, 'import'])->middleware('permission:users.create')->name('users.import');
    Route::match(['put', 'patch'], '/users/{user}', [UserController::class, 'update'])->middleware('permission:users.update')->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete')->name('users.destroy');
    Route::patch('/users/{user}/status', [UserController::class, 'status'])->middleware('permission:users.activate')->name('users.status');
    Route::patch('/users/{user}/password', [UserController::class, 'password'])->middleware('permission:users.reset-password')->name('users.password');
    Route::put('/users/{user}/employee-account', [UserController::class, 'updateEmployeeAccount'])->middleware('permission:users.link-employees')->name('users.employee-account.update');
    Route::delete('/users/{user}/employee-account', [UserController::class, 'destroyEmployeeAccount'])->middleware('permission:users.link-employees')->name('users.employee-account.destroy');
    Route::get('/users/{user}/profile', [UserController::class, 'profile'])->name('users.profile');
});
