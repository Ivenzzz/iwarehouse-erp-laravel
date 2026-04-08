<?php

namespace App\Features\Inventory\Http\Controllers;

use App\Features\Inventory\Actions\BatchDeleteInventory;
use App\Features\Inventory\Actions\BatchMoveInventory;
use App\Features\Inventory\Actions\BatchUpdateInventory;
use App\Features\Inventory\Actions\ExportInventoryCsv;
use App\Features\Inventory\Actions\GetInventoryKpis;
use App\Features\Inventory\Actions\ImportInventoryItemsFromCsv;
use App\Features\Inventory\Http\Requests\ImportInventoryBatchRequest;
use App\Features\Inventory\Http\Requests\ValidateInventoryImportRequest;
use App\Features\Inventory\Queries\FindExactInventoryMatches;
use App\Features\Inventory\Queries\ListInventoryPageData;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InventoryController extends Controller
{
    public function index(Request $request, ListInventoryPageData $listInventoryPageData): InertiaResponse
    {
        return Inertia::render('Inventory', $listInventoryPageData($request));
    }

    public function kpis(GetInventoryKpis $getInventoryKpis): JsonResponse
    {
        return response()->json($getInventoryKpis->handle());
    }

    public function exactLookup(Request $request, FindExactInventoryMatches $findExactInventoryMatches): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['required', 'string'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return response()->json(
            $findExactInventoryMatches->handle($validated['search'], (int) ($validated['limit'] ?? 20)),
        );
    }

    public function validateImport(ValidateInventoryImportRequest $request, ImportInventoryItemsFromCsv $importInventoryItemsFromCsv): JsonResponse
    {
        try {
            return response()->json($importInventoryItemsFromCsv->validate($request->csvFile(), $request->user()?->id));
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    public function import(ImportInventoryBatchRequest $request, ImportInventoryItemsFromCsv $importInventoryItemsFromCsv): JsonResponse
    {
        try {
            return response()->json(
                $importInventoryItemsFromCsv->import(
                    $request->importToken(),
                    $request->user()?->id,
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    public function batchWarehouse(Request $request, BatchMoveInventory $batchMoveInventory): JsonResponse
    {
        $validated = $request->validate([
            'itemIds' => ['required', 'array', 'min:1'],
            'itemIds.*' => ['integer', 'min:1'],
            'targetWarehouseId' => ['required', 'integer', 'exists:warehouses,id'],
        ]);

        return response()->json(
            $batchMoveInventory->handle(
                array_map('intval', $validated['itemIds']),
                (int) $validated['targetWarehouseId'],
                $request->user()?->id,
            ),
        );
    }

    public function batchUpdate(Request $request, BatchUpdateInventory $batchUpdateInventory): JsonResponse
    {
        $validated = $request->validate([
            'itemIds' => ['required', 'array', 'min:1'],
            'itemIds.*' => ['integer', 'min:1'],
            'updateFields' => ['required', 'array'],
        ]);

        return response()->json(
            $batchUpdateInventory->handle(
                array_map('intval', $validated['itemIds']),
                $validated['updateFields'],
                $request->user()?->id,
            ),
        );
    }

    public function batchDelete(Request $request, BatchDeleteInventory $batchDeleteInventory): JsonResponse
    {
        $validated = $request->validate([
            'itemIds' => ['required', 'array', 'min:1'],
            'itemIds.*' => ['integer', 'min:1'],
        ]);

        return response()->json(
            $batchDeleteInventory->handle(array_map('intval', $validated['itemIds'])),
        );
    }

    public function export(Request $request, ExportInventoryCsv $exportInventoryCsv): StreamedResponse
    {
        return $exportInventoryCsv->handle($request);
    }
}
