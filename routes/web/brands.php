<?php

use App\Features\Brands\Http\Controllers\ProductBrandController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/brands', [ProductBrandController::class, 'index'])->name('brands.index');
    Route::post('/brands', [ProductBrandController::class, 'store'])->name('brands.store');
    Route::match(['put', 'patch'], '/brands/{productBrand}', [ProductBrandController::class, 'update'])->name('brands.update');
    Route::delete('/brands/{productBrand}', [ProductBrandController::class, 'destroy'])->name('brands.destroy');
    Route::post('/brands/import', [ProductBrandController::class, 'import'])->name('brands.import');
    Route::get('/brands/export', [ProductBrandController::class, 'export'])->name('brands.export');
});
