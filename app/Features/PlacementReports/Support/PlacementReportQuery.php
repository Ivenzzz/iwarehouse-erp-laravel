<?php

namespace App\Features\PlacementReports\Support;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Models\InventoryItem;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PlacementReportQuery
{
    public const PAGE_SIZE = 50;

    private const REPORTABLE_STATUSES = [
        'available',
        'reserved_for_transfer',
        'qc_pending',
        'in_transit',
        'bundled',
        'quality_check',
    ];

    private const ALLOWED_SORTS = [
        'display_name',
        'total',
        'warehouse',
    ];

    private ?Collection $warehouseModels = null;
    private ?Collection $warehousePayload = null;

    public function filtersFromRequest(Request $request): array
    {
        $warehouse = trim((string) $request->query('warehouse', 'all')) ?: 'all';

        if ($warehouse !== 'all' && (! ctype_digit($warehouse) || ! Warehouse::query()->whereKey((int) $warehouse)->exists())) {
            $warehouse = 'all';
        }

        $sort = trim((string) $request->query('sort', 'display_name'));
        if (! in_array($sort, self::ALLOWED_SORTS, true)) {
            $sort = 'display_name';
        }

        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';
        $sortWarehouseId = trim((string) $request->query('sort_warehouse_id', ''));

        if ($sort === 'warehouse') {
            if (! ctype_digit($sortWarehouseId) || ! $this->warehouseModels()->contains('id', (int) $sortWarehouseId)) {
                $sort = 'display_name';
                $sortWarehouseId = '';
            }
        } else {
            $sortWarehouseId = '';
        }

        return [
            'search' => trim((string) $request->query('search', '')),
            'warehouse' => $warehouse,
            'sort' => $sort,
            'sort_warehouse_id' => $sortWarehouseId,
            'direction' => $direction,
            'page' => max(1, (int) $request->query('page', 1)),
        ];
    }

    public function warehouses(): Collection
    {
        if ($this->warehousePayload === null) {
            $this->warehousePayload = $this->warehouseModels()
                ->map(fn (Warehouse $warehouse) => InventoryDataTransformer::transformWarehouse($warehouse))
                ->values();
        }

        return $this->warehousePayload;
    }

    public function masterRowsPage(array $filters): array
    {
        $paginator = $this->masterRowsQuery($filters)->paginate(
            self::PAGE_SIZE,
            ['*'],
            'page',
            (int) $filters['page'],
        );

        return [
            'rows' => $this->transformMasterRows(collect($paginator->items()), $filters),
            'pagination' => $this->transformPaginator($paginator),
        ];
    }

    public function summary(array $filters): array
    {
        $totals = $this->footerSummaryRow($filters);

        return [
            'totalStores' => collect($totals['warehouses'])->filter(fn (int $quantity) => $quantity > 0)->count(),
            'totalUniqueProducts' => $totals['totalUniqueProducts'],
            'totalItems' => $totals['totalItems'],
        ];
    }

    public function footerTotals(array $filters): array
    {
        $totals = $this->footerSummaryRow($filters);

        return [
            'grandTotal' => $totals['totalItems'],
            'warehouses' => $totals['warehouses'],
        ];
    }

    public function variantRows(int $productMasterId, array $filters): array
    {
        return $this->variantRowsQuery($productMasterId)
            ->get()
            ->map(fn (object $row) => [
                'variant_id' => (int) $row->variant_id,
                'variant_name' => (string) $row->variant_name,
                'condition' => (string) ($row->variant_condition ?? ''),
                'totalQty' => (int) $row->total_qty,
                'totalValuation' => round((float) $row->total_valuation, 2),
                'warehouseData' => $this->transformWarehouseData($row),
                'warehouseMetricQty' => $this->metricStockForRow($row, $filters, totalField: 'total_qty'),
            ])
            ->values()
            ->all();
    }

    public function itemRows(int $warehouseId, ?int $variantId = null, ?int $productMasterId = null): array
    {
        $query = InventoryItem::query()
            ->with(InventoryDataTransformer::INVENTORY_RELATIONS)
            ->where('warehouse_id', $warehouseId)
            ->whereIn('status', self::REPORTABLE_STATUSES)
            ->orderByRaw('COALESCE(imei, imei2, serial_number, id)');

        if ($variantId !== null) {
            $query->where('product_variant_id', $variantId);
        } elseif ($productMasterId !== null) {
            $query->whereHas('productVariant', function (EloquentBuilder $builder) use ($productMasterId): void {
                $builder->where('product_master_id', $productMasterId);
            });
        }

        $items = $query->get()
            ->map(fn (InventoryItem $item) => InventoryDataTransformer::transformInventoryItem($item))
            ->values();

        $warehouseName = Warehouse::query()->whereKey($warehouseId)->value('name') ?? 'Warehouse';

        if ($variantId !== null) {
            $variantName = ProductVariant::query()->whereKey($variantId)->value('variant_name') ?? 'Variant';
        } else {
            $productMaster = ProductMaster::query()->with('model.brand')->findOrFail($productMasterId);
            $variantName = trim(implode(' ', array_filter([
                $productMaster->model?->brand?->name,
                $productMaster->model?->model_name,
            ])));
        }

        return [
            'items' => $items->all(),
            'warehouseName' => $warehouseName,
            'variantName' => $variantName,
        ];
    }

    public function exportVariantRows(array $filters): Collection
    {
        return $this->exportVariantRowsQuery($filters)
            ->get()
            ->map(fn (object $row) => $this->transformExportVariantRow($row, $filters))
            ->values();
    }

    private function warehouseModels(): Collection
    {
        if ($this->warehouseModels === null) {
            $this->warehouseModels = Warehouse::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'sort_order']);
        }

        return $this->warehouseModels;
    }

    private function footerSummaryRow(array $filters): array
    {
        $query = DB::query()->fromSub($this->masterRowsQuery($filters, applySorting: false), 'placement_rows')
            ->selectRaw('COUNT(*) as total_unique_products')
            ->selectRaw('COALESCE(SUM(total), 0) as total_items');

        foreach ($this->warehouseModels() as $warehouse) {
            $query->selectRaw('COALESCE(SUM(warehouse_qty_'.$warehouse->id.'), 0) as warehouse_total_'.$warehouse->id);
        }

        $row = $query->first();
        $warehouseTotals = [];

        foreach ($this->warehouseModels() as $warehouse) {
            $warehouseTotals[$warehouse->id] = (int) ($row->{'warehouse_total_'.$warehouse->id} ?? 0);
        }

        return [
            'totalUniqueProducts' => (int) ($row->total_unique_products ?? 0),
            'totalItems' => (int) ($row->total_items ?? 0),
            'warehouses' => $warehouseTotals,
        ];
    }

    private function masterRowsQuery(array $filters, bool $applySorting = true): QueryBuilder
    {
        $query = $this->inventoryBaseQuery()
            ->leftJoinSub($this->salesMetricsSubquery($filters), 'sales_metrics', function ($join): void {
                $join->on('sales_metrics.product_master_id', '=', 'product_masters.id');
            })
            ->whereIn('product_masters.id', $this->matchingProductMastersSubquery($filters))
            ->groupBy('product_masters.id', 'product_brands.name', 'product_models.model_name')
            ->selectRaw('product_masters.id as product_master_id')
            ->selectRaw("COALESCE(product_brands.name, '') as brand_name")
            ->selectRaw("COALESCE(product_models.model_name, '') as model_name")
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(COALESCE(inventory_items.cost_price, 0)), 0) as total_valuation')
            ->selectRaw('COALESCE(MAX(sales_metrics.sold_15), 0) as sold_15')
            ->selectRaw('COALESCE(MAX(sales_metrics.sold_30), 0) as sold_30');

        foreach ($this->warehouseModels() as $warehouse) {
            $query->selectRaw($this->warehouseQuantityExpression((int) $warehouse->id).' as warehouse_qty_'.$warehouse->id);
            $query->selectRaw($this->warehouseValuationExpression((int) $warehouse->id).' as warehouse_valuation_'.$warehouse->id);
        }

        if ($applySorting) {
            $this->applyMasterSorting($query, $filters);
        }

        return $query;
    }

    private function variantRowsQuery(int $productMasterId): QueryBuilder
    {
        $query = $this->inventoryBaseQuery()
            ->where('product_masters.id', $productMasterId)
            ->groupBy('product_variants.id', 'product_variants.variant_name', 'product_variants.condition')
            ->selectRaw('product_variants.id as variant_id')
            ->selectRaw("COALESCE(product_variants.variant_name, '') as variant_name")
            ->selectRaw("COALESCE(product_variants.condition, '') as variant_condition")
            ->selectRaw('COUNT(*) as total_qty')
            ->selectRaw('COALESCE(SUM(COALESCE(inventory_items.cost_price, 0)), 0) as total_valuation')
            ->orderBy('product_variants.variant_name')
            ->orderBy('product_variants.id');

        foreach ($this->warehouseModels() as $warehouse) {
            $query->selectRaw($this->warehouseQuantityExpression((int) $warehouse->id).' as warehouse_qty_'.$warehouse->id);
            $query->selectRaw($this->warehouseValuationExpression((int) $warehouse->id).' as warehouse_valuation_'.$warehouse->id);
        }

        return $query;
    }

    private function exportVariantRowsQuery(array $filters): QueryBuilder
    {
        $query = $this->inventoryBaseQuery()
            ->leftJoinSub($this->salesMetricsSubquery($filters), 'sales_metrics', function ($join): void {
                $join->on('sales_metrics.product_master_id', '=', 'product_masters.id');
            })
            ->whereIn('product_masters.id', $this->matchingProductMastersSubquery($filters))
            ->groupBy(
                'product_masters.id',
                'product_brands.name',
                'product_models.model_name',
                'product_variants.id',
                'product_variants.variant_name',
                'product_variants.condition'
            )
            ->selectRaw('product_masters.id as product_master_id')
            ->selectRaw("COALESCE(product_brands.name, '') as brand_name")
            ->selectRaw("COALESCE(product_models.model_name, '') as model_name")
            ->selectRaw('product_variants.id as variant_id')
            ->selectRaw("COALESCE(product_variants.variant_name, '') as variant_name")
            ->selectRaw("COALESCE(product_variants.condition, '') as variant_condition")
            ->selectRaw('COUNT(*) as total_qty')
            ->selectRaw('COALESCE(SUM(COALESCE(inventory_items.cost_price, 0)), 0) as total_valuation')
            ->selectRaw('COALESCE(MAX(sales_metrics.sold_15), 0) as sold_15')
            ->selectRaw('COALESCE(MAX(sales_metrics.sold_30), 0) as sold_30');

        foreach ($this->warehouseModels() as $warehouse) {
            $query->selectRaw($this->warehouseQuantityExpression((int) $warehouse->id).' as warehouse_qty_'.$warehouse->id);
            $query->selectRaw($this->warehouseValuationExpression((int) $warehouse->id).' as warehouse_valuation_'.$warehouse->id);
        }

        $this->applyVariantExportSorting($query, $filters);

        return $query;
    }

    private function inventoryBaseQuery(): QueryBuilder
    {
        return DB::table('inventory_items')
            ->join('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->whereIn('inventory_items.status', self::REPORTABLE_STATUSES);
    }

    private function matchingProductMastersSubquery(array $filters): QueryBuilder
    {
        $query = $this->inventoryBaseQuery()
            ->select('product_masters.id')
            ->groupBy('product_masters.id');

        $this->applySearchFilter($query, $filters['search']);

        if ($filters['warehouse'] !== 'all') {
            $query->havingRaw($this->warehouseQuantityExpression((int) $filters['warehouse']).' > 0');
        }

        return $query;
    }

    private function salesMetricsSubquery(array $filters): QueryBuilder
    {
        $cutoff15 = Carbon::now()->subDays(15)->toDateTimeString();
        $cutoff30 = Carbon::now()->subDays(30)->toDateTimeString();

        $query = DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('pos_sessions', 'pos_sessions.id', '=', 'sales_transactions.pos_session_id')
            ->join('inventory_items as sold_inventory', 'sold_inventory.id', '=', 'sales_transaction_items.inventory_item_id')
            ->join('product_variants as sold_variants', 'sold_variants.id', '=', 'sold_inventory.product_variant_id')
            ->join('product_masters as sold_masters', 'sold_masters.id', '=', 'sold_variants.product_master_id')
            ->selectRaw('sold_masters.id as product_master_id')
            ->selectRaw('SUM(CASE WHEN sales_transactions.created_at >= ? THEN 1 ELSE 0 END) as sold_15', [$cutoff15])
            ->selectRaw('SUM(CASE WHEN sales_transactions.created_at >= ? THEN 1 ELSE 0 END) as sold_30', [$cutoff30])
            ->groupBy('sold_masters.id');

        if ($filters['warehouse'] !== 'all') {
            $query->where('pos_sessions.warehouse_id', (int) $filters['warehouse']);
        }

        return $query;
    }

    private function applySearchFilter(QueryBuilder $query, string $search): void
    {
        $tokens = preg_split('/\s+/', trim($search)) ?: [];

        foreach ($tokens as $token) {
            if ($token === '') {
                continue;
            }

            $like = '%'.$token.'%';
            $query->where(function (QueryBuilder $builder) use ($like): void {
                $builder
                    ->where('product_brands.name', 'like', $like)
                    ->orWhere('product_models.model_name', 'like', $like);
            });
        }
    }

    private function applyMasterSorting(QueryBuilder $query, array $filters): void
    {
        $direction = $filters['direction'] === 'desc' ? 'desc' : 'asc';

        if ($filters['sort'] === 'total') {
            $query->orderByRaw('COUNT(*) '.$direction);
        } elseif ($filters['sort'] === 'warehouse' && $filters['sort_warehouse_id'] !== '') {
            $query->orderByRaw($this->warehouseQuantityExpression((int) $filters['sort_warehouse_id']).' '.$direction);
        } else {
            $query->orderBy('product_brands.name', $direction)
                ->orderBy('product_models.model_name', $direction);
        }

        $query->orderBy('product_brands.name')
            ->orderBy('product_models.model_name')
            ->orderBy('product_masters.id');
    }

    private function applyVariantExportSorting(QueryBuilder $query, array $filters): void
    {
        $direction = $filters['direction'] === 'desc' ? 'desc' : 'asc';

        if ($filters['sort'] === 'total') {
            $query->orderByRaw('COUNT(*) '.$direction);
        } elseif ($filters['sort'] === 'warehouse' && $filters['sort_warehouse_id'] !== '') {
            $query->orderByRaw($this->warehouseQuantityExpression((int) $filters['sort_warehouse_id']).' '.$direction);
        } else {
            $query->orderBy('product_brands.name', $direction)
                ->orderBy('product_models.model_name', $direction);
        }

        $query->orderBy('product_brands.name')
            ->orderBy('product_models.model_name')
            ->orderBy('product_variants.variant_name')
            ->orderBy('product_variants.id');
    }

    private function transformMasterRows(Collection $rows, array $filters): array
    {
        return $rows->map(function (object $row) use ($filters): array {
            $brandName = trim((string) $row->brand_name);
            $modelName = trim((string) $row->model_name);
            $displayName = trim(implode(' ', array_filter([$brandName, $modelName])));
            $sold15 = (int) $row->sold_15;
            $avgPerDay = round($sold15 / 15, 2);
            $metricStock = $this->metricStockForRow($row, $filters);
            $inventoryLife = $avgPerDay > 0 ? round($metricStock / $avgPerDay, 1) : null;
            $suggestedPo = $avgPerDay > 0 ? (int) max(0, ceil((30 * $avgPerDay) - $metricStock)) : 0;

            return [
                'product_master_id' => (int) $row->product_master_id,
                'display_name' => $displayName,
                'brand_name' => $brandName,
                'model_name' => $modelName,
                'total' => (int) $row->total,
                'warehouses' => $this->transformWarehouseQuantities($row),
                'warehouseValuations' => $this->transformWarehouseValuations($row),
                'totalValuation' => round((float) $row->total_valuation, 2),
                'sold15' => $sold15,
                'sold30' => (int) $row->sold_30,
                'avgSellOutPerDay' => $avgPerDay,
                'inventoryLifeDays' => $inventoryLife,
                'suggestedPoQty' => $suggestedPo,
            ];
        })->values()->all();
    }

    private function transformExportVariantRow(object $row, array $filters): array
    {
        $brandName = trim((string) $row->brand_name);
        $modelName = trim((string) $row->model_name);
        $displayName = trim(implode(' ', array_filter([$brandName, $modelName])));
        $sold15 = (int) $row->sold_15;
        $avgPerDay = round($sold15 / 15, 2);
        $metricStock = $this->metricStockForRow($row, $filters, totalField: 'total_qty');
        $inventoryLife = $avgPerDay > 0 ? round($metricStock / $avgPerDay, 1) : null;
        $suggestedPo = $avgPerDay > 0 ? (int) max(0, ceil((30 * $avgPerDay) - $metricStock)) : 0;

        return [
            'product' => $displayName,
            'variant' => (string) $row->variant_name,
            'condition' => (string) ($row->variant_condition ?? ''),
            'totalItems' => (int) $row->total_qty,
            'warehouses' => $this->transformWarehouseQuantities($row),
            'valuation' => round((float) $row->total_valuation, 2),
            'sold15' => $sold15,
            'sold30' => (int) $row->sold_30,
            'avgSellOutPerDay' => $avgPerDay,
            'inventoryLifeDays' => $inventoryLife,
            'suggestedPoQty' => $suggestedPo,
        ];
    }

    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        return [
            'page' => $paginator->currentPage(),
            'hasMore' => $paginator->hasMorePages(),
            'total' => $paginator->total(),
            'perPage' => $paginator->perPage(),
        ];
    }

    private function transformWarehouseData(object $row): array
    {
        $data = [];

        foreach ($this->warehouseModels() as $warehouse) {
            $data[$warehouse->id] = [
                'qty' => (int) ($row->{'warehouse_qty_'.$warehouse->id} ?? 0),
                'valuation' => round((float) ($row->{'warehouse_valuation_'.$warehouse->id} ?? 0), 2),
            ];
        }

        return $data;
    }

    private function transformWarehouseQuantities(object $row): array
    {
        $data = [];

        foreach ($this->warehouseModels() as $warehouse) {
            $data[$warehouse->id] = (int) ($row->{'warehouse_qty_'.$warehouse->id} ?? 0);
        }

        return $data;
    }

    private function transformWarehouseValuations(object $row): array
    {
        $data = [];

        foreach ($this->warehouseModels() as $warehouse) {
            $data[$warehouse->id] = round((float) ($row->{'warehouse_valuation_'.$warehouse->id} ?? 0), 2);
        }

        return $data;
    }

    private function metricStockForRow(object $row, array $filters, string $totalField = 'total'): int
    {
        if ($filters['warehouse'] === 'all') {
            return (int) ($row->{$totalField} ?? 0);
        }

        return (int) ($row->{'warehouse_qty_'.(int) $filters['warehouse']} ?? 0);
    }

    private function warehouseQuantityExpression(int $warehouseId): string
    {
        return 'SUM(CASE WHEN inventory_items.warehouse_id = '.$warehouseId.' THEN 1 ELSE 0 END)';
    }

    private function warehouseValuationExpression(int $warehouseId): string
    {
        return 'SUM(CASE WHEN inventory_items.warehouse_id = '.$warehouseId.' THEN COALESCE(inventory_items.cost_price, 0) ELSE 0 END)';
    }
}
