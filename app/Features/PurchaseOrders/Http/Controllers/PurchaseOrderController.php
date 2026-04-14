<?php

namespace App\Features\PurchaseOrders\Http\Controllers;

use App\Features\PurchaseOrders\Actions\ExportPurchaseOrdersCsv;
use App\Features\PurchaseOrders\Actions\SearchPurchaseOrderProductOptions;
use App\Features\PurchaseOrders\Actions\UpsertPurchaseOrder;
use App\Features\PurchaseOrders\Queries\ListPurchaseOrderPageData;
use App\Features\PurchaseOrders\Support\PurchaseOrderDataTransformer;
use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseOrderController extends Controller
{
    public function index(Request $request, ListPurchaseOrderPageData $query): InertiaResponse
    {
        return Inertia::render('PurchaseOrders', $query($request));
    }

    public function store(Request $request, UpsertPurchaseOrder $action): JsonResponse
    {
        $validated = $this->validateUpsert($request);
        $purchaseOrder = $action->handle($validated, null, $request->user()?->id);

        return response()->json([
            'ok' => true,
            'purchase_order' => PurchaseOrderDataTransformer::transform(
                $purchaseOrder->load(PurchaseOrderDataTransformer::RELATIONS)
            ),
        ]);
    }

    public function update(Request $request, int $purchaseOrderId, UpsertPurchaseOrder $action): JsonResponse
    {
        $validated = $this->validateUpsert($request);
        $purchaseOrder = $action->handle($validated, $purchaseOrderId, $request->user()?->id);

        return response()->json([
            'ok' => true,
            'purchase_order' => PurchaseOrderDataTransformer::transform(
                $purchaseOrder->load(PurchaseOrderDataTransformer::RELATIONS)
            ),
        ]);
    }

    public function approve(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_order_id' => ['required', 'integer', 'exists:purchase_orders,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $purchaseOrder = PurchaseOrder::query()->findOrFail((int) $validated['purchase_order_id']);
        $purchaseOrder->update(['status' => 'approved']);

        $purchaseOrder->approval()->updateOrCreate(
            ['purchase_order_id' => $purchaseOrder->id],
            [
                'approver_id' => $request->user()?->id,
                'approved_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]
        );

        $purchaseOrder->statusHistories()->create([
            'status' => 'approved',
            'changed_by_id' => $request->user()?->id,
            'occurred_at' => now(),
            'notes' => $validated['notes'] ?? 'Purchase Order approved',
        ]);

        return response()->json(['ok' => true]);
    }

    public function reject(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_order_id' => ['required', 'integer', 'exists:purchase_orders,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $purchaseOrder = PurchaseOrder::query()->findOrFail((int) $validated['purchase_order_id']);
        $purchaseOrder->update(['status' => 'rejected']);

        $purchaseOrder->statusHistories()->create([
            'status' => 'rejected',
            'changed_by_id' => $request->user()?->id,
            'occurred_at' => now(),
            'notes' => $validated['notes'] ?? 'Purchase Order rejected',
        ]);

        return response()->json(['ok' => true]);
    }

    public function export(Request $request, ExportPurchaseOrdersCsv $action): StreamedResponse
    {
        return $action->handle($request);
    }

    public function productOptions(Request $request, SearchPurchaseOrderProductOptions $action): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        return response()->json([
            'options' => $action->handle((string) ($validated['search'] ?? ''), (int) ($validated['limit'] ?? 30)),
        ]);
    }

    private function validateUpsert(Request $request): array
    {
        return $request->validate([
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'expected_delivery_date' => ['nullable', 'date'],
            'shipping_method' => ['nullable', 'string', 'max:150'],
            'shipping_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_terms' => ['nullable', 'string', 'max:150'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_master_id' => ['required', 'integer', 'exists:product_masters,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.product_spec' => ['nullable', 'array'],
            'items.*.product_spec.model_code' => ['nullable', 'string', 'max:100'],
            'items.*.product_spec.ram' => ['nullable', 'string', 'max:50'],
            'items.*.product_spec.rom' => ['nullable', 'string', 'max:50'],
            'items.*.product_spec.condition' => ['nullable', 'string', 'max:100'],
        ]);
    }
}
