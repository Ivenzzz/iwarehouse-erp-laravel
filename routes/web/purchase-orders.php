<?php

use App\Features\PurchaseOrders\Http\Controllers\PurchaseOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store');
    Route::put('/purchase-orders/{purchaseOrderId}', [PurchaseOrderController::class, 'update'])->name('purchase-orders.update');
    Route::post('/purchase-orders/approve', [PurchaseOrderController::class, 'approve'])->name('purchase-orders.approve');
    Route::post('/purchase-orders/reject', [PurchaseOrderController::class, 'reject'])->name('purchase-orders.reject');
    Route::get('/purchase-orders/export', [PurchaseOrderController::class, 'export'])->name('purchase-orders.export');
    Route::get('/purchase-orders/product-options', [PurchaseOrderController::class, 'productOptions'])->name('purchase-orders.product-options');
});

