<?php

use App\Features\ProductMasters\Http\Controllers\ProductMasterController;
use App\Features\ProductMasters\Http\Controllers\ProductVariantController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/product-masters', [ProductMasterController::class, 'index'])->name('product-masters.index');
    Route::post('/product-masters', [ProductMasterController::class, 'store'])->name('product-masters.store');
    Route::match(['put', 'patch'], '/product-masters/{productMaster}', [ProductMasterController::class, 'update'])->name('product-masters.update');
    Route::delete('/product-masters/{productMaster}', [ProductMasterController::class, 'destroy'])->name('product-masters.destroy');
    Route::post('/product-masters/import', [ProductMasterController::class, 'import'])->name('product-masters.import');
    Route::get('/product-masters/export', [ProductMasterController::class, 'export'])->name('product-masters.export');
    Route::get('/product-masters/{productMaster}/variants', [ProductVariantController::class, 'index'])->name('product-masters.variants.index');
    Route::post('/product-masters/{productMaster}/variants/generate', [ProductVariantController::class, 'generate'])->name('product-masters.variants.generate');
    Route::match(['put', 'patch'], '/product-masters/{productMaster}/variants/{productVariant}', [ProductVariantController::class, 'update'])->name('product-masters.variants.update');
    Route::delete('/product-masters/{productMaster}/variants/{productVariant}', [ProductVariantController::class, 'destroy'])->name('product-masters.variants.destroy');
});
