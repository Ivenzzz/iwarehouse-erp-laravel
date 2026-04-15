<?php

use App\Features\GoodsReceipts\Http\Controllers\GoodsReceiptController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/goods-receipts', [GoodsReceiptController::class, 'index'])->name('goods-receipts.index');
    Route::get('/goods-receipts/data', [GoodsReceiptController::class, 'data'])->name('goods-receipts.data');
    Route::get('/goods-receipts/catalog', [GoodsReceiptController::class, 'catalog'])->name('goods-receipts.catalog');
    Route::post('/goods-receipts', [GoodsReceiptController::class, 'store'])->name('goods-receipts.store');
    Route::post('/goods-receipts/validate-duplicates', [GoodsReceiptController::class, 'validateDuplicates'])->name('goods-receipts.validate-duplicates');
    Route::patch('/goods-receipts/delivery-receipts/{deliveryReceipt}/complete', [GoodsReceiptController::class, 'markDeliveryReceiptComplete'])->name('goods-receipts.mark-dr-complete');
    Route::post('/goods-receipts/purchase-import/validate-csv', [GoodsReceiptController::class, 'validatePurchaseCsv'])->name('goods-receipts.purchase-import.validate-csv');
    Route::post('/goods-receipts/purchase-import/resolve-conflicts', [GoodsReceiptController::class, 'resolvePurchaseBrandConflicts'])->name('goods-receipts.purchase-import.resolve-conflicts');
    Route::post('/goods-receipts/purchase-import/execute', [GoodsReceiptController::class, 'executeDirectPurchase'])->name('goods-receipts.purchase-import.execute');
    Route::post('/goods-receipts/uploads', [GoodsReceiptController::class, 'upload'])->name('goods-receipts.upload');
    Route::get('/goods-receipts/export', [GoodsReceiptController::class, 'export'])->name('goods-receipts.export');
    Route::get('/goods-receipts/{goodsReceipt}', [GoodsReceiptController::class, 'show'])->name('goods-receipts.show');
});
