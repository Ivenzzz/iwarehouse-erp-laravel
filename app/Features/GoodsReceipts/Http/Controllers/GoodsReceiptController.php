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
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
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

    public function catalog(Request $request, GetGoodsReceiptCatalog $query): JsonResponse|RedirectResponse
    {
        return $this->respondGoodsReceiptAction($request, 'catalog', $query($request));
    }

    public function show(Request $request, GoodsReceipt $goodsReceipt, GetGoodsReceiptDetail $query): JsonResponse|RedirectResponse
    {
        return $this->respondGoodsReceiptAction($request, 'detail', $query($goodsReceipt));
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

        return $this->respondGoodsReceiptAction($request, 'create_goods_receipt', [
            'ok' => true,
            'id' => $grn->id,
        ]);
    }

    public function validateDuplicates(Request $request, ValidateGoodsReceiptDuplicates $action): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.identifiers' => ['nullable', 'array'],
            'items.*.identifiers.serial_number' => ['nullable', 'string', 'max:100'],
            'items.*.identifiers.imei1' => ['nullable', 'string', 'max:50'],
            'items.*.identifiers.imei2' => ['nullable', 'string', 'max:50'],
        ]);

        return $this->respondGoodsReceiptAction($request, 'validate_duplicates', [
            'duplicates' => $action->handle($validated['items']),
        ]);
    }

    public function markDeliveryReceiptComplete(DeliveryReceipt $deliveryReceipt, Request $request): JsonResponse|RedirectResponse
    {
        $deliveryReceipt->forceFill([
            'has_goods_receipt' => true,
            'date_encoded' => now(),
            'encoded_by_user_id' => $request->user()?->id,
        ])->save();

        return $this->respondGoodsReceiptAction($request, 'mark_dr_complete', ['ok' => true]);
    }

    public function validatePurchaseCsv(Request $request, ValidatePurchaseCsv $action): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'csvText' => ['required', 'string'],
        ]);

        return $this->respondGoodsReceiptAction(
            $request,
            'validate_csv',
            $action->handle($validated['csvText'])
        );
    }

    public function resolvePurchaseBrandConflicts(Request $request, ResolvePurchaseBrandConflicts $action): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'brandConflicts' => ['required', 'array'],
            'brandConflicts.*.selectedBrandId' => ['nullable', 'string'],
        ]);

        return $this->respondGoodsReceiptAction(
            $request,
            'resolve_conflicts',
            $action->handle($validated['brandConflicts'])
        );
    }

    public function executeDirectPurchase(
        Request $request,
        ExecuteDirectPurchaseImport $action,
        StoreGoodsReceiptUpload $storeGoodsReceiptUpload,
    ): JsonResponse|RedirectResponse {
        $validated = $request->validate([
            'warehouseId' => ['required', 'integer', 'exists:warehouses,id'],
            'formData' => ['required', 'array'],
            'formData.supplierId' => ['required', 'integer', 'exists:suppliers,id'],
            'formData.drNumber' => ['nullable', 'string', 'max:100'],
            'formData.arrivalDate' => ['nullable', 'date'],
            'formData.trackingNumber' => ['nullable', 'string', 'max:100'],
            'formData.purchaseFileUrl' => ['nullable', 'string', 'max:500'],
            'formData.drDocumentFile' => ['nullable', 'file', 'max:10240'],
            'formData.waybillFile' => ['nullable', 'file', 'max:10240'],
            'formData.purchaseFile' => ['nullable', 'file', 'max:10240'],
            'validatedRows' => ['required', 'array', 'min:1'],
            'validatedRows.*.product_master_id' => ['required', 'integer', 'exists:product_masters,id'],
            'validatedRows.*.variant_id' => ['required', 'integer', 'exists:product_variants,id'],
        ]);

        $validated['validatedRows'] = $this->mergeValidatedPurchaseRows(
            $validated['validatedRows'],
            $request->input('validatedRows', [])
        );

        $formData = $validated['formData'];

        $drDocumentFile = $request->file('formData.drDocumentFile');
        if ($drDocumentFile instanceof UploadedFile) {
            $formData['drDocumentUrl'] = (string) ($storeGoodsReceiptUpload->handle($drDocumentFile)['file_url'] ?? '');
        }

        $waybillFile = $request->file('formData.waybillFile');
        if ($waybillFile instanceof UploadedFile) {
            $formData['waybillUrl'] = (string) ($storeGoodsReceiptUpload->handle($waybillFile)['file_url'] ?? '');
        }

        $purchaseFile = $request->file('formData.purchaseFile');
        if ($purchaseFile instanceof UploadedFile) {
            $formData['purchaseFileUrl'] = (string) ($storeGoodsReceiptUpload->handle($purchaseFile)['file_url'] ?? '');
        }

        $payload = $action->handle([
            ...$validated,
            'formData' => $formData,
        ], $request->user()?->id);

        return $this->respondGoodsReceiptAction($request, 'execute_purchase_import', $payload);
    }

    public function export(Request $request, ExportGoodsReceiptsCsv $action): StreamedResponse
    {
        return $action->handle($request);
    }

    public function upload(Request $request, StoreGoodsReceiptUpload $storeGoodsReceiptUpload): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        return $this->respondGoodsReceiptAction(
            $request,
            'upload_purchase_file',
            $storeGoodsReceiptUpload->handle($validated['file']),
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $validatedStubs
     * @param  array<int, mixed>  $fullRows
     * @return array<int, array<string, mixed>>
     */
    private function mergeValidatedPurchaseRows(array $validatedStubs, array $fullRows): array
    {
        if (count($fullRows) !== count($validatedStubs)) {
            throw ValidationException::withMessages([
                'validatedRows' => ['Validated row count does not match the request.'],
            ]);
        }

        foreach ($validatedStubs as $i => $stub) {
            $row = $fullRows[$i] ?? null;
            if (! is_array($row)) {
                throw ValidationException::withMessages([
                    'validatedRows' => ["Validated row at index {$i} is missing or invalid."],
                ]);
            }
            if ((int) ($row['product_master_id'] ?? 0) !== (int) $stub['product_master_id']) {
                throw ValidationException::withMessages([
                    'validatedRows' => ["Validated row at index {$i}: product_master_id does not match."],
                ]);
            }
            if ((int) ($row['variant_id'] ?? 0) !== (int) $stub['variant_id']) {
                throw ValidationException::withMessages([
                    'validatedRows' => ["Validated row at index {$i}: variant_id does not match."],
                ]);
            }
        }

        /** @var array<int, array<string, mixed>> */
        return $fullRows;
    }

    private function respondGoodsReceiptAction(Request $request, string $key, array $payload): JsonResponse|RedirectResponse
    {
        if ($request->headers->has('X-Inertia')) {
            return redirect()
                ->back()
                ->with('goods_receipt_api', [$key => $payload]);
        }

        if ($request->expectsJson()) {
            return response()->json($payload);
        }

        return redirect()->back()->with('goods_receipt_api', [$key => $payload]);
    }
}
