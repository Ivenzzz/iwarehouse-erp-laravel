<?php

namespace App\Features\Sales\Http\Controllers;

use App\Features\Sales\Actions\ExportSalesXlsx;
use App\Features\Sales\Actions\ImportPosSessionsFromCsv;
use App\Features\Sales\Actions\ImportSalesTransactionsFromCsv;
use App\Features\Sales\Http\Requests\ImportPosSessionsRequest;
use App\Features\Sales\Http\Requests\ImportSalesTransactionsRequest;
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

    public function importPosSessions(
        ImportPosSessionsRequest $request,
        ImportPosSessionsFromCsv $importPosSessionsFromCsv,
    ): \Illuminate\Http\RedirectResponse {
        $summary = $importPosSessionsFromCsv->handle($request->csvFile(), (int) $request->user()->id);
        $changedRows = (int) ($summary['created'] ?? 0) + (int) ($summary['updated'] ?? 0);
        $firstError = $summary['error_rows'][0] ?? null;

        if ($changedRows === 0 && (int) ($summary['errors'] ?? 0) > 0) {
            $errorMessage = (string) ($summary['message'] ?? 'POS sessions import failed.');
            if (is_string($firstError) && $firstError !== '') {
                $errorMessage .= ' '.$firstError;
            }

            return redirect()
                ->route('sales.index', $request->query())
                ->with('error', $errorMessage)
                ->with('import_summary', $summary);
        }

        return redirect()
            ->route('sales.index', $request->query())
            ->with('success', $summary['message'])
            ->with('import_summary', $summary);
    }

    public function importTransactions(
        ImportSalesTransactionsRequest $request,
        ImportSalesTransactionsFromCsv $importSalesTransactionsFromCsv,
    ): \Illuminate\Http\RedirectResponse {
        $summary = $importSalesTransactionsFromCsv->handle($request->csvFile());
        $changedRows = (int) ($summary['created'] ?? 0) + (int) ($summary['updated'] ?? 0);
        $firstError = $summary['error_rows'][0] ?? null;

        if ($changedRows === 0 && (int) ($summary['errors'] ?? 0) > 0) {
            $errorMessage = (string) ($summary['message'] ?? 'Sales transactions import failed.');
            if (is_string($firstError) && $firstError !== '') {
                $errorMessage .= ' '.$firstError;
            }

            return redirect()
                ->route('sales.index', $request->query())
                ->with('error', $errorMessage)
                ->with('import_summary', $summary);
        }

        return redirect()
            ->route('sales.index', $request->query())
            ->with('success', $summary['message'])
            ->with('import_summary', $summary);
    }
}
