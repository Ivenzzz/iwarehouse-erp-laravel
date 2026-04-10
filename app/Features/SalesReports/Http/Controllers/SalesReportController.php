<?php

namespace App\Features\SalesReports\Http\Controllers;

use App\Features\Pos\Actions\ClosePosSession;
use App\Features\SalesReports\Actions\ExportConsolidatedSalesReportXlsx;
use App\Features\SalesReports\Queries\ListSalesReportPageData;
use App\Features\SalesReports\Support\SalesReportQuery;
use App\Http\Controllers\Controller;
use App\Models\PosSession;
use App\Models\SalesTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesReportController extends Controller
{
    public function index(Request $request, ListSalesReportPageData $listSalesReportPageData): InertiaResponse
    {
        return Inertia::render('SalesReport', $listSalesReportPageData($request));
    }

    public function individual(Request $request, SalesReportQuery $salesReportQuery): JsonResponse
    {
        $filters = $salesReportQuery->filtersFromRequest($request);

        return response()->json([
            'rows' => $salesReportQuery->individualRows($filters),
        ]);
    }

    public function individualDetail(PosSession $posSession, SalesReportQuery $salesReportQuery): JsonResponse
    {
        return response()->json($salesReportQuery->sessionDetail($posSession));
    }

    public function closeIndividualSession(
        PosSession $posSession,
        SalesReportQuery $salesReportQuery,
        ClosePosSession $closePosSession,
    ): JsonResponse {
        if ($posSession->status !== PosSession::STATUS_CLOSED) {
            $closePosSession->handle(
                $posSession,
                $salesReportQuery->estimatedClosingBalance($posSession),
                $posSession->cashier_remarks,
            );
        }

        return response()->json([
            'session' => $salesReportQuery->sessionDetail($posSession->fresh())['session'],
        ]);
    }

    public function consolidated(Request $request, SalesReportQuery $salesReportQuery): JsonResponse
    {
        $filters = $salesReportQuery->filtersFromRequest($request);

        return response()->json([
            'rows' => $salesReportQuery->consolidatedRows($filters),
        ]);
    }

    public function consolidatedDetail(Request $request, SalesReportQuery $salesReportQuery): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
        ]);

        return response()->json(
            $salesReportQuery->consolidatedDetail($validated['date'], (int) $validated['warehouse_id'])
        );
    }

    public function exportConsolidatedXlsx(
        Request $request,
        ExportConsolidatedSalesReportXlsx $exportConsolidatedSalesReportXlsx,
    ): StreamedResponse {
        return $exportConsolidatedSalesReportXlsx->handle($request);
    }

    public function calendar(Request $request, SalesReportQuery $salesReportQuery): JsonResponse
    {
        $filters = $salesReportQuery->filtersFromRequest($request);

        return response()->json($salesReportQuery->calendar($filters));
    }

    public function transaction(SalesTransaction $transaction, SalesReportQuery $salesReportQuery): JsonResponse
    {
        return response()->json([
            'transaction' => $salesReportQuery->transactionDetail($transaction),
        ]);
    }
}
