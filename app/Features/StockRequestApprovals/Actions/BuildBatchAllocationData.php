<?php

namespace App\Features\StockRequestApprovals\Actions;

use App\Models\InventoryItem;
use App\Models\SalesTransactionItem;
use App\Models\StockRequest;
use App\Models\Warehouse;

class BuildBatchAllocationData
{
    /** @param array<int> $stockRequestIds */
    public function handle(array $stockRequestIds): array
    {
        $requests = StockRequest::query()
            ->whereIn('id', $stockRequestIds)
            ->with([
                'warehouse:id,name,warehouse_type',
                'items:id,stock_request_id,variant_id,quantity,reason',
                'items.variant:id,product_master_id,variant_name,sku,condition',
                'items.variant.values:id,product_variant_id,product_variant_attribute_id,value',
                'items.variant.values.attribute:id,key,label',
                'items.variant.productMaster:id,model_id',
                'items.variant.productMaster.model:id,brand_id,model_name',
                'items.variant.productMaster.model.brand:id,name',
            ])
            ->get();

        $mainWarehouse = Warehouse::query()->where('warehouse_type', 'main_warehouse')->orderBy('id')->first();
        $mainWarehouseId = $mainWarehouse?->id;

        $variantIds = $requests->flatMap(fn ($request) => $request->items->pluck('variant_id'))->unique()->values();

        $mainStockByVariant = InventoryItem::query()
            ->selectRaw('product_variant_id as variant_id, COUNT(*) as qty')
            ->where('warehouse_id', $mainWarehouseId)
            ->where('status', 'available')
            ->whereIn('product_variant_id', $variantIds)
            ->groupBy('product_variant_id')
            ->pluck('qty', 'variant_id');

        $branchStock = InventoryItem::query()
            ->selectRaw('warehouse_id, product_variant_id as variant_id, COUNT(*) as qty')
            ->where('status', 'available')
            ->whereIn('product_variant_id', $variantIds)
            ->groupBy('warehouse_id', 'product_variant_id')
            ->get()
            ->groupBy('warehouse_id')
            ->map(fn ($rows) => $rows->pluck('qty', 'variant_id'));

        $since = now()->subDays(7);
        $adsRows = SalesTransactionItem::query()
            ->join('inventory_items', 'inventory_items.id', '=', 'sales_transaction_items.inventory_item_id')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('pos_sessions', 'pos_sessions.id', '=', 'sales_transactions.pos_session_id')
            ->where('sales_transactions.created_at', '>=', $since)
            ->whereIn('inventory_items.product_variant_id', $variantIds)
            ->selectRaw('pos_sessions.warehouse_id, inventory_items.product_variant_id as variant_id, COUNT(*) as sold_qty')
            ->groupBy('pos_sessions.warehouse_id', 'inventory_items.product_variant_id')
            ->get()
            ->groupBy('warehouse_id')
            ->map(fn ($rows) => $rows->pluck('sold_qty', 'variant_id'));

        $result = [];

        foreach ($requests as $request) {
            foreach ($request->items as $item) {
                $variantId = (int) $item->variant_id;
                $branchId = (int) $request->warehouse_id;
                $requestedQty = (int) $item->quantity;
                $branchSoh = (int) (($branchStock[$branchId][$variantId] ?? 0));
                $mainStock = (int) ($mainStockByVariant[$variantId] ?? 0);
                $soldQty = (int) (($adsRows[$branchId][$variantId] ?? 0));
                $ads = $soldQty / 7;
                $recommendedLimit = (int) ceil($ads * 7);
                $defaultTransfer = min($mainStock, $requestedQty);
                $defaultRfq = max(0, $requestedQty - $defaultTransfer);

                $attrs = collect($item->variant?->values ?? [])->reduce(function (array $carry, $value): array {
                    $key = $value->attribute?->key ?? $value->attribute?->label;
                    if ($key) {
                        $carry[$key] = $value->value;
                    }

                    return $carry;
                }, []);

                $result[] = [
                    'srId' => $request->id,
                    'srNumber' => $request->request_number,
                    'branchId' => $branchId,
                    'branchName' => $request->warehouse?->name,
                    'stockRequestItemId' => $item->id,
                    'variantId' => $variantId,
                    'groupKey' => (string) $variantId,
                    'requestedQty' => $requestedQty,
                    'branchSOH' => $branchSoh,
                    'mainWarehouseStock' => $mainStock,
                    'branchADS' => round($ads, 4),
                    'recommendedLimit' => $recommendedLimit,
                    'defaultTransfer' => $defaultTransfer,
                    'defaultRFQ' => $defaultRfq,
                    'itemName' => trim(($item->variant?->productMaster?->model?->brand?->name ?? '').' '.($item->variant?->productMaster?->model?->model_name ?? '').' '.($item->variant?->variant_name ?? '')),
                    'itemDisplay' => [
                        'title' => $item->variant?->variant_name,
                        'modelCode' => $item->variant?->sku,
                        'condition' => $item->variant?->condition,
                        'ram' => $attrs['RAM'] ?? $attrs['ram'] ?? null,
                        'rom' => $attrs['ROM'] ?? $attrs['rom'] ?? $attrs['Storage'] ?? $attrs['storage'] ?? null,
                        'color' => $attrs['Color'] ?? $attrs['color'] ?? null,
                        'cpu' => $attrs['CPU'] ?? $attrs['cpu'] ?? null,
                        'gpu' => $attrs['GPU'] ?? $attrs['gpu'] ?? null,
                    ],
                ];
            }
        }

        return [
            'main_warehouse' => $mainWarehouse ? ['id' => $mainWarehouse->id, 'name' => $mainWarehouse->name] : null,
            'allocation_data' => $result,
        ];
    }
}
