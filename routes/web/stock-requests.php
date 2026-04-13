<?php

use App\Features\StockRequests\Http\Controllers\StockRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/stock-requests', [StockRequestController::class, 'index'])->name('stock-requests.index');
    Route::post('/stock-requests', [StockRequestController::class, 'store'])->name('stock-requests.store');
    Route::get('/stock-requests/export', [StockRequestController::class, 'export'])->name('stock-requests.export');
    Route::get('/stock-requests/catalog', [StockRequestController::class, 'catalog'])->name('stock-requests.catalog');
});
