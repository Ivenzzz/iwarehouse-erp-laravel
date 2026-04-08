<?php

use App\Features\Warehouses\Http\Controllers\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/warehouses', [WarehouseController::class, 'index'])->name('warehouses.index');
    Route::post('/warehouses', [WarehouseController::class, 'store'])->name('warehouses.store');
    Route::match(['put', 'patch'], '/warehouses/{warehouse}', [WarehouseController::class, 'update'])->name('warehouses.update');
    Route::delete('/warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->name('warehouses.destroy');
    Route::post('/warehouses/import', [WarehouseController::class, 'import'])->name('warehouses.import');
    Route::get('/warehouses/export', [WarehouseController::class, 'export'])->name('warehouses.export');
});
