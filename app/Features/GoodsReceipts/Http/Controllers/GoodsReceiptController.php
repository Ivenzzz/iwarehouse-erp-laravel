<?php

namespace App\Features\GoodsReceipts\Http\Controllers;

use App\Features\GoodsReceipts\Actions\CreateGoodsReceipt;
use App\Features\GoodsReceipts\Actions\ExecuteDirectPurchaseImport;
use App\Features\GoodsReceipts\Actions\ExportGoodsReceiptsCsv;
use App\Features\GoodsReceipts\Actions\ResolvePurchaseBrandConflicts;
use App\Features\GoodsReceipts\Actions\StoreGoodsReceiptUpload;
use App\Features\GoodsReceipts\Actions\ValidateGoodsReceiptDuplicates;
use App\Features\GoodsReceipts\Actions\ValidatePurchaseCsv;
use App\Features\GoodsReceipts\Queries\GetGoodsReceiptCatalog;
use App\Features\GoodsReceipts\Queries\GetGoodsReceiptDetail;
use App\Features\GoodsReceipts\Queries\ListGoodsReceiptPageData;
use App\Http\Controllers\Controller;
use App\Models\DeliveryReceipt;
use App\Models\GoodsReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GoodsReceiptController extends Controller
{
    public function index(Request $request, ListGoodsReceiptPageData $query): InertiaResponse
    {
        return Inertia::render('GoodsReceipt', $query($request));
    }

    public function data(Request $request, ListGoodsReceiptPageData $query): JsonResponse
    {
        return response()->json($query($request)['goods_receipt_page']);
    }

    public function catalog(Request $request, GetGoodsReceiptCatalog $query): JsonResponse
    {
        return response()->json($query($request));
    }

    public function show(GoodsReceipt $goodsReceipt, GetGoodsReceiptDetail $query): JsonResponse
    {
        return response()->json($query($goodsReceipt));
    }

    public function store(Request $request, CreateGoodsReceipt $action): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'grn_number' => ['required', 'string', 'max:100'],
            'dr_id' => ['required', 'integer', 'exists:delivery_receipts,id'],
            'status' => ['required', 'string', 'in:ongoing,completed,completed_with_discrepancy'],
            'notes' => ['nullable', 'string'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'discrepancy_info' => ['nullable', 'array'],
            'discrepancy_info.has_discrepancy' => ['nullable', 'boolean'],
            'discrepancy_info.discrepancy_summary' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.identifiers' => ['nullable', 'array'],
            'items.*.identifiers.serial_number' => ['nullable', 'string', 'max:100'],
            'items.*.identifiers.imei1' => ['nullable', 'string', 'max:50'],
            'items.*.identifiers.imei2' => ['nullable', 'string', 'max:50'],
            'items.*.pricing' => ['nullable', 'array'],
            'items.*.pricing.cost_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.pricing.cash_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.pricing.srp' => ['nullable', 'numeric', 'min:0'],
            'items.*.spec' => ['nullable', 'array'],
            'items.*.package' => ['nullable', 'string', 'max:150'],
            'items.*.warranty' => ['nullable', 'string', 'max:150'],
            'items.*.item_notes' => ['nullable', 'string'],
        ]);

        $grn = $action->handle($validated, $request->user()?->id);

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['ok' => true, 'id' => $grn->id]);
        }

        return redirect()->route('goods-receipts.index')->with('success', 'GRN created successfully.');
    }

    public function validateDuplicates(Request $request, ValidateGoodsReceiptDuplicates $action): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.identifiers' => ['nullable', 'array'],
            'items.*.identifiers.serial_number' => ['nullable', 'string', 'max:100'],
            'items.*.identifiers.imei1' => ['nullable', 'string', 'max:50'],
            'items.*.identifiers.imei2' => ['nullable', 'string', 'max:50'],
        ]);

        return response()->json([
            'duplicates' => $action->handle($validated['items']),
        ]);
    }

    public function markDeliveryReceiptComplete(DeliveryReceipt $deliveryReceipt, Request $request): JsonResponse
    {
        $deliveryReceipt->forceFill([
            'has_goods_receipt' => true,
            'date_encoded' => now(),
            'encoded_by_user_id' => $request->user()?->id,
        ])->save();

        return response()->json(['ok' => true]);
    }

    public function validatePurchaseCsv(Request $request, ValidatePurchaseCsv $action): JsonResponse
    {
        $validated = $request->validate([
            'csvText' => ['required', 'string'],
        ]);

        return response()->json($action->handle($validated['csvText']));
    }

    public function resolvePurchaseBrandConflicts(Request $request, ResolvePurchaseBrandConflicts $action): JsonResponse
    {
        $validated = $request->validate([
            'brandConflicts' => ['required', 'array'],
        ]);

        return response()->json($action->handle($validated['brandConflicts']));
    }

    public function executeDirectPurchase(Request $request, ExecuteDirectPurchaseImport $action): JsonResponse
    {
        $validated = $request->validate([
            'warehouseId' => ['required', 'integer', 'exists:warehouses,id'],
            'formData' => ['required', 'array'],
            'formData.supplierId' => ['required', 'integer', 'exists:suppliers,id'],
            'formData.drNumber' => ['nullable', 'string', 'max:100'],
            'formData.arrivalDate' => ['nullable', 'date'],
            'formData.trackingNumber' => ['nullable', 'string', 'max:100'],
            'formData.purchaseFileUrl' => ['nullable', 'string', 'max:500'],
            'validatedRows' => ['required', 'array', 'min:1'],
            'validatedRows.*.product_master_id' => ['required', 'integer', 'exists:product_masters,id'],
            'validatedRows.*.variant_id' => ['required', 'integer', 'exists:product_variants,id'],
        ]);

        return response()->json($action->handle($validated, $request->user()?->id));
    }

    public function export(Request $request, ExportGoodsReceiptsCsv $action): StreamedResponse
    {
        return $action->handle($request);
    }

    public function upload(Request $request, StoreGoodsReceiptUpload $storeGoodsReceiptUpload): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        return response()->json($storeGoodsReceiptUpload->handle($validated['file']));
    }
}
