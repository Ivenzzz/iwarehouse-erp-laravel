<?php

namespace App\Features\RequestForQuotations\Http\Controllers;

use App\Features\RequestForQuotations\Actions\AddRequestForQuotationSupplierQuote;
use App\Features\RequestForQuotations\Actions\AwardRequestForQuotation;
use App\Features\RequestForQuotations\Actions\ConsolidateRequestForQuotations;
use App\Features\RequestForQuotations\Actions\ExportRequestForQuotationsCsv;
use App\Features\RequestForQuotations\Queries\ListRequestForQuotationPageData;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RequestForQuotationController extends Controller
{
    public function index(Request $request, ListRequestForQuotationPageData $query): InertiaResponse
    {
        return Inertia::render('RequestForQuotations', $query($request));
    }

    public function addSupplierQuote(Request $request, AddRequestForQuotationSupplierQuote $action): JsonResponse
    {
        $validated = $request->validate([
            'rfq_id' => ['required', 'integer', 'exists:request_for_quotations,id'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'quote_date' => ['required', 'date'],
            'eta' => ['nullable', 'date'],
            'payment_terms' => ['nullable', 'string', 'max:150'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.rfq_item_id' => ['required', 'integer', 'exists:request_for_quotation_items,id'],
            'items.*.quoted_quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $action->handle(
            rfqId: (int) $validated['rfq_id'],
            supplierId: (int) $validated['supplier_id'],
            quoteDate: (string) $validated['quote_date'],
            eta: $validated['eta'] ?? null,
            paymentTerms: $validated['payment_terms'] ?? null,
            taxAmount: (float) ($validated['tax_amount'] ?? 0),
            shippingCost: (float) ($validated['shipping_cost'] ?? 0),
            items: $validated['items'],
            actorId: $request->user()?->id,
        );

        return response()->json(['ok' => true]);
    }

    public function award(Request $request, AwardRequestForQuotation $action): JsonResponse
    {
        $validated = $request->validate([
            'rfq_id' => ['required', 'integer', 'exists:request_for_quotations,id'],
            'supplier_quote_id' => ['required', 'integer', 'exists:request_for_quotation_supplier_quotes,id'],
        ]);

        $poNumber = $action->handle((int) $validated['rfq_id'], (int) $validated['supplier_quote_id'], $request->user()?->id);

        return response()->json(['ok' => true, 'po_number' => $poNumber]);
    }

    public function consolidate(Request $request, ConsolidateRequestForQuotations $action): JsonResponse
    {
        $validated = $request->validate([
            'rfq_ids' => ['required', 'array', 'min:2'],
            'rfq_ids.*' => ['required', 'integer', 'exists:request_for_quotations,id'],
        ]);

        $rfq = $action->handle(array_map('intval', $validated['rfq_ids']), $request->user()?->id);

        return response()->json(['ok' => true, 'rfq_id' => $rfq->id, 'rfq_number' => $rfq->rfq_number]);
    }

    public function export(Request $request, ExportRequestForQuotationsCsv $action): StreamedResponse
    {
        return $action->handle($request);
    }
}
