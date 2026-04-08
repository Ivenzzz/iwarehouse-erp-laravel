<?php

namespace App\Features\Warehouses\Http\Controllers;

use App\Features\Warehouses\Actions\ExportWarehousesCsv;
use App\Features\Warehouses\Actions\ImportWarehousesFromCsv;
use App\Features\Warehouses\Actions\SaveWarehouse;
use App\Features\Warehouses\Http\Requests\ImportWarehousesRequest;
use App\Features\Warehouses\Http\Requests\SaveWarehouseRequest;
use App\Features\Warehouses\Queries\ListWarehouses;
use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WarehouseController extends Controller
{
    public function index(Request $request, ListWarehouses $listWarehouses): InertiaResponse
    {
        return Inertia::render('Warehouses', $listWarehouses($request));
    }

    public function store(SaveWarehouseRequest $request, SaveWarehouse $saveWarehouse): RedirectResponse
    {
        $saveWarehouse->handle($request->payload());

        return redirect()->route('warehouses.index');
    }

    public function update(
        SaveWarehouseRequest $request,
        Warehouse $warehouse,
        SaveWarehouse $saveWarehouse,
    ): RedirectResponse {
        $saveWarehouse->handle($request->payload(), $warehouse);

        return redirect()->route('warehouses.index');
    }

    public function destroy(Warehouse $warehouse): RedirectResponse
    {
        try {
            $warehouse->delete();
        } catch (QueryException) {
            return redirect()
                ->route('warehouses.index')
                ->withErrors([
                    'warehouse' => 'This warehouse cannot be deleted because it is referenced by inventory items.',
                ]);
        }

        return redirect()->route('warehouses.index');
    }

    public function import(
        ImportWarehousesRequest $request,
        ImportWarehousesFromCsv $importWarehousesFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('warehouses.index')
            ->with('success', $importWarehousesFromCsv->handle($request->csvFile()));
    }

    public function export(ExportWarehousesCsv $exportWarehousesCsv): StreamedResponse
    {
        return $exportWarehousesCsv->handle();
    }
}
