<?php

use App\Features\PaymentMethods\Http\Controllers\PaymentMethodController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/payment-methods', [PaymentMethodController::class, 'index'])->name('payment-methods.index');
    Route::post('/payment-methods', [PaymentMethodController::class, 'store'])->name('payment-methods.store');
    Route::match(['put', 'patch'], '/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
    Route::delete('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy'])->name('payment-methods.destroy');
    Route::post('/payment-methods/import', [PaymentMethodController::class, 'import'])->name('payment-methods.import');
    Route::get('/payment-methods/export', [PaymentMethodController::class, 'export'])->name('payment-methods.export');
});
