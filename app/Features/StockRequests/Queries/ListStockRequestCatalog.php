<?php

namespace App\Features\StockRequests\Queries;

use App\Models\ProductVariant;
use App\Support\ProductVariantNameSql;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ListStockRequestCatalog
{
    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 50);
        $warehouseId = (int) ($validated['warehouse_id'] ?? 0);
        $mainWarehouseId = (int) (Warehouse::query()->where('warehouse_type', 'main_warehouse')->value('id') ?? 0);
        $allWarehouses = Warehouse::query()->select(['id', 'name'])->get()->keyBy('id');

        $query = ProductVariant::query()
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->select(['product_variants.id', 'product_variants.product_master_id', 'product_variants.sku', 'product_variants.condition', 'product_variants.model_code', 'product_variants.color', 'product_variants.ram', 'product_variants.rom', 'product_variants.cpu', 'product_variants.gpu', 'product_variants.ram_type', 'product_variants.rom_type', 'product_variants.operating_system', 'product_variants.screen'])
            ->selectRaw(ProductVariantNameSql::expression().' as variant_name')
            ->with([
                'productMaster:id,model_id',
                'productMaster.model:id,brand_id,model_name',
                'productMaster.model.brand:id,name',
            ])
            ->where('is_active', true)
            ->orderByRaw(ProductVariantNameSql::expression());

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($inner) use ($like) {
                $inner->whereRaw(ProductVariantNameSql::expression().' like ?', [$like])
                    ->orWhere('sku', 'like', $like)
                    ->orWhere('color', 'like', $like)
                    ->orWhere('ram', 'like', $like)
                    ->orWhere('rom', 'like', $like)
                    ->orWhereHas('productMaster.model', fn ($q) => $q->where('model_name', 'like', $like))
                    ->orWhereHas('productMaster.model.brand', fn ($q) => $q->where('name', 'like', $like));
            });
        }

        $variants = $query->limit($limit)->get();
        $variantIds = $variants->pluck('id')->all();

        $stockRows = collect();
        $sales7Rows = collect();
        $sales14Rows = collect();
        $sales28Rows = collect();
        $incomingTransferRows = collect();

        if (! empty($variantIds)) {
            $stockRows = DB::table('inventory_items')
                ->selectRaw('product_variant_id as variant_id, warehouse_id, COUNT(*) as qty')
                ->whereIn('product_variant_id', $variantIds)
                ->where('status', 'available')
                ->groupBy('product_variant_id', 'warehouse_id')
                ->get();

            if ($warehouseId > 0) {
                $sales7Rows = $this->aggregateSalesByDays($variantIds, $warehouseId, 7);
                $sales14Rows = $this->aggregateSalesByDays($variantIds, $warehouseId, 14);
                $sales28Rows = $this->aggregateSalesByDays($variantIds, $warehouseId, 28);

                $incomingTransferRows = DB::table('stock_transfer_items')
                    ->join('stock_transfers', 'stock_transfers.id', '=', 'stock_transfer_items.stock_transfer_id')
                    ->join('inventory_items', 'inventory_items.id', '=', 'stock_transfer_items.inventory_item_id')
                    ->selectRaw('inventory_items.product_variant_id as variant_id, COUNT(*) as qty')
                    ->whereIn('inventory_items.product_variant_id', $variantIds)
                    ->where('stock_transfers.destination_warehouse_id', $warehouseId)
                    ->whereIn('stock_transfers.status', ['shipped', 'in_transit'])
                    ->where('stock_transfer_items.is_received', false)
                    ->groupBy('inventory_items.product_variant_id')
                    ->get();
            }
        }

        $stockByVariantWarehouse = $stockRows->groupBy('variant_id');
        $sales7ByVariant = $sales7Rows->keyBy('variant_id');
        $sales14ByVariant = $sales14Rows->keyBy('variant_id');
        $sales28ByVariant = $sales28Rows->keyBy('variant_id');
        $incomingByVariant = $incomingTransferRows->keyBy('variant_id');

        return [
            'items' => $variants->map(function (ProductVariant $variant) use (
                $stockByVariantWarehouse,
                $sales7ByVariant,
                $sales14ByVariant,
                $sales28ByVariant,
                $warehouseId,
                $mainWarehouseId,
                $incomingByVariant,
                $allWarehouses
            ) {
                $attributes = $variant->attributesMap();

                $perWarehouseStock = ($stockByVariantWarehouse[$variant->id] ?? collect());
                $stockByBranches = $perWarehouseStock
                    ->mapWithKeys(fn ($row) => [(string) $row->warehouse_id => (int) $row->qty])
                    ->all();

                $sales7 = (int) ($sales7ByVariant[$variant->id]->qty ?? 0);
                $sales14 = (int) ($sales14ByVariant[$variant->id]->qty ?? 0);
                $sales28 = (int) ($sales28ByVariant[$variant->id]->qty ?? 0);

                $ads7 = $sales7 / 7;
                $ads14 = $sales14 / 14;
                $ads28 = $sales28 / 28;
                $avgAds = ($ads7 + $ads14) / 2;

                $currentStock = (int) ($stockByBranches[(string) $warehouseId] ?? 0);
                $warehouseStock = (int) ($stockByBranches[(string) $mainWarehouseId] ?? 0);
                $incomingTransferQty = (int) ($incomingByVariant[$variant->id]->qty ?? 0);
                $incomingPoQty = 0;
                $recommendedQty = max(0, (int) ceil(($avgAds * 7) - $currentStock));

                $otherBranches = collect($stockByBranches)
                    ->map(fn ($qty, $whId) => [
                        'warehouse_id' => (int) $whId,
                        'warehouse_name' => $allWarehouses[(int) $whId]->name ?? 'Unknown Branch',
                        'qty' => (int) $qty,
                    ])
                    ->filter(fn ($entry) => $entry['warehouse_id'] !== $warehouseId && $entry['warehouse_id'] !== $mainWarehouseId && $entry['qty'] > 0)
                    ->values()
                    ->all();

                return [
                    'id' => $variant->id,
                    'variant_name' => $variant->variant_name,
                    'variant_sku' => $variant->sku,
                    'condition' => $variant->condition,
                    'brand' => $variant->productMaster?->model?->brand?->name,
                    'model' => $variant->productMaster?->model?->model_name,
                    'variant_attributes' => $attributes,
                    'metrics' => [
                        'current_stock' => $currentStock,
                        'main_warehouse_stock' => $warehouseStock,
                        'stock_by_branches' => $stockByBranches,
                        'other_branches' => $otherBranches,
                        'incoming_transfer_to_branch' => [
                            'quantity' => $incomingTransferQty,
                            'eta' => null,
                        ],
                        'incoming_po_to_warehouse' => $incomingPoQty,
                        'sales' => [
                            'sales7' => $sales7,
                            'sales14' => $sales14,
                            'sales28' => $sales28,
                        ],
                        'ads' => [
                            'ads7' => $ads7,
                            'ads14' => $ads14,
                            'ads28' => $ads28,
                        ],
                        'recommended_qty' => $recommendedQty,
                    ],
                ];
            })->values()->all(),
        ];
    }

    private function aggregateSalesByDays(array $variantIds, int $warehouseId, int $days)
    {
        return DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('inventory_items', 'inventory_items.id', '=', 'sales_transaction_items.inventory_item_id')
            ->selectRaw('inventory_items.product_variant_id as variant_id, COUNT(*) as qty')
            ->whereIn('inventory_items.product_variant_id', $variantIds)
            ->where('inventory_items.warehouse_id', $warehouseId)
            ->where('sales_transactions.created_at', '>=', now()->subDays($days))
            ->groupBy('inventory_items.product_variant_id')
            ->get();
    }
}
