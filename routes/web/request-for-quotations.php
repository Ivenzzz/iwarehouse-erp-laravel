<?php

use App\Features\RequestForQuotations\Http\Controllers\RequestForQuotationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/request-for-quotations', [RequestForQuotationController::class, 'index'])->name('request-for-quotations.index');
    Route::post('/request-for-quotations/create-from-approval', [RequestForQuotationController::class, 'storeFromStockRequestApproval'])->name('request-for-quotations.create-from-approval');
    Route::post('/request-for-quotations/add-supplier-quote', [RequestForQuotationController::class, 'addSupplierQuote'])->name('request-for-quotations.add-supplier-quote');
    Route::post('/request-for-quotations/award', [RequestForQuotationController::class, 'award'])->name('request-for-quotations.award');
    Route::post('/request-for-quotations/consolidate', [RequestForQuotationController::class, 'consolidate'])->name('request-for-quotations.consolidate');
    Route::get('/request-for-quotations/export', [RequestForQuotationController::class, 'export'])->name('request-for-quotations.export');
});
