<?php

namespace App\Features\PlacementReports\Http\Controllers;

use App\Features\PlacementReports\Actions\ExportPlacementReportCsv;
use App\Features\PlacementReports\Actions\ExportPlacementReportXlsx;
use App\Features\PlacementReports\Queries\ListPlacementReportPageData;
use App\Features\PlacementReports\Support\PlacementReportQuery;
use App\Http\Controllers\Controller;
use App\Models\ProductMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlacementReportController extends Controller
{
    public function index(Request $request, ListPlacementReportPageData $listPlacementReportPageData): InertiaResponse
    {
        return Inertia::render('PlacementReports', $listPlacementReportPageData($request));
    }

    public function rows(Request $request, PlacementReportQuery $placementReportQuery): JsonResponse
    {
        $filters = $placementReportQuery->filtersFromRequest($request);

        return response()->json($placementReportQuery->masterRowsPage($filters));
    }

    public function variants(
        Request $request,
        ProductMaster $productMaster,
        PlacementReportQuery $placementReportQuery,
    ): JsonResponse {
        $filters = $placementReportQuery->filtersFromRequest($request);

        return response()->json([
            'variants' => $placementReportQuery->variantRows($productMaster->id, $filters),
        ]);
    }

    public function items(Request $request, PlacementReportQuery $placementReportQuery): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id', 'required_without:product_master_id'],
            'product_master_id' => ['nullable', 'integer', 'exists:product_masters,id', 'required_without:variant_id'],
        ]);

        return response()->json(
            $placementReportQuery->itemRows(
                (int) $validated['warehouse_id'],
                isset($validated['variant_id']) ? (int) $validated['variant_id'] : null,
                isset($validated['product_master_id']) ? (int) $validated['product_master_id'] : null,
            ),
        );
    }

    public function exportCsv(Request $request, ExportPlacementReportCsv $exportPlacementReportCsv): StreamedResponse
    {
        return $exportPlacementReportCsv->handle($request);
    }

    public function exportXlsx(Request $request, ExportPlacementReportXlsx $exportPlacementReportXlsx): StreamedResponse
    {
        return $exportPlacementReportXlsx->handle($request);
    }
}
