<?php

namespace App\Features\ProductMasters\Http\Controllers;

use App\Features\ProductMasters\Actions\DeleteProductMaster;
use App\Features\ProductMasters\Actions\ExportProductMastersCsv;
use App\Features\ProductMasters\Actions\ImportProductMastersFromCsv;
use App\Features\ProductMasters\Actions\SaveProductMaster;
use App\Features\ProductMasters\Http\Requests\ImportProductMastersRequest;
use App\Features\ProductMasters\Http\Requests\SaveProductMasterRequest;
use App\Features\ProductMasters\Queries\ListProductMasters;
use App\Http\Controllers\Controller;
use App\Models\ProductMaster;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductMasterController extends Controller
{
    public function index(Request $request, ListProductMasters $listProductMasters): InertiaResponse
    {
        return Inertia::render('ProductMasters', $listProductMasters($request));
    }

    public function store(SaveProductMasterRequest $request, SaveProductMaster $saveProductMaster): RedirectResponse
    {
        $saveProductMaster->handle($request->payload(), $request->imageFile());

        return redirect()->route('product-masters.index');
    }

    public function update(
        SaveProductMasterRequest $request,
        ProductMaster $productMaster,
        SaveProductMaster $saveProductMaster,
    ): RedirectResponse {
        $saveProductMaster->handle($request->payload(), $request->imageFile(), $productMaster);

        return redirect()->route('product-masters.index');
    }

    public function destroy(ProductMaster $productMaster, DeleteProductMaster $deleteProductMaster): RedirectResponse
    {
        $deleteProductMaster->handle($productMaster);

        return redirect()->route('product-masters.index');
    }

    public function import(
        ImportProductMastersRequest $request,
        ImportProductMastersFromCsv $importProductMastersFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('product-masters.index')
            ->with('success', $importProductMastersFromCsv->handle($request->csvFile()));
    }

    public function export(ExportProductMastersCsv $exportProductMastersCsv): StreamedResponse
    {
        return $exportProductMastersCsv->handle();
    }
}
