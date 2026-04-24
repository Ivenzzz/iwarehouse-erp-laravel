<?php

namespace App\Features\ProductReports\Http\Controllers;

use App\Features\ProductReports\Actions\ExportProductReportsCsv;
use App\Features\ProductReports\Actions\ExportProductReportsXlsx;
use App\Features\ProductReports\Queries\ListProductReportPageData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductReportController extends Controller
{
    public function index(Request $request, ListProductReportPageData $listProductReportPageData): InertiaResponse
    {
        return Inertia::render('ProductReports', $listProductReportPageData($request));
    }

    public function exportCsv(Request $request, ExportProductReportsCsv $exportProductReportsCsv): StreamedResponse
    {
        return $exportProductReportsCsv->handle($request);
    }

    public function exportXlsx(Request $request, ExportProductReportsXlsx $exportProductReportsXlsx): StreamedResponse
    {
        return $exportProductReportsXlsx->handle($request);
    }
}
