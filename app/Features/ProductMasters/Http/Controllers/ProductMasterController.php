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
use Illuminate\Validation\ValidationException;
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
        try {
            $summary = $importProductMastersFromCsv->handle($request->csvFile());

            return redirect()
                ->route('product-masters.index')
                ->with('import_summary', $summary);
        } catch (ValidationException $exception) {
            $errors = collect($exception->errors())
                ->flatten()
                ->map(fn ($message) => trim((string) $message))
                ->filter(fn ($message) => $message !== '')
                ->values()
                ->all();

            $failedRows = collect($errors)
                ->map(function (string $message) {
                    if (preg_match('/^Row\s+(\d+):/i', $message, $matches) === 1) {
                        return (int) $matches[1];
                    }

                    if (preg_match('/^Row\s+(\d+)\s+\[Brand:/i', $message, $matches) === 1) {
                        return (int) $matches[1];
                    }

                    return null;
                })
                ->filter()
                ->unique()
                ->count();

            $failedDetails = collect($errors)
                ->map(function (string $message) {
                    $row = null;
                    $brand = null;
                    $model = null;

                    if (preg_match('/^Row\s+(\d+)/i', $message, $rowMatches) === 1) {
                        $row = (int) $rowMatches[1];
                    }

                    if (preg_match('/\[Brand:\s*(.*?),\s*Model:\s*(.*?)\]/i', $message, $contextMatches) === 1) {
                        $brand = trim((string) $contextMatches[1]);
                        $model = trim((string) $contextMatches[2]);
                    }

                    return [
                        'row' => $row,
                        'brand' => $brand,
                        'model' => $model,
                        'message' => $message,
                    ];
                })
                ->values()
                ->all();

            return redirect()
                ->route('product-masters.index')
                ->withErrors($exception->errors())
                ->with('import_summary', [
                    'status' => 'failed',
                    'total_rows' => 0,
                    'brands_created' => 0,
                    'models_created' => 0,
                    'masters_created' => 0,
                    'masters_reused' => 0,
                    'variants_created' => 0,
                    'variants_skipped' => 0,
                    'failed_rows' => $failedRows,
                    'errors' => $errors,
                    'details' => [
                        'brands_created' => [],
                        'models_created' => [],
                        'variants_created' => [],
                        'variants_skipped' => [],
                        'failed' => $failedDetails,
                    ],
                ]);
        }
    }

    public function export(ExportProductMastersCsv $exportProductMastersCsv): StreamedResponse
    {
        return $exportProductMastersCsv->handle();
    }
}
