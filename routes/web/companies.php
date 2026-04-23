<?php

use App\Features\CompanyInfo\Http\Controllers\CompanyInfoController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'permission:companies.view'])->prefix('settings')->name('settings.')->group(function () {
    Route::get('/companies', [CompanyInfoController::class, 'index'])->name('companies.index');
    Route::match(['put', 'patch'], '/companies', [CompanyInfoController::class, 'update'])
        ->middleware('permission:companies.update')
        ->name('companies.update');
});

