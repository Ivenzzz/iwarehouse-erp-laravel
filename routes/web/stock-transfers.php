<?php

use App\Features\StockTransfers\Http\Controllers\StockTransferController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/stock-transfers', [StockTransferController::class, 'index'])->name('stock-transfers.index');
    Route::get('/stock-transfers/search-products', [StockTransferController::class, 'searchProducts'])->name('stock-transfers.search-products');
    Route::get('/stock-transfers/variant-inventory', [StockTransferController::class, 'variantInventory'])->name('stock-transfers.variant-inventory');
    Route::get('/stock-transfers/lookup-inventory-item', [StockTransferController::class, 'lookupInventoryItem'])->name('stock-transfers.lookup-inventory-item');
    Route::post('/stock-transfers', [StockTransferController::class, 'store'])->name('stock-transfers.store');
    Route::post('/stock-transfers/old-method', [StockTransferController::class, 'storeOldMethod'])->name('stock-transfers.store-old-method');
    Route::post('/stock-transfers/{stockTransfer}/pick', [StockTransferController::class, 'pick'])->name('stock-transfers.pick');
    Route::post('/stock-transfers/{stockTransfer}/ship', [StockTransferController::class, 'ship'])->name('stock-transfers.ship');
    Route::post('/stock-transfers/{stockTransfer}/receive', [StockTransferController::class, 'receive'])->name('stock-transfers.receive');
    Route::delete('/stock-transfers/{stockTransfer}', [StockTransferController::class, 'destroy'])->name('stock-transfers.destroy');
    Route::post('/stock-transfers/consolidate', [StockTransferController::class, 'consolidate'])->name('stock-transfers.consolidate');
    Route::post('/stock-transfers/upload-proof', [StockTransferController::class, 'uploadProof'])->name('stock-transfers.upload-proof');
});
