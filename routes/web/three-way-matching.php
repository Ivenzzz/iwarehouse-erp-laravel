<?php

use App\Features\ThreeWayMatching\Http\Controllers\ThreeWayMatchingController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/three-way-matching', [ThreeWayMatchingController::class, 'index'])->name('three-way-matching.index');
    Route::get('/three-way-matching/export/csv', [ThreeWayMatchingController::class, 'exportCsv'])->name('three-way-matching.export.csv');
    Route::post('/three-way-matching/{purchaseOrder}/mark-paid', [ThreeWayMatchingController::class, 'markPaid'])->name('three-way-matching.mark-paid');
});
