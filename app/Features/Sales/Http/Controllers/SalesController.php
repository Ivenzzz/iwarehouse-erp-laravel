<?php

namespace App\Features\Sales\Http\Controllers;

use App\Features\Sales\Actions\ExportSalesXlsx;
use App\Features\Sales\Queries\ListSalesPageData;
use App\Features\Sales\Support\SalesQuery;
use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesController extends Controller
{
    public function index(Request $request, ListSalesPageData $listSalesPageData): InertiaResponse
    {
        return Inertia::render('Sales', $listSalesPageData($request));
    }

    public function show(SalesTransaction $transaction, SalesQuery $salesQuery): JsonResponse
    {
        return response()->json([
            'transaction' => $salesQuery->transactionDetail($transaction),
        ]);
    }

    public function exportXlsx(Request $request, ExportSalesXlsx $exportSalesXlsx): StreamedResponse
    {
        return $exportSalesXlsx->handle($request);
    }
}
