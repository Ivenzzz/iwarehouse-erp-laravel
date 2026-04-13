<?php

namespace App\Features\StockRequestApprovals\Http\Controllers;

use App\Features\StockRequestApprovals\Actions\ApproveStockRequestsBatch;
use App\Features\StockRequestApprovals\Actions\BuildBatchAllocationData;
use App\Features\StockRequestApprovals\Actions\DeclineStockRequestsBatch;
use App\Features\StockRequestApprovals\Actions\ExportStockRequestApprovalsCsv;
use App\Features\StockRequestApprovals\Queries\ListStockRequestApprovalPageData;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockRequestApprovalController extends Controller
{
    public function index(Request $request, ListStockRequestApprovalPageData $query): InertiaResponse
    {
        return Inertia::render('StockRequestApprovals', $query($request));
    }

    public function batchAllocation(Request $request, BuildBatchAllocationData $buildBatchAllocationData): JsonResponse
    {
        $validated = $request->validate([
            'stock_request_ids' => ['required', 'array', 'min:1'],
            'stock_request_ids.*' => ['required', 'integer', 'exists:stock_requests,id'],
        ]);

        return response()->json(
            $buildBatchAllocationData->handle(array_map('intval', $validated['stock_request_ids'])),
        );
    }

    public function batchApprove(Request $request, ApproveStockRequestsBatch $approveStockRequestsBatch): JsonResponse
    {
        $validated = $request->validate([
            'allocations' => ['required', 'array', 'min:1'],
            'allocations.*.srId' => ['required', 'integer', 'exists:stock_requests,id'],
            'allocations.*.stockRequestItemId' => ['required', 'integer', 'exists:stock_request_items,id'],
            'allocations.*.branchId' => ['required', 'integer', 'exists:warehouses,id'],
            'allocations.*.variantId' => ['required', 'integer', 'exists:product_variants,id'],
            'allocations.*.approvedQty' => ['required', 'integer', 'min:0'],
            'allocations.*.transferQty' => ['required', 'integer', 'min:0'],
            'allocations.*.rfqQty' => ['required', 'integer', 'min:0'],
        ]);

        $approveStockRequestsBatch->handle($validated['allocations'], $request->user()?->id);

        return response()->json(['ok' => true]);
    }

    public function batchDecline(Request $request, DeclineStockRequestsBatch $declineStockRequestsBatch): JsonResponse
    {
        $validated = $request->validate([
            'stock_request_ids' => ['required', 'array', 'min:1'],
            'stock_request_ids.*' => ['required', 'integer', 'exists:stock_requests,id'],
        ]);

        $declineStockRequestsBatch->handle(array_map('intval', $validated['stock_request_ids']), $request->user()?->id);

        return response()->json(['ok' => true]);
    }

    public function export(Request $request, ExportStockRequestApprovalsCsv $exportStockRequestApprovalsCsv): StreamedResponse
    {
        return $exportStockRequestApprovalsCsv->handle($request);
    }
}
