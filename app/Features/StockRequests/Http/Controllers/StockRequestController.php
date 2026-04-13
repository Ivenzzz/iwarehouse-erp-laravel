<?php

namespace App\Features\StockRequests\Http\Controllers;

use App\Features\StockRequests\Actions\CreateStockRequest;
use App\Features\StockRequests\Actions\ExportStockRequestsCsv;
use App\Features\StockRequests\Queries\ListStockRequestCatalog;
use App\Features\StockRequests\Queries\ListStockRequestPageData;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockRequestController extends Controller
{
    public function index(Request $request, ListStockRequestPageData $listStockRequestPageData): InertiaResponse
    {
        return Inertia::render('StockRequests', $listStockRequestPageData($request));
    }

    public function store(Request $request, CreateStockRequest $createStockRequest): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'required_at' => ['required', 'date'],
            'purpose' => ['required', 'string', 'in:'.implode(',', \App\Models\StockRequest::PURPOSES)],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.reason' => ['nullable', 'string', 'max:255'],
        ]);

        $created = $createStockRequest->handle($validated, $request->user()?->id);

        return response()->json(['request' => $created]);
    }

    public function export(Request $request, ExportStockRequestsCsv $exportStockRequestsCsv): StreamedResponse
    {
        return $exportStockRequestsCsv->handle($request);
    }

    public function catalog(Request $request, ListStockRequestCatalog $listStockRequestCatalog): JsonResponse
    {
        return response()->json($listStockRequestCatalog($request));
    }
}
