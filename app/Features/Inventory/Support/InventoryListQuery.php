<?php

namespace App\Features\Inventory\Support;

use App\Models\InventoryItem;
use App\Support\ProductVariantNameSql;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Query\Builder as QueryBuilder;

class InventoryListQuery
{
    public const PER_PAGE_OPTIONS = [10, 25, 50, 100];

    private const ALLOWED_SORTS = [
        'productName',
        'serial_number',
        'warehouseName',
        'encoded_date',
        'stockAgeDays',
        'status',
        'cost_price',
        'cash_price',
        'srp',
    ];

    public function filtersFromRequest(Request $request): array
    {
        $sort = in_array($request->query('sort'), self::ALLOWED_SORTS, true)
            ? $request->query('sort')
            : 'encoded_date';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->query('perPage', 50);

        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 50;
        }

        return [
            'search' => trim((string) $request->query('search', '')),
            'location' => trim((string) $request->query('location', 'all')) ?: 'all',
            'status' => trim((string) $request->query('status', 'all')) ?: 'all',
            'brand' => trim((string) $request->query('brand', 'all')) ?: 'all',
            'category' => trim((string) $request->query('category', 'all')) ?: 'all',
            'stockAge' => trim((string) $request->query('stockAge', 'all')) ?: 'all',
            'sort' => $sort,
            'direction' => $direction,
            'perPage' => $perPage,
        ];
    }

    public function query(array $filters, bool $includeSearch = true): Builder
    {
        $query = InventoryItem::query()
            ->select('inventory_items.*')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->leftJoin('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->leftJoin('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->leftJoin('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->leftJoin('product_categories as subcategories', 'subcategories.id', '=', 'product_masters.subcategory_id')
            ->leftJoin('product_categories as categories', 'categories.id', '=', 'subcategories.parent_category_id')
            ->leftJoin('warehouses', 'warehouses.id', '=', 'inventory_items.warehouse_id');

        $this->addProjection($query);

        $this->applyBrowseFilters($query, $filters);

        if ($includeSearch) {
            $this->applySearchFilter($query, $filters['search'] ?? '');
        }

        return $query;
    }

    public function withInventoryRelations(Builder $query): Builder
    {
        return $query->with(InventoryDataTransformer::INVENTORY_RELATIONS);
    }

    public function applySorting(Builder $query, array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'encoded_date';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $encodedAtExpression = $this->encodedAtExpression();

        switch ($sort) {
            case 'productName':
                $query->orderByRaw(ProductVariantNameSql::expression().' '.$direction);
                break;
            case 'serial_number':
                $query->orderBy('inventory_items.serial_number', $direction);
                break;
            case 'warehouseName':
                $query->orderBy('warehouses.name', $direction);
                break;
            case 'stockAgeDays':
                $query->orderByRaw($encodedAtExpression.' '.($direction === 'asc' ? 'desc' : 'asc'));
                break;
            case 'status':
                $query->orderBy('inventory_items.status', $direction);
                break;
            case 'cost_price':
                $query->orderBy('inventory_items.cost_price', $direction);
                break;
            case 'cash_price':
                $query->orderBy('inventory_items.cash_price', $direction);
                break;
            case 'srp':
                $query->orderBy('inventory_items.srp_price', $direction);
                break;
            case 'encoded_date':
            default:
                $query->orderByRaw($encodedAtExpression.' '.$direction);
                break;
        }

        return $query
            ->orderBy('inventory_items.id', 'desc');
    }

    public function applyExactIdentifierFilter(Builder $query, string $search): Builder
    {
        $needle = trim($search);

        return $query->where(function (Builder $builder) use ($needle) {
            $builder
                ->where('inventory_items.imei', $needle)
                ->orWhere('inventory_items.imei2', $needle)
                ->orWhere('inventory_items.serial_number', $needle);
        });
    }

    public function isIdentifierSearch(string $search): bool
    {
        $search = trim($search);

        if ($search === '' || str_contains($search, ' ') || strlen($search) < 8) {
            return false;
        }

        return preg_match('/^[A-Za-z0-9-]+$/', $search) === 1;
    }

    private function applyBrowseFilters(Builder $query, array $filters): void
    {
        if (($filters['location'] ?? 'all') !== 'all') {
            $query->where('inventory_items.warehouse_id', (int) $filters['location']);
        }

        if (($filters['status'] ?? 'all') !== 'all') {
            if ($filters['status'] === 'available') {
                $query->whereIn('inventory_items.status', ['available', 'active']);
            } else {
                $query->where('inventory_items.status', $filters['status']);
            }
        }

        if (($filters['brand'] ?? 'all') !== 'all') {
            $query->where('product_brands.id', (int) $filters['brand']);
        }

        if (($filters['category'] ?? 'all') !== 'all') {
            $query->where('categories.id', (int) $filters['category']);
        }

        $this->applyStockAgeFilter($query, $filters['stockAge'] ?? 'all');
    }

    private function applySearchFilter(Builder $query, string $search): void
    {
        $tokens = preg_split('/\s+/', trim($search)) ?: [];

        foreach ($tokens as $token) {
            if ($token === '') {
                continue;
            }

            $like = '%'.$token.'%';

            $query->where(function (Builder $builder) use ($like) {
                $builder
                    ->whereRaw(ProductVariantNameSql::expression().' like ?', [$like])
                    ->orWhere('product_brands.name', 'like', $like)
                    ->orWhere('product_models.model_name', 'like', $like)
                    ->orWhere('inventory_items.imei', 'like', $like)
                    ->orWhere('inventory_items.imei2', 'like', $like)
                    ->orWhere('inventory_items.serial_number', 'like', $like)
                    ->orWhere('warehouses.name', 'like', $like)
                    ->orWhere('inventory_items.status', 'like', $like)
                    ->orWhere('inventory_items.warranty', 'like', $like)
                    ->orWhere('product_variants.color', 'like', $like)
                    ->orWhere('product_variants.ram', 'like', $like)
                    ->orWhere('product_variants.rom', 'like', $like)
                    ->orWhere('product_variants.cpu', 'like', $like)
                    ->orWhere('product_variants.gpu', 'like', $like)
                    ->orWhere('inventory_items.cpu', 'like', $like)
                    ->orWhere('inventory_items.gpu', 'like', $like)
                    ->orWhere('inventory_items.grn_number', 'like', $like);
            });
        }
    }

    private function applyStockAgeFilter(Builder $query, string $stockAge): void
    {
        $column = DB::raw($this->encodedAtExpression());
        $now = now()->timezone(config('app.timezone'));

        switch ($stockAge) {
            case 'today':
                $query->whereDate($column, $now->toDateString());
                break;
            case '1-7':
                $query->whereBetween($column, [
                    $this->startOfDay($now->copy()->subDays(7)),
                    $this->endOfDay($now->copy()->subDay()),
                ]);
                break;
            case '8-30':
                $query->whereBetween($column, [
                    $this->startOfDay($now->copy()->subDays(30)),
                    $this->endOfDay($now->copy()->subDays(8)),
                ]);
                break;
            case '31-60':
                $query->whereBetween($column, [
                    $this->startOfDay($now->copy()->subDays(60)),
                    $this->endOfDay($now->copy()->subDays(31)),
                ]);
                break;
            case '61-90':
                $query->whereBetween($column, [
                    $this->startOfDay($now->copy()->subDays(90)),
                    $this->endOfDay($now->copy()->subDays(61)),
                ]);
                break;
            case '90+':
                $query->where($column, '<=', $this->endOfDay($now->copy()->subDays(90)));
                break;
        }
    }

    private function startOfDay(Carbon $date): string
    {
        return $date->startOfDay()->toDateTimeString();
    }

    private function endOfDay(Carbon $date): string
    {
        return $date->endOfDay()->toDateTimeString();
    }

    private function encodedAtExpression(): string
    {
        return 'COALESCE(inventory_items.encoded_at, inventory_items.created_at)';
    }

    private function addProjection(Builder $query): void
    {
        $query->addSelect([
            DB::raw('product_masters.id as product_master_id'),
            DB::raw('product_brands.id as brand_id'),
            DB::raw("COALESCE(product_brands.name, '') as brand_name"),
            DB::raw("COALESCE(product_models.model_name, '') as master_model"),
            DB::raw("COALESCE(".ProductVariantNameSql::expression().", '') as product_name"),
            DB::raw("COALESCE(warehouses.name, 'N/A') as warehouse_name"),
            DB::raw('categories.id as category_id'),
            DB::raw("COALESCE(categories.name, '') as category_name"),
            DB::raw('subcategories.id as subcategory_id'),
            DB::raw("COALESCE(subcategories.name, '') as subcategory_name"),
            DB::raw('product_variants.condition as variant_condition'),
        ])->addSelect([
            DB::raw('product_variants.ram as attr_ram'),
            DB::raw('product_variants.rom as attr_rom'),
            DB::raw('product_variants.color as attr_color'),
            DB::raw('product_variants.cpu as variant_cpu'),
            DB::raw('product_variants.gpu as variant_gpu'),
            'platform_cpu' => $this->productMasterSpecValueSubquery(['platform_cpu', 'cpu']),
            'platform_gpu' => $this->productMasterSpecValueSubquery(['platform_gpu', 'gpu']),
        ]);
    }

    private function productMasterSpecValueSubquery(array $keys): QueryBuilder
    {
        return DB::table('product_master_spec_values')
            ->select('product_master_spec_values.value')
            ->join('product_spec_definitions', 'product_spec_definitions.id', '=', 'product_master_spec_values.product_spec_definition_id')
            ->whereColumn('product_master_spec_values.product_master_id', 'product_masters.id')
            ->whereIn('product_spec_definitions.key', $keys)
            ->orderByRaw($this->keyPriorityOrderExpression('product_spec_definitions.key', $keys))
            ->orderBy('product_spec_definitions.sort_order')
            ->limit(1);
    }

    private function keyPriorityOrderExpression(string $column, array $keys): string
    {
        $cases = collect(array_values($keys))
            ->map(fn (string $key, int $index) => "WHEN '{$key}' THEN {$index}")
            ->implode(' ');

        return "CASE {$column} {$cases} ELSE ".count($keys).' END';
    }
}
