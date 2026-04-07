<?php

use App\Features\Categories\Http\Controllers\ProductCategoryController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/categories', [ProductCategoryController::class, 'index'])->name('categories.index');
    Route::post('/categories', [ProductCategoryController::class, 'store'])->name('categories.store');
    Route::match(['put', 'patch'], '/categories/{productCategory}', [ProductCategoryController::class, 'update'])->name('categories.update');
    Route::delete('/categories/{productCategory}', [ProductCategoryController::class, 'destroy'])->name('categories.destroy');
    Route::post('/categories/import', [ProductCategoryController::class, 'import'])->name('categories.import');
    Route::get('/categories/export', [ProductCategoryController::class, 'export'])->name('categories.export');
});
