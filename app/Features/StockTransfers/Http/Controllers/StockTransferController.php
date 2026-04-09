<?php

namespace App\Features\StockTransfers\Http\Controllers;

use App\Features\StockTransfers\Actions\ConsolidateStockTransfers;
use App\Features\StockTransfers\Actions\CreateStockTransfer;
use App\Features\StockTransfers\Actions\DeleteStockTransfer;
use App\Features\StockTransfers\Actions\ListTransferVariantInventory;
use App\Features\StockTransfers\Actions\LookupTransferInventoryItem;
use App\Features\StockTransfers\Actions\PickStockTransfer;
use App\Features\StockTransfers\Actions\ReceiveStockTransfer;
use App\Features\StockTransfers\Actions\SearchTransferProducts;
use App\Features\StockTransfers\Actions\ShipStockTransfer;
use App\Features\StockTransfers\Actions\StoreStockTransferUpload;
use App\Features\StockTransfers\Queries\ListStockTransferPageData;
use App\Features\StockTransfers\Support\StockTransferDataTransformer;
use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use InvalidArgumentException;

class StockTransferController extends Controller
{
    public function index(Request $request, ListStockTransferPageData $listStockTransferPageData): InertiaResponse
    {
        return Inertia::render('StockTransfer', $listStockTransferPageData($request));
    }

    public function searchProducts(Request $request, SearchTransferProducts $searchTransferProducts): JsonResponse
    {
        $validated = $request->validate([
            'sourceLocationId' => ['required', 'integer', 'exists:warehouses,id'],
            'query' => ['required', 'string'],
        ]);

        return response()->json(
            $searchTransferProducts->handle((int) $validated['sourceLocationId'], $validated['query']),
        );
    }

    public function variantInventory(Request $request, ListTransferVariantInventory $listTransferVariantInventory): JsonResponse
    {
        $validated = $request->validate([
            'sourceLocationId' => ['required', 'integer', 'exists:warehouses,id'],
            'variantId' => ['required', 'integer', 'exists:product_variants,id'],
        ]);

        return response()->json(
            $listTransferVariantInventory->handle((int) $validated['sourceLocationId'], (int) $validated['variantId']),
        );
    }

    public function lookupInventoryItem(Request $request, LookupTransferInventoryItem $lookupTransferInventoryItem): JsonResponse
    {
        $validated = $request->validate([
            'barcode' => ['required', 'string', 'max:100'],
        ]);

        return response()->json(
            $lookupTransferInventoryItem->handle($validated['barcode']),
        );
    }

    public function store(Request $request, CreateStockTransfer $createStockTransfer): JsonResponse
    {
        $validated = $request->validate([
            'source_location_id' => ['required', 'integer', 'exists:warehouses,id'],
            'destination_location_id' => ['required', 'integer', 'exists:warehouses,id', 'different:source_location_id'],
            'reference' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string'],
            'product_lines' => ['required', 'array', 'min:1'],
            'product_lines.*.inventory_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'product_lines.*.is_picked' => ['nullable', 'boolean'],
            'product_lines.*.is_shipped' => ['nullable', 'boolean'],
            'product_lines.*.is_received' => ['nullable', 'boolean'],
        ]);

        try {
            $transfer = $createStockTransfer->handle($validated, $request->user()?->id);

            return response()->json([
                'transfer' => StockTransferDataTransformer::transformTransfer($transfer),
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function pick(Request $request, StockTransfer $stockTransfer, PickStockTransfer $pickStockTransfer): JsonResponse
    {
        $validated = $request->validate([
            'scannedItems' => ['required', 'array', 'min:1'],
            'scannedItems.*.inventory_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'scannedItems.*.scanned_at' => ['nullable', 'date'],
            'scannedItems.*.scanned_barcode' => ['nullable', 'string', 'max:100'],
            'scannedItems.*.imei1' => ['nullable', 'string', 'max:50'],
            'scannedItems.*.serial_number' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $transfer = $pickStockTransfer->handle($stockTransfer, $validated['scannedItems'], $request->user()?->id);

            return response()->json([
                'transfer' => StockTransferDataTransformer::transformTransfer($transfer),
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function ship(Request $request, StockTransfer $stockTransfer, ShipStockTransfer $shipStockTransfer): JsonResponse
    {
        $validated = $request->validate([
            'driver_name' => ['required', 'string', 'max:150'],
            'driver_contact' => ['nullable', 'string', 'max:50'],
            'courier_name' => ['nullable', 'string', 'max:150'],
            'proof_of_dispatch_url' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        try {
            $transfer = $shipStockTransfer->handle($stockTransfer, $validated, $request->user()?->id);

            return response()->json([
                'transfer' => StockTransferDataTransformer::transformTransfer($transfer),
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function receive(Request $request, StockTransfer $stockTransfer, ReceiveStockTransfer $receiveStockTransfer): JsonResponse
    {
        $validated = $request->validate([
            'newlyReceivedInventoryIds' => ['nullable', 'array'],
            'newlyReceivedInventoryIds.*' => ['integer', 'exists:inventory_items,id'],
            'overageItems' => ['nullable', 'array'],
            'overageItems.*.inventory_id' => ['required_with:overageItems', 'integer', 'exists:inventory_items,id'],
            'overageItems.*.product_name' => ['nullable', 'string', 'max:255'],
            'overageItems.*.variant_name' => ['nullable', 'string', 'max:255'],
            'overageItems.*.imei1' => ['nullable', 'string', 'max:50'],
            'overageItems.*.imei2' => ['nullable', 'string', 'max:50'],
            'overageItems.*.serial_number' => ['nullable', 'string', 'max:100'],
            'unknownItems' => ['nullable', 'array'],
            'unknownItems.*.barcode' => ['nullable', 'string', 'max:100'],
            'unknownItems.*.scanned_barcode' => ['nullable', 'string', 'max:100'],
            'destinationWarehouseId' => ['required', 'integer', 'exists:warehouses,id'],
            'receivingJson' => ['required', 'array'],
            'receivingJson.branch_remarks' => ['nullable', 'string'],
            'receivingJson.discrepancy_reason' => ['nullable', 'string'],
            'receivingJson.photo_proof_url' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $transfer = $receiveStockTransfer->handle($stockTransfer, $validated, $request->user()?->id);

            return response()->json([
                'transfer' => StockTransferDataTransformer::transformTransfer($transfer),
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function destroy(Request $request, StockTransfer $stockTransfer, DeleteStockTransfer $deleteStockTransfer): JsonResponse
    {
        try {
            $deleteStockTransfer->handle($stockTransfer, $request->user()?->id);

            return response()->json(['deleted' => true]);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function consolidate(Request $request, ConsolidateStockTransfers $consolidateStockTransfers): JsonResponse
    {
        $validated = $request->validate([
            'transferIds' => ['required', 'array', 'min:2'],
            'transferIds.*' => ['integer', 'exists:stock_transfers,id'],
        ]);

        try {
            $result = $consolidateStockTransfers->handle(array_map('intval', $validated['transferIds']), $request->user()?->id);

            return response()->json([
                'masterTransfer' => StockTransferDataTransformer::transformTransfer($result['masterTransfer']),
                'sourceTransferIds' => $result['sourceTransferIds'],
                'sourceTransferNumbers' => $result['sourceTransferNumbers'],
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function uploadProof(Request $request, StoreStockTransferUpload $storeStockTransferUpload): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'image', 'max:10240'],
            'directory' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            return response()->json(
                $storeStockTransferUpload->handle($validated['file'], $validated['directory'] ?? 'stock-transfers'),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
