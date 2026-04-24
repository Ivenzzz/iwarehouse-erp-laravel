<?php

use App\Features\SalesProfitTracker\Http\Controllers\SalesProfitTrackerController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/sales-profit-tracker', [SalesProfitTrackerController::class, 'index'])->name('sales-profit-tracker.index');
    Route::get('/sales-profit-tracker/export/csv', [SalesProfitTrackerController::class, 'exportCsv'])->name('sales-profit-tracker.export.csv');
});
