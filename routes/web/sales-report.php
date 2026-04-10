<?php

use App\Features\SalesReports\Http\Controllers\SalesReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/sales-report', [SalesReportController::class, 'index'])->name('sales-report.index');
    Route::get('/sales-report/individual', [SalesReportController::class, 'individual'])->name('sales-report.individual');
    Route::get('/sales-report/individual/{posSession}', [SalesReportController::class, 'individualDetail'])->name('sales-report.individual.detail');
    Route::post('/sales-report/individual/{posSession}/close', [SalesReportController::class, 'closeIndividualSession'])->name('sales-report.individual.close');
    Route::get('/sales-report/consolidated', [SalesReportController::class, 'consolidated'])->name('sales-report.consolidated');
    Route::get('/sales-report/consolidated/detail', [SalesReportController::class, 'consolidatedDetail'])->name('sales-report.consolidated.detail');
    Route::get('/sales-report/consolidated/export/xlsx', [SalesReportController::class, 'exportConsolidatedXlsx'])->name('sales-report.consolidated.export.xlsx');
    Route::get('/sales-report/calendar', [SalesReportController::class, 'calendar'])->name('sales-report.calendar');
    Route::get('/sales-report/transactions/{transaction}', [SalesReportController::class, 'transaction'])->name('sales-report.transaction');
});
