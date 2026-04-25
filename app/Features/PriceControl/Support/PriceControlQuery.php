<?php

namespace App\Features\PriceControl\Support;

use App\Models\InventoryItem;
use App\Support\ProductVariantNameSql;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PriceControlQuery
{
    public const PER_PAGE_OPTIONS = [10, 25, 50, 100, 500, 1000];

    public const ELIGIBLE_STATUSES = [
        'available',
        'active',
        'in_transit',
        'reserved',
        'reserved_for_transfer',
        'qc_pending',
    ];

    public const FILTER_STATUS_OPTIONS = [
        ['value' => 'all', 'label' => 'All Eligible Statuses'],
        ['value' => 'available', 'label' => 'available'],
        ['value' => 'in_transit', 'label' => 'in transit'],
        ['value' => 'reserved', 'label' => 'reserved'],
        ['value' => 'reserved_for_transfer', 'label' => 'reserved for transfer'],
        ['value' => 'qc_pending', 'label' => 'qc pending'],
    ];

    private const ALLOWED_SORTS = [
        'product',
        'identifier',
        'warehouse',
        'status',
        'cash_price',
        'srp',
    ];

    public function filtersFromRequest(Request $request): array
    {
        $mode = $request->query('mode') === 'identifier' ? 'identifier' : 'variant';
        $sort = in_array($request->query('sort'), self::ALLOWED_SORTS, true)
            ? $request->query('sort')
            : 'product';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->query('perPage', 25);

        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 25;
        }

        $status = trim((string) $request->query('status', 'all')) ?: 'all';
        $allowedFilterStatuses = collect(self::FILTER_STATUS_OPTIONS)->pluck('value')->all();
        if (! in_array($status, $allowedFilterStatuses, true)) {
            $status = 'all';
        }

        return [
            'mode' => $mode,
            'variant_id' => $request->query('variant_id') !== null && $request->query('variant_id') !== ''
                ? (int) $request->query('variant_id')
                : null,
            'product_master_id' => $request->query('product_master_id') !== null && $request->query('product_master_id') !== ''
                ? (int) $request->query('product_master_id')
                : null,
            'variant_ram' => trim((string) $request->query('variant_ram', '')),
            'variant_rom' => trim((string) $request->query('variant_rom', '')),
            'condition' => trim((string) $request->query('condition', '')),
            'identifier' => trim((string) $request->query('identifier', '')),
            'warehouse' => trim((string) $request->query('warehouse', 'all')) ?: 'all',
            'status' => $status,
            'sort' => $sort,
            'direction' => $direction,
            'perPage' => $perPage,
        ];
    }

    public function hasSearch(array $filters): bool
    {
        if (($filters['mode'] ?? 'variant') === 'identifier') {
            return ($filters['identifier'] ?? '') !== '';
        }

        return ! empty($filters['variant_id']) || ! empty($filters['product_master_id']);
    }

    public function query(array $filters): Builder
    {
        $query = InventoryItem::query()
            ->select('inventory_items.*')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->leftJoin('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->leftJoin('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->leftJoin('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->leftJoin('product_categories as subcategories', 'subcategories.id', '=', 'product_masters.subcategory_id')
            ->leftJoin('product_categories as categories', 'categories.id', '=', 'subcategories.parent_category_id')
            ->leftJoin('warehouses', 'warehouses.id', '=', 'inventory_items.warehouse_id')
            ->whereIn('inventory_items.status', self::ELIGIBLE_STATUSES);

        $this->addProjection($query);
        $this->applySearch($query, $filters);
        $this->applyFilters($query, $filters);

        return $query;
    }

    public function eligibleItemsByIds(array $itemIds): Builder
    {
        return InventoryItem::query()
            ->whereIn('id', $itemIds)
            ->whereIn('status', self::ELIGIBLE_STATUSES);
    }

    public function applySorting(Builder $query, array $filters): Builder
    {
        $direction = ($filters['direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        switch ($filters['sort'] ?? 'product') {
            case 'identifier':
                $query->orderByRaw('COALESCE(inventory_items.imei, inventory_items.imei2, inventory_items.serial_number, \'\') '.$direction);
                break;
            case 'warehouse':
                $query->orderBy('warehouses.name', $direction);
                break;
            case 'status':
                $query->orderBy('inventory_items.status', $direction);
                break;
            case 'cash_price':
                $query->orderBy('inventory_items.cash_price', $direction);
                break;
            case 'srp':
                $query->orderBy('inventory_items.srp_price', $direction);
                break;
            case 'product':
            default:
                $query
                    ->orderBy('product_brands.name', $direction)
                    ->orderBy('product_models.model_name', $direction)
                    ->orderByRaw(ProductVariantNameSql::expression().' '.$direction);
                break;
        }

        return $query->orderBy('inventory_items.id');
    }

    public function transformInventoryRow(InventoryItem $item): array
    {
        $identifier = collect([$item->imei, $item->imei2, $item->serial_number])
            ->first(fn ($value) => filled($value));
        $brand = $this->nullableString($item->getAttribute('brand_name'));
        $model = $this->nullableString($item->getAttribute('model_name'));
        $productLabel = trim(collect([$brand, $model])->filter()->implode(' '));
        $status = $this->normalizeStatus($item->status);

        return [
            'id' => $item->id,
            'product_master_id' => $this->nullableInt($item->getAttribute('product_master_id')),
            'variant_id' => $this->nullableInt($item->product_variant_id),
            'warehouse_id' => $this->nullableInt($item->warehouse_id),
            'product_label' => $productLabel !== '' ? $productLabel : 'Unknown Product',
            'variant_label' => $this->nullableString($item->getAttribute('variant_name')) ?? '-',
            'identifier' => $identifier ?: '-',
            'imei1' => $item->imei,
            'imei2' => $item->imei2,
            'serial_number' => $item->serial_number,
            'warehouse_name' => $this->nullableString($item->getAttribute('warehouse_name')) ?? '-',
            'status' => $status,
            'status_label' => str_replace('_', ' ', $status),
            'cash_price' => $item->cash_price !== null ? (float) $item->cash_price : null,
            'cash_price_formatted' => $this->formatCurrency($item->cash_price),
            'srp' => $item->srp_price !== null ? (float) $item->srp_price : null,
            'srp_formatted' => $this->formatCurrency($item->srp_price),
            'brandName' => $brand ?? '',
            'masterModel' => $model ?? '',
            'categoryName' => $this->nullableString($item->getAttribute('category_name')) ?? '',
            'subcategoryName' => $this->nullableString($item->getAttribute('subcategory_name')) ?? '',
            'variantCondition' => $this->nullableString($item->getAttribute('variant_condition')) ?? 'Brand New',
            'warranty_description' => $item->warranty,
            'attrRAM' => $this->nullableString($item->getAttribute('attr_ram')) ?? '',
            'attrROM' => $this->nullableString($item->getAttribute('attr_rom')) ?? '',
            'ram_type' => $this->nullableString($item->getAttribute('attr_ram_type')) ?? '',
            'rom_type' => $this->nullableString($item->getAttribute('attr_rom_type')) ?? '',
            'attrColor' => $this->nullableString($item->getAttribute('attr_color')) ?? '',
            'cpu' => $this->nullableString($item->getAttribute('variant_cpu')),
            'gpu' => $this->nullableString($item->getAttribute('variant_gpu')),
            'screen' => $this->nullableString($item->getAttribute('variant_screen')) ?? '',
            'platform_cpu' => $this->nullableString($item->getAttribute('platform_cpu')) ?? '',
            'platform_gpu' => $this->nullableString($item->getAttribute('platform_gpu')) ?? '',
        ];
    }

    public function transformVariantRow(object $variant): array
    {
        $brandName = $this->nullableString($variant->brand_name);
        $modelName = $this->nullableString($variant->model_name);
        $variantRam = $this->nullableString($variant->variant_ram ?? null);
        $variantRom = $this->nullableString($variant->variant_rom ?? null);
        $variantName = trim(collect([$brandName, $modelName, $variantRam, $variantRom])->filter()->implode(' '));
        $variantName = $variantName !== '' ? $variantName : $variant->variant_name;
        $description = collect([$brandName, $modelName, $variantRam, $variantRom, $variant->condition])->filter()->implode(' | ');
        $label = trim(collect([$brandName, $modelName])->filter()->implode(' '));

        return [
            'id' => (int) $variant->id,
            'product_master_id' => (int) $variant->product_master_id,
            'variant_name' => $variantName,
            'variant_sku' => $variant->sku,
            'master_sku' => $variant->master_sku,
            'condition' => $variant->condition,
            'variant_ram' => $variantRam,
            'variant_rom' => $variantRom,
            'variants_count' => (int) ($variant->variants_count ?? 1),
            'brand_name' => $brandName,
            'product_name' => $label,
            'label' => $variantName,
            'description' => $description,
        ];
    }

    public function normalizeStatus(?string $status): string
    {
        $status = trim((string) $status);

        return $status === 'active' || $status === '' ? 'available' : $status;
    }

    public function formatCurrency(mixed $value): string
    {
        return '₱'.number_format((float) ($value ?? 0), 2);
    }

    private function applySearch(Builder $query, array $filters): void
    {
        if (! $this->hasSearch($filters)) {
            $query->whereRaw('1 = 0');

            return;
        }

        if (($filters['mode'] ?? 'variant') === 'identifier') {
            $identifier = $filters['identifier'];

            $query->where(function (Builder $builder) use ($identifier) {
                $builder
                    ->where('inventory_items.imei', $identifier)
                    ->orWhere('inventory_items.imei2', $identifier)
                    ->orWhere('inventory_items.serial_number', $identifier);
            });

            return;
        }

        if (! empty($filters['product_master_id'])) {
            $query->where('product_variants.product_master_id', (int) $filters['product_master_id']);

            if (($filters['variant_ram'] ?? '') !== '') {
                $query->where('product_variants.ram', $filters['variant_ram']);
            }

            if (($filters['variant_rom'] ?? '') !== '') {
                $query->where('product_variants.rom', $filters['variant_rom']);
            }

            if (($filters['condition'] ?? '') !== '') {
                $query->where('product_variants.condition', $filters['condition']);
            }

            return;
        }

        $query->where('inventory_items.product_variant_id', (int) $filters['variant_id']);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (($filters['warehouse'] ?? 'all') !== 'all') {
            $query->where('inventory_items.warehouse_id', (int) $filters['warehouse']);
        }

        if (($filters['status'] ?? 'all') === 'available') {
            $query->whereIn('inventory_items.status', ['available', 'active']);
        } elseif (($filters['status'] ?? 'all') !== 'all') {
            $query->where('inventory_items.status', $filters['status']);
        }
    }

    private function addProjection(Builder $query): void
    {
        $query->addSelect([
            DB::raw('product_masters.id as product_master_id'),
            DB::raw("COALESCE(product_brands.name, '') as brand_name"),
            DB::raw("COALESCE(product_models.model_name, '') as model_name"),
            DB::raw("COALESCE(".ProductVariantNameSql::expression().", '') as variant_name"),
            DB::raw("COALESCE(warehouses.name, '') as warehouse_name"),
            DB::raw("COALESCE(categories.name, '') as category_name"),
            DB::raw("COALESCE(subcategories.name, '') as subcategory_name"),
            DB::raw('product_variants.condition as variant_condition'),
        ])->addSelect([
            DB::raw('product_variants.ram as attr_ram'),
            DB::raw('product_variants.rom as attr_rom'),
            DB::raw('product_variants.ram_type as attr_ram_type'),
            DB::raw('product_variants.rom_type as attr_rom_type'),
            DB::raw('product_variants.color as attr_color'),
            DB::raw('product_variants.cpu as variant_cpu'),
            DB::raw('product_variants.gpu as variant_gpu'),
            DB::raw('product_variants.screen as variant_screen'),
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

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
