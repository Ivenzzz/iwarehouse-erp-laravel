<?php

use App\Features\Suppliers\Http\Controllers\SupplierController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers.index');
    Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
    Route::match(['put', 'patch'], '/suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');
    Route::post('/suppliers/import', [SupplierController::class, 'import'])->name('suppliers.import');
    Route::get('/suppliers/export', [SupplierController::class, 'export'])->name('suppliers.export');
});
