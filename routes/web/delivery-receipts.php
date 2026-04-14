<?php

use App\Features\DeliveryReceipts\Http\Controllers\DeliveryReceiptController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/delivery-receipts', [DeliveryReceiptController::class, 'index'])->name('delivery-receipts.index');
    Route::post('/delivery-receipts', [DeliveryReceiptController::class, 'store'])->name('delivery-receipts.store');
    Route::get('/delivery-receipts/export', [DeliveryReceiptController::class, 'export'])->name('delivery-receipts.export');
    Route::get('/delivery-receipts/{deliveryReceipt}/history', [DeliveryReceiptController::class, 'history'])->name('delivery-receipts.history');
});
