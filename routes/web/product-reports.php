<?php

use App\Features\ProductReports\Http\Controllers\ProductReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/product-reports', [ProductReportController::class, 'index'])->name('product-reports.index');
    Route::get('/product-reports/export/csv', [ProductReportController::class, 'exportCsv'])->name('product-reports.export.csv');
    Route::get('/product-reports/export/xlsx', [ProductReportController::class, 'exportXlsx'])->name('product-reports.export.xlsx');
});
