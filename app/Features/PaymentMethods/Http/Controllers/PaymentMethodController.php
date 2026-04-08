<?php

namespace App\Features\PaymentMethods\Http\Controllers;

use App\Features\PaymentMethods\Actions\ExportPaymentMethodsCsv;
use App\Features\PaymentMethods\Actions\ImportPaymentMethodsFromCsv;
use App\Features\PaymentMethods\Actions\SavePaymentMethod;
use App\Features\PaymentMethods\Http\Requests\ImportPaymentMethodsRequest;
use App\Features\PaymentMethods\Http\Requests\SavePaymentMethodRequest;
use App\Features\PaymentMethods\Queries\ListPaymentMethods;
use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PaymentMethodController extends Controller
{
    public function index(Request $request, ListPaymentMethods $listPaymentMethods): InertiaResponse
    {
        return Inertia::render('PaymentMethods', $listPaymentMethods($request));
    }

    public function store(SavePaymentMethodRequest $request, SavePaymentMethod $savePaymentMethod): RedirectResponse
    {
        $savePaymentMethod->handle($request->payload());

        return redirect()->route('payment-methods.index');
    }

    public function update(
        SavePaymentMethodRequest $request,
        PaymentMethod $paymentMethod,
        SavePaymentMethod $savePaymentMethod,
    ): RedirectResponse {
        $savePaymentMethod->handle($request->payload(), $paymentMethod);

        return redirect()->route('payment-methods.index');
    }

    public function destroy(PaymentMethod $paymentMethod): RedirectResponse
    {
        $paymentMethod->delete();

        return redirect()->route('payment-methods.index');
    }

    public function import(
        ImportPaymentMethodsRequest $request,
        ImportPaymentMethodsFromCsv $importPaymentMethodsFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('payment-methods.index')
            ->with('success', $importPaymentMethodsFromCsv->handle($request->csvFile()));
    }

    public function export(ExportPaymentMethodsCsv $exportPaymentMethodsCsv): StreamedResponse
    {
        return $exportPaymentMethodsCsv->handle();
    }
}
