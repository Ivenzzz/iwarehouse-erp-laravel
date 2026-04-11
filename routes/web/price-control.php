<?php

use App\Features\PriceControl\Http\Controllers\PriceControlController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/price-control', [PriceControlController::class, 'index'])->name('price-control.index');
    Route::get('/price-control/variants', [PriceControlController::class, 'variants'])->name('price-control.variants');
    Route::post('/price-control/preview', [PriceControlController::class, 'preview'])->name('price-control.preview');
    Route::patch('/price-control/prices', [PriceControlController::class, 'update'])->name('price-control.prices');
    Route::get('/price-control/export', [PriceControlController::class, 'export'])->name('price-control.export');
});
