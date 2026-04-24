<?php

namespace App\Features\ProductReports\Queries;

use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProductReportQuery
{
    public const DEFAULT_PER_PAGE = 25;
    public const PER_PAGE_OPTIONS = [10, 25, 50, 100, 250];

    private const SORT_MAP = [
        'branch' => 'warehouses.name',
        'customerName' => 'customer_name',
        'contactNo' => 'contact_no',
        'drNumber' => 'sales_transactions.transaction_number',
        'orNumber' => 'sales_transactions.or_number',
        'brand' => 'product_brands.name',
        'model' => 'product_models.model_name',
        'product' => 'product_name',
        'category' => 'categories.name',
        'subcategory' => 'subcategories.name',
        'condition' => 'product_variants.condition',
        'cost' => 'sales_transaction_items.snapshot_cost_price',
        'color' => 'product_variants.color',
        'supplierName' => 'supplier_name',
        'supplierContact' => 'supplier_contact',
        'quantity' => 'quantity',
        'barcode' => 'barcode',
        'value' => 'sales_transaction_items.line_total',
        'salesPerson' => 'sales_person',
        'date' => 'sales_transactions.created_at',
        'time' => 'sales_transactions.created_at',
        'weekNumber' => 'sales_transactions.created_at',
        'month' => 'sales_transactions.created_at',
        'year' => 'sales_transactions.created_at',
        'rawDate' => 'sales_transactions.created_at',
    ];

    public function filtersFromRequest(Request $request): array
    {
        $sort = trim((string) $request->query('sort', 'rawDate'));
        if (! array_key_exists($sort, self::SORT_MAP)) {
            $sort = 'rawDate';
        }

        $direction = strtolower(trim((string) $request->query('direction', 'desc'))) === 'asc' ? 'asc' : 'desc';

        $warehouseId = trim((string) $request->query('warehouse_id', ''));
        if ($warehouseId !== '' && (! ctype_digit($warehouseId) || ! Warehouse::query()->whereKey((int) $warehouseId)->exists())) {
            $warehouseId = '';
        }

        $perPage = (int) $request->query('per_page', self::DEFAULT_PER_PAGE);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = self::DEFAULT_PER_PAGE;
        }

        return [
            'search' => trim((string) $request->query('search', '')),
            'start_date' => $this->normalizeDate($request->query('start_date')),
            'end_date' => $this->normalizeDate($request->query('end_date')),
            'warehouse_id' => $warehouseId,
            'brand' => trim((string) $request->query('brand', '')),
            'product' => trim((string) $request->query('product', '')),
            'sort' => $sort,
            'direction' => $direction,
            'page' => max(1, (int) $request->query('page', 1)),
            'per_page' => $perPage,
        ];
    }

    public function pageData(array $filters): array
    {
        $paginator = $this->buildRowsQuery($filters)->paginate(
            (int) $filters['per_page'],
            ['*'],
            'page',
            (int) $filters['page'],
        );

        $rows = collect($paginator->items());
        $transactionPayments = $this->paymentsByTransaction($filters);
        $paymentTypeNames = $this->paymentTypeNames($transactionPayments);

        return [
            'rows' => $rows->map(fn (object $row) => $this->transformRow($row, $transactionPayments))->values()->all(),
            'pagination' => $this->pagination($paginator),
            'summary' => $this->summary($filters),
            'options' => [
                'brands' => $this->brands($filters),
                'warehouses' => $this->warehouses(),
            ],
            'paymentTypeNames' => $paymentTypeNames,
            'filters' => [
                'search' => $filters['search'],
                'startDate' => $filters['start_date'],
                'endDate' => $filters['end_date'],
                'warehouseId' => $filters['warehouse_id'],
                'brandFilter' => $filters['brand'],
                'productFilter' => $filters['product'],
                'sortBy' => $filters['sort'],
                'sortDir' => $filters['direction'],
                'perPage' => $filters['per_page'],
            ],
        ];
    }

    public function exportRows(array $filters): array
    {
        $rows = $this->buildRowsQuery($filters, applyPagination: false)->get();
        $transactionPayments = $this->paymentsByTransaction($filters);

        return [
            'rows' => $rows->map(fn (object $row) => $this->transformRow($row, $transactionPayments))->values()->all(),
            'paymentTypeNames' => $this->paymentTypeNames($transactionPayments),
        ];
    }

    private function buildRowsQuery(array $filters, bool $applyPagination = true): Builder
    {
        $productNameSql = $this->productNameSql();
        $customerNameSql = $this->fullNameSql('customers.firstname', 'customers.lastname');
        $salesPersonSql = $this->fullNameSql('employees.first_name', 'employees.last_name');

        $query = DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('pos_sessions', 'pos_sessions.id', '=', 'sales_transactions.pos_session_id')
            ->join('warehouses', 'warehouses.id', '=', 'pos_sessions.warehouse_id')
            ->join('customers', 'customers.id', '=', 'sales_transactions.customer_id')
            ->leftJoin('employees', 'employees.id', '=', 'sales_transactions.sales_representative_id')
            ->join('inventory_items', 'inventory_items.id', '=', 'sales_transaction_items.inventory_item_id')
            ->join('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->leftJoin('product_categories as subcategories', 'subcategories.id', '=', 'product_masters.subcategory_id')
            ->leftJoin('product_categories as categories', 'categories.id', '=', 'subcategories.parent_category_id')
            ->leftJoin('goods_receipts', 'goods_receipts.grn_number', '=', 'inventory_items.grn_number')
            ->leftJoin('delivery_receipts', 'delivery_receipts.id', '=', 'goods_receipts.delivery_receipt_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'delivery_receipts.supplier_id')
            ->leftJoin('supplier_contacts', 'supplier_contacts.supplier_id', '=', 'suppliers.id')
            ->whereNotNull('sales_transactions.created_at')
            ->select([
                'sales_transaction_items.id',
                'sales_transactions.id as transaction_id',
                'sales_transactions.transaction_number',
                'sales_transactions.or_number',
                'sales_transactions.created_at as transaction_date',
                'warehouses.id as warehouse_id',
                'warehouses.name as branch',
                DB::raw("{$customerNameSql} as customer_name"),
                DB::raw("COALESCE((SELECT phone FROM customer_contacts WHERE customer_contacts.customer_id = customers.id ORDER BY is_primary DESC, id ASC LIMIT 1), '-') as contact_no"),
                'product_brands.name as brand',
                'product_models.model_name as model',
                DB::raw("{$productNameSql} as product_name"),
                DB::raw("COALESCE(categories.name, '-') as category_name"),
                DB::raw("COALESCE(subcategories.name, '-') as subcategory_name"),
                DB::raw("COALESCE(product_variants.condition, '-') as item_condition"),
                DB::raw("COALESCE(sales_transaction_items.snapshot_cost_price, 0) as cost"),
                DB::raw("COALESCE(product_variants.color, '-') as color"),
                DB::raw("COALESCE(NULLIF(suppliers.trade_name, ''), NULLIF(suppliers.legal_business_name, ''), '-') as supplier_name"),
                DB::raw("COALESCE(supplier_contacts.mobile, '-') as supplier_contact"),
                DB::raw('1 as quantity'),
                DB::raw("COALESCE(inventory_items.imei, inventory_items.imei2, inventory_items.serial_number, '-') as barcode"),
                DB::raw('COALESCE(sales_transaction_items.line_total, 0) as value'),
                DB::raw("COALESCE(NULLIF({$salesPersonSql}, ''), '-') as sales_person"),
            ]);

        $this->applyFilters($query, $filters, $productNameSql);
        $this->applySorting($query, $filters);

        return $query;
    }

    private function summary(array $filters): array
    {
        $base = $this->summaryBaseQuery($filters);

        $aggregates = (clone $base)
            ->selectRaw('COUNT(sales_transaction_items.id) as total_rows')
            ->selectRaw('COALESCE(SUM(sales_transaction_items.line_total), 0) as total_value')
            ->selectRaw('COUNT(DISTINCT sales_transactions.id) as unique_transactions')
            ->first();

        return [
            'totalRows' => (int) ($aggregates->total_rows ?? 0),
            'totalValue' => round((float) ($aggregates->total_value ?? 0), 2),
            'totalQuantity' => (int) ($aggregates->total_rows ?? 0),
            'uniqueTransactions' => (int) ($aggregates->unique_transactions ?? 0),
        ];
    }

    private function paymentsByTransaction(array $filters): array
    {
        $transactionIds = $this->summaryBaseQuery($filters)
            ->select('sales_transactions.id')
            ->distinct()
            ->pluck('sales_transactions.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($transactionIds === []) {
            return [];
        }

        $rows = DB::table('sales_transaction_payments')
            ->join('payment_methods', 'payment_methods.id', '=', 'sales_transaction_payments.payment_method_id')
            ->leftJoin('sales_transaction_payment_details', 'sales_transaction_payment_details.sales_transaction_payment_id', '=', 'sales_transaction_payments.id')
            ->whereIn('sales_transaction_payments.sales_transaction_id', $transactionIds)
            ->select([
                'sales_transaction_payments.sales_transaction_id as transaction_id',
                'payment_methods.name as payment_method_name',
                'sales_transaction_payment_details.bank as bank_name',
                'sales_transaction_payments.amount',
            ])
            ->get();

        $grouped = [];

        foreach ($rows as $row) {
            $transactionId = (int) $row->transaction_id;
            $method = trim((string) ($row->payment_method_name ?? 'Unknown'));
            $bank = trim((string) ($row->bank_name ?? ''));
            $key = $bank !== '' ? sprintf('%s (%s)', $method, $bank) : $method;

            if (! isset($grouped[$transactionId])) {
                $grouped[$transactionId] = [];
            }

            $grouped[$transactionId][$key] = round(($grouped[$transactionId][$key] ?? 0) + (float) ($row->amount ?? 0), 2);
        }

        return $grouped;
    }

    private function paymentTypeNames(array $transactionPayments): array
    {
        $names = collect($transactionPayments)
            ->flatMap(fn (array $payments) => array_keys($payments))
            ->unique()
            ->sort()
            ->values()
            ->all();

        return array_values($names);
    }

    private function summaryBaseQuery(array $filters): Builder
    {
        $productNameSql = $this->productNameSql();

        $query = DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('pos_sessions', 'pos_sessions.id', '=', 'sales_transactions.pos_session_id')
            ->join('warehouses', 'warehouses.id', '=', 'pos_sessions.warehouse_id')
            ->join('customers', 'customers.id', '=', 'sales_transactions.customer_id')
            ->join('inventory_items', 'inventory_items.id', '=', 'sales_transaction_items.inventory_item_id')
            ->join('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->whereNotNull('sales_transactions.created_at');

        $this->applyFilters($query, $filters, $productNameSql);

        return $query;
    }

    private function applyFilters(Builder $query, array $filters, string $productNameSql): void
    {
        $query
            ->when($filters['start_date'] !== '', fn (Builder $builder) => $builder->whereDate('sales_transactions.created_at', '>=', $filters['start_date']))
            ->when($filters['end_date'] !== '', fn (Builder $builder) => $builder->whereDate('sales_transactions.created_at', '<=', $filters['end_date']))
            ->when($filters['warehouse_id'] !== '', fn (Builder $builder) => $builder->where('pos_sessions.warehouse_id', (int) $filters['warehouse_id']))
            ->when($filters['brand'] !== '', fn (Builder $builder) => $builder->where('product_brands.name', $filters['brand']))
            ->when($filters['product'] !== '', fn (Builder $builder) => $builder->whereRaw("{$productNameSql} like ?", ['%'.$filters['product'].'%']))
            ->when($filters['search'] !== '', function (Builder $builder) use ($filters, $productNameSql): void {
                $like = '%'.$filters['search'].'%';
                $builder->where(function (Builder $inner) use ($like, $productNameSql): void {
                    $inner
                        ->where('sales_transactions.transaction_number', 'like', $like)
                        ->orWhere('sales_transactions.or_number', 'like', $like)
                        ->orWhere('warehouses.name', 'like', $like)
                        ->orWhere('product_brands.name', 'like', $like)
                        ->orWhere('product_models.model_name', 'like', $like)
                        ->orWhereRaw("{$productNameSql} like ?", [$like])
                        ->orWhere('inventory_items.imei', 'like', $like)
                        ->orWhere('inventory_items.imei2', 'like', $like)
                        ->orWhere('inventory_items.serial_number', 'like', $like)
                        ->orWhere('customers.firstname', 'like', $like)
                        ->orWhere('customers.lastname', 'like', $like)
                        ->orWhereRaw($this->fullNameSql('customers.firstname', 'customers.lastname')." like ?", [$like]);
                });
            });
    }

    private function applySorting(Builder $query, array $filters): void
    {
        $sortColumn = self::SORT_MAP[$filters['sort']] ?? self::SORT_MAP['rawDate'];
        $direction = $filters['direction'] === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortColumn, $direction)
            ->orderBy('sales_transaction_items.id', $direction);
    }

    private function brands(array $filters): array
    {
        $query = DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('pos_sessions', 'pos_sessions.id', '=', 'sales_transactions.pos_session_id')
            ->join('inventory_items', 'inventory_items.id', '=', 'sales_transaction_items.inventory_item_id')
            ->join('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->select('product_brands.name')
            ->distinct()
            ->orderBy('product_brands.name');

        if ($filters['start_date'] !== '') {
            $query->whereDate('sales_transactions.created_at', '>=', $filters['start_date']);
        }

        if ($filters['end_date'] !== '') {
            $query->whereDate('sales_transactions.created_at', '<=', $filters['end_date']);
        }

        if ($filters['warehouse_id'] !== '') {
            $query->where('pos_sessions.warehouse_id', (int) $filters['warehouse_id']);
        }

        return $query->pluck('product_brands.name')->filter()->values()->all();
    }

    private function warehouses(): array
    {
        return Warehouse::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Warehouse $warehouse) => [
                'id' => (string) $warehouse->id,
                'name' => $warehouse->name,
            ])
            ->values()
            ->all();
    }

    private function transformRow(object $row, array $transactionPayments): array
    {
        $date = Carbon::parse($row->transaction_date);
        $transactionId = (int) $row->transaction_id;
        $payments = $transactionPayments[$transactionId] ?? [];

        return [
            'id' => (string) $row->id,
            'branch' => (string) $row->branch,
            'warehouseId' => (string) $row->warehouse_id,
            'customerName' => trim((string) $row->customer_name) !== '' ? trim((string) $row->customer_name) : '-',
            'contactNo' => (string) $row->contact_no,
            'drNumber' => (string) $row->transaction_number,
            'orNumber' => (string) $row->or_number,
            'brand' => (string) $row->brand,
            'model' => (string) $row->model,
            'product' => (string) $row->product_name,
            'category' => (string) $row->category_name,
            'subcategory' => (string) $row->subcategory_name,
            'condition' => (string) $row->item_condition,
            'cost' => (float) $row->cost,
            'color' => (string) $row->color,
            'paymentType' => $this->paymentTypeDisplay($payments),
            'paymentAmounts' => $payments,
            'supplierName' => (string) $row->supplier_name,
            'supplierContact' => (string) $row->supplier_contact,
            'quantity' => (int) $row->quantity,
            'barcode' => (string) $row->barcode,
            'value' => (float) $row->value,
            'salesPerson' => (string) $row->sales_person,
            'date' => $date->format('m-d-Y'),
            'time' => strtolower($date->format('g:i A')),
            'weekNumber' => $date->isoWeek(),
            'month' => $date->format('F'),
            'year' => (int) $date->format('Y'),
            'rawDate' => $date->toDateTimeString(),
        ];
    }

    private function paymentTypeDisplay(array $payments): string
    {
        if ($payments === []) {
            return '-';
        }

        return collect($payments)
            ->map(fn ($amount, $name) => sprintf('%s (?%s)', $name, number_format((float) $amount, 2)))
            ->implode(', ');
    }

    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }

    private function normalizeDate(mixed $value): string
    {
        $date = trim((string) ($value ?? ''));
        if ($date === '') {
            return '';
        }

        try {
            return Carbon::createFromFormat('Y-m-d', $date)->format('Y-m-d');
        } catch (\Throwable) {
            return '';
        }
    }

    private function productNameSql(): string
    {
        if (DB::getDriverName() === 'sqlite') {
            return "TRIM(COALESCE(product_brands.name, '') || ' ' || COALESCE(product_models.model_name, '') || ' ' || COALESCE(product_variants.model_code, '') || ' ' || COALESCE(product_variants.ram, '') || ' ' || COALESCE(product_variants.rom, '') || ' ' || COALESCE(product_variants.color, ''))";
        }

        return "TRIM(CONCAT_WS(' ', NULLIF(product_brands.name, ''), NULLIF(product_models.model_name, ''), NULLIF(product_variants.model_code, ''), NULLIF(product_variants.ram, ''), NULLIF(product_variants.rom, ''), NULLIF(product_variants.color, '')))";
    }

    private function fullNameSql(string $firstNameColumn, string $lastNameColumn): string
    {
        if (DB::getDriverName() === 'sqlite') {
            return "TRIM(COALESCE({$firstNameColumn}, '') || ' ' || COALESCE({$lastNameColumn}, ''))";
        }

        return "TRIM(CONCAT(COALESCE({$firstNameColumn}, ''), ' ', COALESCE({$lastNameColumn}, '')))";
    }
}
