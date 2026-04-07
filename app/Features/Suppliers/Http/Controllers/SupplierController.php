<?php

namespace App\Features\Suppliers\Http\Controllers;

use App\Features\Suppliers\Actions\ExportSuppliersCsv;
use App\Features\Suppliers\Actions\ImportSuppliersFromCsv;
use App\Features\Suppliers\Actions\SaveSupplier;
use App\Features\Suppliers\Http\Requests\ImportSuppliersRequest;
use App\Features\Suppliers\Http\Requests\SaveSupplierRequest;
use App\Features\Suppliers\Queries\ListSuppliers;
use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupplierController extends Controller
{
    public function index(Request $request, ListSuppliers $listSuppliers): InertiaResponse
    {
        return Inertia::render('Suppliers', $listSuppliers($request));
    }

    public function store(SaveSupplierRequest $request, SaveSupplier $saveSupplier): RedirectResponse
    {
        $saveSupplier->handle($request->payload());

        return redirect()->route('suppliers.index');
    }

    public function update(
        SaveSupplierRequest $request,
        Supplier $supplier,
        SaveSupplier $saveSupplier,
    ): RedirectResponse {
        $saveSupplier->handle($request->payload(), $supplier);

        return redirect()->route('suppliers.index');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return redirect()->route('suppliers.index');
    }

    public function import(
        ImportSuppliersRequest $request,
        ImportSuppliersFromCsv $importSuppliersFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('suppliers.index')
            ->with('success', $importSuppliersFromCsv->handle($request->csvFile()));
    }

    public function export(ExportSuppliersCsv $exportSuppliersCsv): StreamedResponse
    {
        return $exportSuppliersCsv->handle();
    }
}
