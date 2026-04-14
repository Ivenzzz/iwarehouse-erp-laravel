<?php

namespace App\Features\DeliveryReceipts\Http\Controllers;

use App\Features\DeliveryReceipts\Actions\CreateDeliveryReceipt;
use App\Features\DeliveryReceipts\Actions\ExportDeliveryReceiptsCsv;
use App\Features\DeliveryReceipts\Actions\GetDeliveryReceiptHistoryChain;
use App\Features\DeliveryReceipts\Queries\ListDeliveryReceiptPageData;
use App\Features\DeliveryReceipts\Support\DeliveryReceiptDataTransformer;
use App\Http\Controllers\Controller;
use App\Models\DeliveryReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeliveryReceiptController extends Controller
{
    public function index(Request $request, ListDeliveryReceiptPageData $query): InertiaResponse
    {
        return Inertia::render('DeliveryReceipts', $query($request));
    }

    public function store(Request $request, CreateDeliveryReceipt $action): JsonResponse
    {
        $validated = $request->validate([
            'po_id' => ['nullable', 'integer', 'exists:purchase_orders,id'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'payment_term_id' => ['nullable', 'integer', 'exists:payment_terms,id'],
            'dr_number' => ['required', 'string', 'max:50'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'date_received' => ['required', 'date'],
            'logistics' => ['required', 'array'],
            'logistics.logistics_company' => ['nullable', 'string', 'max:150'],
            'logistics.waybill_number' => ['nullable', 'string', 'max:100'],
            'logistics.driver_name' => ['nullable', 'string', 'max:150'],
            'logistics.driver_contact' => ['nullable', 'string', 'max:50'],
            'logistics.origin' => ['nullable', 'string', 'max:150'],
            'logistics.destination' => ['nullable', 'string', 'max:150'],
            'logistics.freight_cost' => ['nullable', 'numeric', 'min:0'],
            'summary' => ['nullable', 'array'],
            'summary.box_count_declared' => ['nullable', 'integer', 'min:0'],
            'summary.box_count_received' => ['nullable', 'integer', 'min:0'],
            'summary.variance_notes' => ['nullable', 'string'],
            'uploads' => ['required', 'array'],
            'uploads.vendor_dr_url' => ['nullable', 'string', 'max:500'],
            'uploads.waybill_url' => ['nullable', 'string', 'max:500'],
            'uploads.freight_invoice_url' => ['nullable', 'string', 'max:500'],
            'uploads.driver_id_url' => ['nullable', 'string', 'max:500'],
            'uploads.purchase_file_url' => ['nullable', 'string', 'max:500'],
            'uploads.uploads_complete' => ['nullable', 'boolean'],
            'uploads.box_photos' => ['nullable', 'array'],
            'uploads.box_photos.*' => ['string', 'max:500'],
            'declared_items' => ['required', 'array', 'min:1'],
            'declared_items.*.product_master_id' => ['required', 'integer', 'exists:product_masters,id'],
            'declared_items.*.expected_quantity' => ['nullable', 'integer', 'min:0'],
            'declared_items.*.declared_quantity' => ['nullable', 'integer', 'min:0'],
            'declared_items.*.actual_quantity' => ['required', 'integer', 'min:0'],
            'declared_items.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'declared_items.*.cash_price' => ['nullable', 'numeric', 'min:0'],
            'declared_items.*.srp_price' => ['nullable', 'numeric', 'min:0'],
            'declared_items.*.variance_notes' => ['nullable', 'string'],
            'declared_items.*.product_spec' => ['nullable', 'array'],
            'declared_items.*.product_spec.model_code' => ['nullable', 'string', 'max:100'],
            'declared_items.*.product_spec.ram' => ['nullable', 'string', 'max:50'],
            'declared_items.*.product_spec.rom' => ['nullable', 'string', 'max:50'],
            'declared_items.*.product_spec.condition' => ['nullable', 'string', 'max:100'],
        ]);

        $dr = $action->handle($validated, $request->user()?->id);
        $dr->load(DeliveryReceiptDataTransformer::RELATIONS);

        return response()->json([
            'ok' => true,
            'delivery_receipt' => DeliveryReceiptDataTransformer::transform($dr),
        ]);
    }

    public function export(Request $request, ExportDeliveryReceiptsCsv $action): StreamedResponse
    {
        return $action->handle($request);
    }

    public function history(DeliveryReceipt $deliveryReceipt, GetDeliveryReceiptHistoryChain $action): JsonResponse
    {
        return response()->json([
            'history' => $action->handle($deliveryReceipt),
        ]);
    }
}
