<?php

namespace App\Features\SalesProfitTracker\Http\Controllers;

use App\Features\SalesProfitTracker\Actions\ExportSalesProfitTrackerCsv;
use App\Features\SalesProfitTracker\Queries\ListSalesProfitTrackerPageData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesProfitTrackerController extends Controller
{
    public function index(Request $request, ListSalesProfitTrackerPageData $listSalesProfitTrackerPageData): InertiaResponse
    {
        return Inertia::render('SalesProfitTracker', $listSalesProfitTrackerPageData($request));
    }

    public function exportCsv(Request $request, ExportSalesProfitTrackerCsv $exportSalesProfitTrackerCsv): StreamedResponse
    {
        return $exportSalesProfitTrackerCsv->handle($request);
    }
}
