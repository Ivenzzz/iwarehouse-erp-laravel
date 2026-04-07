<?php

namespace App\Features\Brands\Http\Controllers;

use App\Features\Brands\Actions\ExportBrandsCsv;
use App\Features\Brands\Actions\ImportBrandsFromCsv;
use App\Features\Brands\Actions\SaveBrand;
use App\Features\Brands\Http\Requests\ImportBrandsRequest;
use App\Features\Brands\Http\Requests\SaveBrandRequest;
use App\Features\Brands\Queries\ListBrands;
use App\Http\Controllers\Controller;
use App\Models\ProductBrand;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductBrandController extends Controller
{
    public function index(Request $request, ListBrands $listBrands): InertiaResponse
    {
        return Inertia::render('Brands', $listBrands($request));
    }

    public function store(SaveBrandRequest $request, SaveBrand $saveBrand): RedirectResponse
    {
        $saveBrand->handle($request->payload());

        return redirect()->route('brands.index');
    }

    public function update(
        SaveBrandRequest $request,
        ProductBrand $productBrand,
        SaveBrand $saveBrand,
    ): RedirectResponse {
        $saveBrand->handle($request->payload(), $productBrand);

        return redirect()->route('brands.index');
    }

    public function destroy(ProductBrand $productBrand): RedirectResponse
    {
        $productBrand->delete();

        return redirect()->route('brands.index');
    }

    public function import(
        ImportBrandsRequest $request,
        ImportBrandsFromCsv $importBrandsFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('brands.index')
            ->with('success', $importBrandsFromCsv->handle($request->csvFile()));
    }

    public function export(ExportBrandsCsv $exportBrandsCsv): StreamedResponse
    {
        return $exportBrandsCsv->handle();
    }
}
