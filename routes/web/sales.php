<?php

use App\Features\Sales\Http\Controllers\SalesController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/sales', [SalesController::class, 'index'])->name('sales.index');
    Route::get('/sales/transactions/{transaction}', [SalesController::class, 'show'])->name('sales.show');
    Route::get('/sales/export/xlsx', [SalesController::class, 'exportXlsx'])->name('sales.export.xlsx');
});
