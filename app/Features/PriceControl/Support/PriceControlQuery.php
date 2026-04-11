<?php

namespace App\Features\PriceControl\Support;

use App\Models\InventoryItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PriceControlQuery
{
    public const PER_PAGE_OPTIONS = [10, 25, 50, 100];

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

        return ! empty($filters['variant_id']);
    }

    public function query(array $filters): Builder
    {
        $query = InventoryItem::query()
            ->select('inventory_items.*')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->leftJoin('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->leftJoin('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->leftJoin('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
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
                    ->orderBy('product_variants.variant_name', $direction);
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
        ];
    }

    public function transformVariantRow(object $variant): array
    {
        $brandName = $this->nullableString($variant->brand_name);
        $modelName = $this->nullableString($variant->model_name);
        $description = collect([$brandName, $modelName, $variant->condition])->filter()->implode(' | ');
        $label = trim(collect([$brandName, $modelName])->filter()->implode(' '));

        return [
            'id' => (int) $variant->id,
            'product_master_id' => (int) $variant->product_master_id,
            'variant_name' => $variant->variant_name,
            'variant_sku' => $variant->sku,
            'master_sku' => $variant->master_sku,
            'condition' => $variant->condition,
            'brand_name' => $brandName,
            'product_name' => $label,
            'label' => trim($label.' - '.$variant->variant_name, ' -'),
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
            DB::raw("COALESCE(product_variants.variant_name, '') as variant_name"),
            DB::raw("COALESCE(warehouses.name, '') as warehouse_name"),
        ]);
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
