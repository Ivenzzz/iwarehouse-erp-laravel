<?php

use App\Features\Inventory\Http\Controllers\InventoryController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('/inventory/kpis', [InventoryController::class, 'kpis'])->name('inventory.kpis');
    Route::get('/inventory/exact-lookup', [InventoryController::class, 'exactLookup'])->name('inventory.exact-lookup');
    Route::get('/inventory/variant-options', [InventoryController::class, 'variantOptions'])->name('inventory.variant-options');
    Route::get('/inventory/{inventoryItem}/logs', [InventoryController::class, 'logs'])->name('inventory.logs');
    Route::post('/inventory/import/validate', [InventoryController::class, 'validateImport'])->name('inventory.import.validate');
    Route::post('/inventory/import', [InventoryController::class, 'import'])->name('inventory.import');
    Route::post('/inventory/batch/warehouse', [InventoryController::class, 'batchWarehouse'])->name('inventory.batch.warehouse');
    Route::post('/inventory/batch/update', [InventoryController::class, 'batchUpdate'])->name('inventory.batch.update');
    Route::delete('/inventory/batch', [InventoryController::class, 'batchDelete'])->name('inventory.batch.delete');
    Route::get('/inventory/export', [InventoryController::class, 'export'])->name('inventory.export');
});
