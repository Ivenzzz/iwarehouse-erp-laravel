<?php

use App\Features\PlacementReports\Http\Controllers\PlacementReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/placement-reports', [PlacementReportController::class, 'index'])->name('placement-reports.index');
    Route::get('/placement-reports/rows', [PlacementReportController::class, 'rows'])->name('placement-reports.rows');
    Route::get('/placement-reports/items', [PlacementReportController::class, 'items'])->name('placement-reports.items');
    Route::get('/placement-reports/export/csv', [PlacementReportController::class, 'exportCsv'])->name('placement-reports.export.csv');
    Route::get('/placement-reports/export/xlsx', [PlacementReportController::class, 'exportXlsx'])->name('placement-reports.export.xlsx');
    Route::get('/placement-reports/{productMaster}/variants', [PlacementReportController::class, 'variants'])->name('placement-reports.variants');
});
