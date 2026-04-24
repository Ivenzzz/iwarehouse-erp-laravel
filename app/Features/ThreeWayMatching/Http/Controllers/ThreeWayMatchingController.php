<?php

namespace App\Features\ThreeWayMatching\Http\Controllers;

use App\Features\ThreeWayMatching\Actions\ExportThreeWayMatchingCsv;
use App\Features\ThreeWayMatching\Actions\MarkPurchaseOrderPaid;
use App\Features\ThreeWayMatching\Queries\ListThreeWayMatchingPageData;
use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ThreeWayMatchingController extends Controller
{
    public function index(Request $request, ListThreeWayMatchingPageData $query): InertiaResponse
    {
        return Inertia::render('ThreeWayMatching', $query($request));
    }

    public function exportCsv(Request $request, ExportThreeWayMatchingCsv $action): StreamedResponse
    {
        return $action->handle($request);
    }

    public function markPaid(Request $request, PurchaseOrder $purchaseOrder, MarkPurchaseOrderPaid $action): RedirectResponse
    {
        $validated = $request->validate([
            'invoice_document' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'string', 'in:unpaid,paid'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'selected_match_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $action->handle(
            $purchaseOrder,
            (int) $request->user()->id,
            $validated['invoice_document'],
            $validated['notes'] ?? null
        );

        return to_route('three-way-matching.index', [
            'status' => $validated['status'] ?? 'unpaid',
            'page' => $validated['page'] ?? 1,
            'per_page' => $validated['per_page'] ?? 20,
            'selected_match_id' => $validated['selected_match_id'] ?? $purchaseOrder->id,
        ])->with('success', 'Purchase order marked as paid.');
    }
}
