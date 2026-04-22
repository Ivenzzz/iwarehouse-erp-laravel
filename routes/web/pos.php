<?php

use App\Features\Pos\Http\Controllers\PosController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/pos', [PosController::class, 'index'])->name('pos.index');
    Route::get('/pos/inventory-search', [PosController::class, 'inventorySearch'])->name('pos.inventory-search');
    Route::get('/pos/price-check/search', [PosController::class, 'priceCheckSearch'])->name('pos.price-check.search');
    Route::get('/pos/transaction-number-preview', [PosController::class, 'transactionNumberPreview'])->name('pos.transaction-number-preview');
    Route::get('/pos/transactions', [PosController::class, 'transactions'])->name('pos.transactions');
    Route::post('/pos/session', [PosController::class, 'storeSession'])->name('pos.session.store');
    Route::patch('/pos/session/{posSession}/close', [PosController::class, 'closeSession'])->name('pos.session.close');
    Route::post('/pos/customers', [PosController::class, 'storeCustomer'])->name('pos.customers.store');
    Route::post('/pos/sales-reps', [PosController::class, 'storeSalesRep'])->name('pos.sales-reps.store');
    Route::post('/pos/discounts/verify-oic', [PosController::class, 'verifyDiscountOic'])->name('pos.discounts.verify-oic');
    Route::post('/pos/transactions', [PosController::class, 'storeTransaction'])->name('pos.transactions.store');
    Route::post('/pos/uploads', [PosController::class, 'upload'])->name('pos.uploads.store');
});
