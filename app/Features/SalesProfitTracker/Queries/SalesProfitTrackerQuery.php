<?php

namespace App\Features\SalesProfitTracker\Queries;

use App\Features\SalesProfitTracker\Support\MdrCalculator;
use App\Models\Warehouse;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class SalesProfitTrackerQuery
{
    public const DEFAULT_PER_PAGE = 15;
    public const PER_PAGE_OPTIONS = [15, 25, 50, 100];

    private const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

    private const SORT_MAP = [
        'transaction_date' => 'sales_transactions.created_at',
        'transaction_number' => 'sales_transactions.transaction_number',
        'warehouse_name' => 'warehouses.name',
        'revenue' => 'sales_transactions.total_amount',
        'cost' => 'items_agg.total_cost',
        'gross_profit' => 'gross_profit',
        'mdr' => 'mdr_agg.total_mdr',
        'net_profit' => 'net_profit',
        'net_margin' => 'net_margin',
    ];

    public function filtersFromRequest(Request $request): array
    {
        $period = strtolower(trim((string) $request->query('period', 'monthly')));
        if (! in_array($period, self::PERIODS, true)) {
            $period = 'monthly';
        }

        $referenceDate = $this->normalizeDate($request->query('reference_date')) ?? now()->toDateString();

        $warehouseId = trim((string) $request->query('warehouse_id', 'all'));
        if ($warehouseId !== 'all') {
            if (! ctype_digit($warehouseId) || ! Warehouse::query()->whereKey((int) $warehouseId)->exists()) {
                $warehouseId = 'all';
            }
        }

        $sort = trim((string) $request->query('sort', 'transaction_date'));
        if (! array_key_exists($sort, self::SORT_MAP)) {
            $sort = 'transaction_date';
        }

        $direction = strtolower(trim((string) $request->query('direction', 'desc')));
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        $perPage = (int) $request->query('per_page', self::DEFAULT_PER_PAGE);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = self::DEFAULT_PER_PAGE;
        }

        return [
            'period' => $period,
            'reference_date' => $referenceDate,
            'warehouse_id' => $warehouseId,
            'search' => trim((string) $request->query('search', '')),
            'sort' => $sort,
            'direction' => $direction,
            'page' => max(1, (int) $request->query('page', 1)),
            'per_page' => $perPage,
        ];
    }

    public function pageData(array $filters): array
    {
        $currentRange = $this->rangeForPeriod($filters['period'], Carbon::parse($filters['reference_date']));
        $previousRange = $this->previousRangeForPeriod($filters['period'], Carbon::parse($filters['reference_date']));

        $rowsPaginator = $this->rows($filters, $currentRange);
        $rowTransactionIds = collect($rowsPaginator->items())->pluck('id')->map(fn ($id) => (int) $id)->all();
        $mdrDetails = $this->mdrDetailsByTransaction($rowTransactionIds);

        return [
            'filters' => [
                'period' => $filters['period'],
                'referenceDate' => $filters['reference_date'],
                'warehouseId' => $filters['warehouse_id'],
                'search' => $filters['search'],
                'sort' => $filters['sort'],
                'direction' => $filters['direction'],
                'perPage' => $filters['per_page'],
            ],
            'options' => [
                'warehouses' => $this->warehouses(),
            ],
            'kpis' => [
                'current' => $this->kpis($filters, $currentRange),
                'previous' => $this->kpis($filters, $previousRange),
            ],
            'chart' => $this->chart($filters, $currentRange),
            'rows' => collect($rowsPaginator->items())
                ->map(fn (object $row) => $this->transformRow($row, $mdrDetails[(int) $row->id] ?? []))
                ->values()
                ->all(),
            'pagination' => [
                'page' => $rowsPaginator->currentPage(),
                'per_page' => $rowsPaginator->perPage(),
                'total' => $rowsPaginator->total(),
                'last_page' => $rowsPaginator->lastPage(),
            ],
        ];
    }

    public function exportRows(array $filters): array
    {
        $currentRange = $this->rangeForPeriod($filters['period'], Carbon::parse($filters['reference_date']));

        $query = $this->baseRowsQuery($filters, $currentRange, includeSearch: true);
        $this->applySorting($query, $filters);

        $rows = $query->get();
        $ids = $rows->pluck('id')->map(fn ($id) => (int) $id)->all();
        $mdrDetails = $this->mdrDetailsByTransaction($ids);

        return $rows
            ->map(fn (object $row) => $this->transformRow($row, $mdrDetails[(int) $row->id] ?? []))
            ->values()
            ->all();
    }

    private function rows(array $filters, array $range): LengthAwarePaginator
    {
        $query = $this->baseRowsQuery($filters, $range, includeSearch: true);
        $this->applySorting($query, $filters);

        return $query->paginate(
            $filters['per_page'],
            ['*'],
            'page',
            $filters['page'],
        );
    }

    private function baseRowsQuery(array $filters, array $range, bool $includeSearch): Builder
    {
        $query = DB::table('sales_transactions')
            ->join('pos_sessions', 'pos_sessions.id', '=', 'sales_transactions.pos_session_id')
            ->join('warehouses', 'warehouses.id', '=', 'pos_sessions.warehouse_id')
            ->leftJoinSub($this->itemsAggregateSubquery(), 'items_agg', function ($join): void {
                $join->on('items_agg.sales_transaction_id', '=', 'sales_transactions.id');
            })
            ->leftJoinSub($this->mdrAggregateSubquery(), 'mdr_agg', function ($join): void {
                $join->on('mdr_agg.sales_transaction_id', '=', 'sales_transactions.id');
            })
            ->whereBetween('sales_transactions.created_at', [$range['start']->toDateTimeString(), $range['end']->toDateTimeString()])
            ->when($filters['warehouse_id'] !== 'all', fn (Builder $builder) => $builder->where('pos_sessions.warehouse_id', (int) $filters['warehouse_id']))
            ->select([
                'sales_transactions.id',
                'sales_transactions.transaction_number',
                'sales_transactions.created_at as transaction_date',
                'sales_transactions.total_amount as revenue',
                'warehouses.name as warehouse_name',
                DB::raw('COALESCE(items_agg.total_cost, 0) as cost'),
                DB::raw('COALESCE(items_agg.total_units, 0) as total_units'),
                DB::raw('COALESCE(mdr_agg.total_mdr, 0) as mdr'),
                DB::raw('COALESCE(sales_transactions.total_amount, 0) - COALESCE(items_agg.total_cost, 0) as gross_profit'),
                DB::raw('(COALESCE(sales_transactions.total_amount, 0) - COALESCE(items_agg.total_cost, 0) - COALESCE(mdr_agg.total_mdr, 0)) as net_profit'),
                DB::raw("CASE WHEN COALESCE(sales_transactions.total_amount, 0) > 0 THEN ((COALESCE(sales_transactions.total_amount, 0) - COALESCE(items_agg.total_cost, 0) - COALESCE(mdr_agg.total_mdr, 0)) / COALESCE(sales_transactions.total_amount, 0)) * 100 ELSE 0 END as net_margin"),
            ]);

        if ($includeSearch && $filters['search'] !== '') {
            $like = '%'.$filters['search'].'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('sales_transactions.transaction_number', 'like', $like)
                    ->orWhere('warehouses.name', 'like', $like);
            });
        }

        return $query;
    }

    private function itemsAggregateSubquery(): Builder
    {
        return DB::table('sales_transaction_items')
            ->selectRaw('sales_transaction_id, COALESCE(SUM(snapshot_cost_price), 0) as total_cost, COUNT(*) as total_units')
            ->groupBy('sales_transaction_id');
    }

    private function mdrAggregateSubquery(): Builder
    {
        $rateSql = MdrCalculator::sqlRateExpression('sales_transaction_payment_details.loan_term_months');

        return DB::table('sales_transaction_payments')
            ->join('payment_methods', 'payment_methods.id', '=', 'sales_transaction_payments.payment_method_id')
            ->leftJoin('sales_transaction_payment_details', 'sales_transaction_payment_details.sales_transaction_payment_id', '=', 'sales_transaction_payments.id')
            ->selectRaw('sales_transaction_payments.sales_transaction_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN LOWER(payment_methods.name) = 'credit card' THEN sales_transaction_payments.amount * (($rateSql) / 100) ELSE 0 END), 0) as total_mdr")
            ->groupBy('sales_transaction_payments.sales_transaction_id');
    }

    private function mdrDetailsByTransaction(array $transactionIds): array
    {
        if ($transactionIds === []) {
            return [];
        }

        $rateSql = MdrCalculator::sqlRateExpression('sales_transaction_payment_details.loan_term_months');

        $rows = DB::table('sales_transaction_payments')
            ->join('payment_methods', 'payment_methods.id', '=', 'sales_transaction_payments.payment_method_id')
            ->leftJoin('sales_transaction_payment_details', 'sales_transaction_payment_details.sales_transaction_payment_id', '=', 'sales_transaction_payments.id')
            ->whereIn('sales_transaction_payments.sales_transaction_id', $transactionIds)
            ->orderBy('sales_transaction_payments.id')
            ->select([
                'sales_transaction_payments.sales_transaction_id',
                'payment_methods.name as method',
                'sales_transaction_payment_details.bank',
                'sales_transaction_payment_details.loan_term_months',
                'sales_transaction_payments.amount',
                DB::raw("CASE WHEN LOWER(payment_methods.name) = 'credit card' THEN ($rateSql) ELSE 0 END as rate"),
                DB::raw("CASE WHEN LOWER(payment_methods.name) = 'credit card' THEN sales_transaction_payments.amount * (($rateSql) / 100) ELSE 0 END as deduction"),
            ])
            ->get();

        $grouped = [];

        foreach ($rows as $row) {
            $transactionId = (int) $row->sales_transaction_id;
            if (! isset($grouped[$transactionId])) {
                $grouped[$transactionId] = [];
            }

            $grouped[$transactionId][] = [
                'method' => (string) ($row->method ?? 'Cash'),
                'bank' => $row->bank !== null && trim((string) $row->bank) !== '' ? (string) $row->bank : null,
                'loan_term_months' => (int) ($row->loan_term_months ?? 0),
                'is_credit_card' => strtolower((string) ($row->method ?? '')) === 'credit card',
                'rate' => round((float) ($row->rate ?? 0), 2),
                'deduction' => round((float) ($row->deduction ?? 0), 2),
            ];
        }

        return $grouped;
    }

    private function kpis(array $filters, array $range): array
    {
        $query = $this->baseRowsQuery($filters, $range, includeSearch: false);

        $aggregate = DB::query()
            ->fromSub($query, 'rows')
            ->selectRaw('COALESCE(SUM(revenue), 0) as total_revenue')
            ->selectRaw('COALESCE(SUM(cost), 0) as total_cost')
            ->selectRaw('COALESCE(SUM(gross_profit), 0) as gross_profit')
            ->selectRaw('COALESCE(SUM(mdr), 0) as total_mdr')
            ->selectRaw('COALESCE(SUM(net_profit), 0) as net_profit')
            ->selectRaw('COALESCE(SUM(total_units), 0) as total_units')
            ->selectRaw('COUNT(*) as tx_count')
            ->first();

        $revenue = (float) ($aggregate->total_revenue ?? 0);
        $grossProfit = (float) ($aggregate->gross_profit ?? 0);
        $netProfit = (float) ($aggregate->net_profit ?? 0);

        return [
            'totalRevenue' => round($revenue, 2),
            'totalCost' => round((float) ($aggregate->total_cost ?? 0), 2),
            'grossProfit' => round($grossProfit, 2),
            'profitMargin' => $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0,
            'totalMDR' => round((float) ($aggregate->total_mdr ?? 0), 2),
            'netProfit' => round($netProfit, 2),
            'netProfitMargin' => $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0,
            'totalUnits' => (int) ($aggregate->total_units ?? 0),
            'txCount' => (int) ($aggregate->tx_count ?? 0),
        ];
    }

    private function chart(array $filters, array $range): array
    {
        $rows = $this->baseRowsQuery($filters, $range, includeSearch: false)
            ->select([
                'sales_transactions.created_at as transaction_date',
                'sales_transactions.total_amount as revenue',
                DB::raw('COALESCE(items_agg.total_cost, 0) as cost'),
                DB::raw('COALESCE(mdr_agg.total_mdr, 0) as mdr'),
            ])
            ->get();

        $buckets = $this->initChartBuckets($filters['period'], $range);

        foreach ($rows as $row) {
            $date = Carbon::parse($row->transaction_date);
            $bucketKey = $this->chartBucketKey($filters['period'], $date);

            if (! isset($buckets[$bucketKey])) {
                continue;
            }

            $revenue = (float) ($row->revenue ?? 0);
            $cost = (float) ($row->cost ?? 0);
            $mdr = (float) ($row->mdr ?? 0);
            $profit = $revenue - $cost;
            $net = $profit - $mdr;

            $buckets[$bucketKey]['revenue'] += $revenue;
            $buckets[$bucketKey]['cost'] += $cost;
            $buckets[$bucketKey]['profit'] += $profit;
            $buckets[$bucketKey]['mdr'] += $mdr;
            $buckets[$bucketKey]['netProfit'] += $net;
        }

        return array_values(array_map(function (array $bucket): array {
            return [
                'name' => $bucket['name'],
                'revenue' => round($bucket['revenue'], 2),
                'cost' => round($bucket['cost'], 2),
                'profit' => round($bucket['profit'], 2),
                'mdr' => round($bucket['mdr'], 2),
                'netProfit' => round($bucket['netProfit'], 2),
            ];
        }, $buckets));
    }

    private function initChartBuckets(string $period, array $range): array
    {
        $buckets = [];

        if ($period === 'daily') {
            for ($hour = 0; $hour < 24; $hour++) {
                $key = sprintf('%02d', $hour);
                $buckets[$key] = [
                    'name' => sprintf('%02d:00', $hour),
                    'revenue' => 0,
                    'cost' => 0,
                    'profit' => 0,
                    'mdr' => 0,
                    'netProfit' => 0,
                ];
            }

            return $buckets;
        }

        $interval = $period === 'yearly' ? '1 month' : '1 day';
        $cursor = CarbonPeriod::create($range['start'], $interval, $range['end']);

        foreach ($cursor as $date) {
            $key = $this->chartBucketKey($period, $date);
            $name = match ($period) {
                'weekly' => $date->format('D'),
                'monthly' => $date->format('d'),
                'yearly' => $date->format('M'),
                default => $date->format('d'),
            };

            $buckets[$key] ??= [
                'name' => $name,
                'revenue' => 0,
                'cost' => 0,
                'profit' => 0,
                'mdr' => 0,
                'netProfit' => 0,
            ];
        }

        return $buckets;
    }

    private function chartBucketKey(string $period, CarbonInterface $date): string
    {
        return match ($period) {
            'daily' => $date->format('H'),
            'yearly' => $date->format('Y-m'),
            default => $date->format('Y-m-d'),
        };
    }

    private function applySorting(Builder $query, array $filters): void
    {
        $sortColumn = self::SORT_MAP[$filters['sort']] ?? self::SORT_MAP['transaction_date'];
        $direction = $filters['direction'] === 'asc' ? 'asc' : 'desc';

        $query
            ->orderBy($sortColumn, $direction)
            ->orderBy('sales_transactions.id', $direction);
    }

    private function transformRow(object $row, array $mdrDetails): array
    {
        return [
            'id' => (string) $row->id,
            'transactionNumber' => (string) $row->transaction_number,
            'transactionDate' => Carbon::parse($row->transaction_date)->toIso8601String(),
            'warehouseName' => (string) $row->warehouse_name,
            'revenue' => round((float) ($row->revenue ?? 0), 2),
            'cost' => round((float) ($row->cost ?? 0), 2),
            'grossProfit' => round((float) ($row->gross_profit ?? 0), 2),
            'mdr' => round((float) ($row->mdr ?? 0), 2),
            'mdrDetails' => $mdrDetails,
            'netProfit' => round((float) ($row->net_profit ?? 0), 2),
            'netMargin' => round((float) ($row->net_margin ?? 0), 2),
        ];
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

    private function rangeForPeriod(string $period, Carbon $referenceDate): array
    {
        $date = $referenceDate->copy();

        return match ($period) {
            'daily' => [
                'start' => $date->copy()->startOfDay(),
                'end' => $date->copy()->endOfDay(),
            ],
            'weekly' => [
                'start' => $date->copy()->startOfWeek(Carbon::MONDAY),
                'end' => $date->copy()->endOfWeek(Carbon::SUNDAY),
            ],
            'yearly' => [
                'start' => $date->copy()->startOfYear(),
                'end' => $date->copy()->endOfYear(),
            ],
            default => [
                'start' => $date->copy()->startOfMonth(),
                'end' => $date->copy()->endOfMonth(),
            ],
        };
    }

    private function previousRangeForPeriod(string $period, Carbon $referenceDate): array
    {
        $date = $referenceDate->copy();

        return match ($period) {
            'daily' => $this->rangeForPeriod('daily', $date->subDay()),
            'weekly' => $this->rangeForPeriod('weekly', $date->subWeek()),
            'yearly' => $this->rangeForPeriod('yearly', $date->subYear()),
            default => $this->rangeForPeriod('monthly', $date->subMonth()),
        };
    }

    private function normalizeDate(mixed $value): ?string
    {
        $date = trim((string) ($value ?? ''));
        if ($date === '') {
            return null;
        }

        try {
            return Carbon::createFromFormat('Y-m-d', $date)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
