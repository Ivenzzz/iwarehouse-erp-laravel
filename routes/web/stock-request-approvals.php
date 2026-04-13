<?php

use App\Features\StockRequestApprovals\Http\Controllers\StockRequestApprovalController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/stock-request-approvals', [StockRequestApprovalController::class, 'index'])->name('stock-request-approvals.index');
    Route::post('/stock-request-approvals/batch-allocation', [StockRequestApprovalController::class, 'batchAllocation'])->name('stock-request-approvals.batch-allocation');
    Route::post('/stock-request-approvals/batch-approve', [StockRequestApprovalController::class, 'batchApprove'])->name('stock-request-approvals.batch-approve');
    Route::post('/stock-request-approvals/batch-decline', [StockRequestApprovalController::class, 'batchDecline'])->name('stock-request-approvals.batch-decline');
    Route::get('/stock-request-approvals/export', [StockRequestApprovalController::class, 'export'])->name('stock-request-approvals.export');
});
