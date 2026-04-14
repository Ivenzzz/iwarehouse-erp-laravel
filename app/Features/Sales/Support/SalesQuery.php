<?php

namespace App\Features\Sales\Support;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Features\Pos\Support\PosDataTransformer;
use App\Models\SalesTransaction;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class SalesQuery
{
    public const PER_PAGE_OPTIONS = [10, 25, 50, 100];
    private const DEFAULT_PER_PAGE = 25;

    private const ALLOWED_SORTS = [
        'or_number' => 'or_number',
        'transaction_number' => 'transaction_number',
        'transaction_date' => 'created_at',
        'total_amount' => 'total_amount',
    ];

    private ?Collection $warehousePayload = null;

    public function __construct(
        private readonly PosDataTransformer $posDataTransformer,
    ) {
    }

    public function filtersFromRequest(Request $request): array
    {
        $warehouse = trim((string) $request->query('warehouse', 'all')) ?: 'all';

        if ($warehouse !== 'all' && (! ctype_digit($warehouse) || ! Warehouse::query()->whereKey((int) $warehouse)->exists())) {
            $warehouse = 'all';
        }

        $sort = trim((string) $request->query('sort', 'transaction_date'));
        if (! array_key_exists($sort, self::ALLOWED_SORTS)) {
            $sort = 'transaction_date';
        }

        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $week = trim((string) $request->query('week', 'all')) ?: 'all';
        if ($week !== 'all' && ! preg_match('/^\d{4}-W\d{1,2}$/', $week)) {
            $week = 'all';
        }

        $day = trim((string) $request->query('day', ''));
        if ($day !== '' && Carbon::hasFormat($day, 'Y-m-d') === false) {
            $day = '';
        }

        $perPage = (int) $request->query('perPage', self::DEFAULT_PER_PAGE);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = self::DEFAULT_PER_PAGE;
        }

        $page = max(1, (int) $request->query('page', 1));

        return [
            'search' => trim((string) $request->query('search', '')),
            'warehouse' => $warehouse,
            'week' => $week,
            'day' => $day,
            'sort' => $sort,
            'direction' => $direction,
            'perPage' => $perPage,
            'page' => $page,
        ];
    }

    public function warehouses(): Collection
    {
        if ($this->warehousePayload === null) {
            $this->warehousePayload = Warehouse::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Warehouse $warehouse) => InventoryDataTransformer::transformWarehouse($warehouse))
                ->values();
        }

        return $this->warehousePayload;
    }

    public function rows(array $filters): LengthAwarePaginator
    {
        return $this->transactionQuery($filters)
            ->paginate($filters['perPage'], ['*'], 'page', $filters['page'])
            ->withQueryString()
            ->through(fn (SalesTransaction $transaction) => $this->transformRow($transaction));
    }

    public function exportRows(array $filters): Collection
    {
        return $this->transactionQuery($filters)
            ->get()
            ->map(function (SalesTransaction $transaction): array {
                $row = $this->transformRow($transaction);
                $paymentSummary = collect($row['payments_json']['payments'] ?? [])
                    ->map(fn (array $payment) => trim(($payment['payment_method'] ?? 'Unknown').' ('.number_format((float) ($payment['amount'] ?? 0), 2).')'))
                    ->implode(', ');

                return [
                    'OR Number' => $row['or_number'],
                    'DR Number' => $row['transaction_number'],
                    'Date/Time' => $row['transaction_date'],
                    'Branch' => $row['warehouse_name'],
                    'Customer' => $row['customer_name'],
                    'Staff' => $row['sales_representative_name'],
                    'Payment Methods' => $paymentSummary,
                    'Amount' => (float) $row['total_amount'],
                ];
            })
            ->values();
    }

    public function transactionDetail(SalesTransaction $transaction): array
    {
        return $this->posDataTransformer->transformTransaction($transaction);
    }

    private function transactionQuery(array $filters): Builder
    {
        $query = SalesTransaction::query()
            ->with([
                'customer.contacts',
                'customer.addresses',
                'salesRepresentative.jobTitle.department',
                'posSession.warehouse',
                'items.inventoryItem.productVariant.productMaster.model.brand',
                'items.inventoryItem.productVariant.productMaster.subcategory.parent',
                'items.components.inventoryItem.productVariant.productMaster.model.brand',
                'payments.paymentMethod',
                'payments.detail.documents',
                'documents',
            ]);

        if ($filters['warehouse'] !== 'all') {
            $query->whereHas('posSession', fn (Builder $builder) => $builder->where('warehouse_id', (int) $filters['warehouse']));
        }

        if ($filters['day'] !== '') {
            $query->whereDate('created_at', $filters['day']);
        } elseif ($filters['week'] !== 'all') {
            [$year, $week] = explode('-W', $filters['week']);
            $start = Carbon::now()->setISODate((int) $year, (int) $week)->startOfDay();
            $end = $start->copy()->addDays(6)->endOfDay();
            $query->whereBetween('created_at', [$start, $end]);
        }

        $this->applySearch($query, $filters['search']);

        $query->orderBy(self::ALLOWED_SORTS[$filters['sort']], $filters['direction'])
            ->orderByDesc('id');

        return $query;
    }

    private function applySearch(Builder $query, string $search): void
    {
        $tokens = preg_split('/\s+/', trim($search)) ?: [];

        foreach ($tokens as $token) {
            if ($token === '') {
                continue;
            }

            $like = '%'.$token.'%';

            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('or_number', 'like', $like)
                    ->orWhere('transaction_number', 'like', $like)
                    ->orWhereHas('customer', function (Builder $customerQuery) use ($like): void {
                        $customerQuery
                            ->where('firstname', 'like', $like)
                            ->orWhere('lastname', 'like', $like)
                            ->orWhere('organization_name', 'like', $like)
                            ->orWhere('legal_name', 'like', $like);
                    })
                    ->orWhereHas('salesRepresentative', function (Builder $employeeQuery) use ($like): void {
                        $employeeQuery
                            ->where('first_name', 'like', $like)
                            ->orWhere('last_name', 'like', $like)
                            ->orWhere('employee_id', 'like', $like);
                    })
                    ->orWhereHas('posSession.warehouse', fn (Builder $warehouseQuery) => $warehouseQuery->where('name', 'like', $like))
                    ->orWhereHas('payments.paymentMethod', fn (Builder $paymentMethodQuery) => $paymentMethodQuery->where('name', 'like', $like))
                    ->orWhereHas('items.inventoryItem', function (Builder $inventoryQuery) use ($like): void {
                        $inventoryQuery
                            ->where('imei', 'like', $like)
                            ->orWhere('imei2', 'like', $like)
                            ->orWhere('serial_number', 'like', $like)
                            ->orWhere('warranty', 'like', $like);
                    })
                    ->orWhereHas('items.inventoryItem.productVariant', function (Builder $variantQuery) use ($like): void {
                        $variantQuery
                            ->where('sku', 'like', $like)
                            ->orWhere('condition', 'like', $like)
                            ->orWhere('model_code', 'like', $like)
                            ->orWhere('ram', 'like', $like)
                            ->orWhere('rom', 'like', $like)
                            ->orWhere('color', 'like', $like)
                            ->orWhereHas('productMaster.model.brand', function (Builder $brandQuery) use ($like): void {
                                $brandQuery
                                    ->where('name', 'like', $like)
                                    ->orWhereHas('models', fn (Builder $modelQuery) => $modelQuery->where('model_name', 'like', $like));
                            });
                    });
            });
        }
    }

    private function transformRow(SalesTransaction $transaction): array
    {
        $payload = $this->posDataTransformer->transformTransaction($transaction);

        return [
            'id' => $payload['id'],
            'transaction_number' => $payload['transaction_number'],
            'or_number' => $payload['or_number'],
            'transaction_date' => $payload['transaction_date'],
            'warehouse_name' => $payload['warehouse_name'] ?? 'N/A',
            'customer_name' => $payload['customer_name'] ?? 'Walk-in Customer',
            'sales_representative_name' => $payload['sales_representative_name'] ?? 'N/A',
            'payments_json' => $payload['payments_json'],
            'total_amount' => (float) $payload['total_amount'],
        ];
    }
}
