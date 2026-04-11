<?php

namespace App\Features\SalesReports\Support;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Models\PosSession;
use App\Models\SalesTransaction;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class SalesReportQuery
{
    private ?Collection $warehousePayload = null;

    public function __construct(
        private readonly SalesReportLedgerBuilder $ledgerBuilder,
    ) {
    }

    public function filtersFromRequest(Request $request): array
    {
        $month = max(1, min(12, (int) $request->query('month', now()->month)));
        $year = max(2000, min(2100, (int) $request->query('year', now()->year)));

        return [
            'tab' => in_array($request->query('tab'), ['daily', 'consolidated', 'calendar'], true)
                ? $request->query('tab')
                : 'consolidated',
            'individual_search' => trim((string) $request->query('individual_search', '')),
            'individual_branch' => $this->validatedWarehouse((string) $request->query('individual_branch', 'all')),
            'individual_status' => in_array($request->query('individual_status'), ['opened', 'closed'], true)
                ? $request->query('individual_status')
                : 'all',
            'consolidated_search' => trim((string) $request->query('consolidated_search', '')),
            'consolidated_branch' => $this->validatedWarehouse((string) $request->query('consolidated_branch', 'all')),
            'month' => $month,
            'year' => $year,
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

    public function individualRows(array $filters): array
    {
        return $this->individualSessionQuery($filters)
            ->get()
            ->map(fn (PosSession $session) => $this->transformSessionRow($session))
            ->values()
            ->all();
    }

    public function consolidatedRows(array $filters): array
    {
        $sessions = $this->consolidatedSessionQuery($filters)
            ->get()
            ->sortByDesc(fn (PosSession $session) => optional($session->shift_start_time)?->getTimestamp() ?? 0)
            ->values();

        $groups = $sessions
            ->groupBy(fn (PosSession $session) => $session->warehouse_id.'__'.optional($session->shift_start_time)?->format('Y-m-d'))
            ->map(fn (Collection $groupedSessions) => $this->transformConsolidatedRow($groupedSessions))
            ->filter()
            ->values();

        if ($filters['consolidated_search'] !== '') {
            $needle = strtolower($filters['consolidated_search']);

            $groups = $groups->filter(function (array $row) use ($needle): bool {
                $matchesSession = collect($row['sessions'] ?? [])
                    ->contains(fn (array $session) => str_contains(strtolower((string) ($session['session_number'] ?? '')), $needle));

                return str_contains(strtolower((string) ($row['branch_name'] ?? '')), $needle)
                    || str_contains(strtolower((string) ($row['report_date'] ?? '')), $needle)
                    || $matchesSession;
            })->values();
        }

        return $groups->all();
    }

    public function calendar(array $filters): array
    {
        $start = Carbon::create($filters['year'], $filters['month'], 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $transactions = SalesTransaction::query()
            ->with('items')
            ->whereBetween('created_at', [$start, $end])
            ->get();

        $dailyMap = [];
        foreach ($start->daysUntil($end->copy()->addDay()) as $date) {
            $key = $date->format('Y-m-d');
            $dailyMap[$key] = [
                'revenue' => 0.0,
                'unitsSold' => 0,
                'transactionCount' => 0,
            ];
        }

        foreach ($transactions as $transaction) {
            $key = optional($transaction->created_at)?->format('Y-m-d');
            if ($key === null || ! array_key_exists($key, $dailyMap)) {
                continue;
            }

            $dailyMap[$key]['revenue'] += (float) ($transaction->total_amount ?? 0);
            $dailyMap[$key]['unitsSold'] += max(1, $transaction->items->count());
            $dailyMap[$key]['transactionCount'] += 1;
        }

        return [
            'month' => $filters['month'],
            'year' => $filters['year'],
            'days' => array_keys($dailyMap),
            'dailyMap' => $dailyMap,
            'monthTotals' => [
                'revenue' => round((float) collect($dailyMap)->sum('revenue'), 2),
                'unitsSold' => (int) collect($dailyMap)->sum('unitsSold'),
                'transactionCount' => (int) collect($dailyMap)->sum('transactionCount'),
            ],
        ];
    }

    public function sessionDetail(PosSession $session): array
    {
        $session->loadMissing($this->sessionRelations());

        $transactions = $this->ledgerBuilder
            ->transformTransactions($session->salesTransactions->sortByDesc('created_at')->values());

        return [
            'session' => $this->transformSessionRow($session),
            'summary' => [
                'weekNumber' => $this->ledgerBuilder->isoWeekNumber(optional($session->shift_start_time)?->toDateTimeString()),
                'totalSales' => round((float) $transactions->sum('total_amount'), 2),
                'transactionCount' => $transactions->count(),
            ],
            'transactions' => $this->ledgerBuilder->sessionRows($transactions),
        ];
    }

    public function consolidatedDetail(string $date, int $warehouseId): array
    {
        $sessions = PosSession::query()
            ->with($this->sessionRelations())
            ->where('warehouse_id', $warehouseId)
            ->whereDate('shift_start_time', $date)
            ->orderBy('shift_start_time')
            ->get();

        $transactions = $this->ledgerBuilder
            ->transformTransactions(
                $sessions->flatMap(fn (PosSession $session) => $session->salesTransactions)->sortByDesc('created_at')->values()
            );
        $dynamicPaymentColumns = $this->ledgerBuilder->dynamicPaymentColumns($transactions);

        return [
            'group' => $this->transformConsolidatedRow($sessions),
            'summary' => $this->ledgerBuilder->summary($transactions),
            'paymentMethodSummary' => $this->ledgerBuilder->paymentMethodSummary($transactions),
            'nonCashBreakdown' => $this->ledgerBuilder->nonCashBreakdown($transactions),
            'terminalFeeSummary' => $this->ledgerBuilder->terminalFeeSummary($transactions),
            'dynamicPaymentColumns' => $dynamicPaymentColumns,
            'ledgerRows' => $this->ledgerBuilder->ledgerRows($transactions, $dynamicPaymentColumns),
        ];
    }

    public function transactionDetail(SalesTransaction $transaction): array
    {
        return $this->ledgerBuilder->transformTransactions([$transaction])->first();
    }

    public function estimatedClosingBalance(PosSession $session): float
    {
        $session->loadMissing(['salesTransactions.payments.paymentMethod']);

        $cashSales = $session->salesTransactions->sum(function (SalesTransaction $transaction): float {
            return $transaction->payments->sum(function ($payment): float {
                $name = strtolower(trim((string) $payment->paymentMethod?->name));

                return $name === 'cash' || $payment->paymentMethod?->type === 'cash'
                    ? (float) ($payment->amount ?? 0)
                    : 0.0;
            });
        });

        return round((float) $session->opening_balance + (float) $cashSales, 2);
    }

    private function individualSessionQuery(array $filters): Builder
    {
        $query = PosSession::query()
            ->with(['employee', 'warehouse'])
            ->withCount('salesTransactions')
            ->withSum('salesTransactions', 'total_amount');

        if ($filters['individual_branch'] !== 'all') {
            $query->where('warehouse_id', (int) $filters['individual_branch']);
        }

        if ($filters['individual_status'] !== 'all') {
            $query->where('status', $filters['individual_status']);
        }

        $this->applySessionSearch($query, $filters['individual_search']);

        return $query->orderByDesc('shift_start_time')->orderByDesc('id');
    }

    private function consolidatedSessionQuery(array $filters): Builder
    {
        $query = PosSession::query()
            ->with([
                'employee',
                'warehouse',
                'salesTransactions' => fn ($builder) => $builder->select(['id', 'pos_session_id', 'total_amount', 'created_at']),
            ]);

        if ($filters['consolidated_branch'] !== 'all') {
            $query->where('warehouse_id', (int) $filters['consolidated_branch']);
        }

        if ($filters['consolidated_search'] !== '') {
            $this->applySessionSearch($query, $filters['consolidated_search']);
        }

        return $query;
    }

    private function applySessionSearch(Builder $query, string $search): void
    {
        $tokens = preg_split('/\s+/', trim($search)) ?: [];

        foreach ($tokens as $token) {
            if ($token === '') {
                continue;
            }

            $like = '%'.$token.'%';

            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('session_number', 'like', $like)
                    ->orWhereHas('employee', function (Builder $employeeQuery) use ($like): void {
                        $employeeQuery
                            ->where('first_name', 'like', $like)
                            ->orWhere('last_name', 'like', $like)
                            ->orWhere('employee_id', 'like', $like);
                    })
                    ->orWhereHas('warehouse', fn (Builder $warehouseQuery) => $warehouseQuery->where('name', 'like', $like));
            });
        }
    }

    private function transformSessionRow(PosSession $session): array
    {
        return [
            'id' => $session->id,
            'session_number' => $session->session_number,
            'cashier_name' => trim((string) (($session->employee?->first_name ?? '').' '.($session->employee?->last_name ?? ''))) ?: 'Unknown',
            'warehouse_id' => $session->warehouse_id,
            'warehouse_name' => $session->warehouse?->name ?? 'N/A',
            'shift_start_time' => optional($session->shift_start_time)?->toDateTimeString(),
            'shift_end_time' => optional($session->shift_end_time)?->toDateTimeString(),
            'status' => $session->status,
            'total_sales' => round((float) ($session->sales_transactions_sum_total_amount ?? 0), 2),
            'transaction_count' => (int) ($session->sales_transactions_count ?? 0),
        ];
    }

    private function transformConsolidatedRow(Collection $sessions): ?array
    {
        $first = $sessions->first();
        if (! $first instanceof PosSession || $first->shift_start_time === null) {
            return null;
        }

        $reportDate = $first->shift_start_time->format('Y-m-d');
        $flattenedTransactions = $sessions->flatMap(fn (PosSession $session) => $session->salesTransactions);
        $earliestShift = $sessions->min(fn (PosSession $session) => optional($session->shift_start_time)?->timestamp ?? PHP_INT_MAX);
        $latestShift = $sessions->contains(fn (PosSession $session) => $session->shift_end_time === null)
            ? null
            : $sessions->max(fn (PosSession $session) => optional($session->shift_end_time)?->timestamp ?? 0);

        return [
            'id' => $first->warehouse_id.'__'.$reportDate,
            'warehouse_id' => $first->warehouse_id,
            'branch_name' => $first->warehouse?->name ?? 'N/A',
            'report_date' => $reportDate,
            'week_number' => $first->shift_start_time->isoWeek(),
            'session_count' => $sessions->count(),
            'transaction_count' => $flattenedTransactions->count(),
            'total_sales' => round((float) $flattenedTransactions->sum('total_amount'), 2),
            'earliest_shift_start' => $earliestShift !== PHP_INT_MAX ? Carbon::createFromTimestamp($earliestShift)->toDateTimeString() : null,
            'latest_shift_end' => $latestShift ? Carbon::createFromTimestamp($latestShift)->toDateTimeString() : null,
            'status' => $latestShift === null ? 'opened' : 'closed',
            'sessions' => $sessions->map(fn (PosSession $session) => $this->transformSessionRow($session))->values()->all(),
        ];
    }

    private function validatedWarehouse(string $warehouse): string
    {
        $warehouse = trim($warehouse) ?: 'all';

        if ($warehouse !== 'all' && (! ctype_digit($warehouse) || ! Warehouse::query()->whereKey((int) $warehouse)->exists())) {
            return 'all';
        }

        return $warehouse;
    }

    private function sessionRelations(): array
    {
        return [
            'employee',
            'warehouse',
            'salesTransactions.customer.contacts',
            'salesTransactions.customer.addresses',
            'salesTransactions.salesRepresentative.jobTitle.department',
            'salesTransactions.posSession.warehouse',
            'salesTransactions.items.inventoryItem.productVariant.values.attribute',
            'salesTransactions.items.inventoryItem.productVariant.productMaster.model.brand',
            'salesTransactions.items.inventoryItem.productVariant.productMaster.subcategory.parent',
            'salesTransactions.items.components.inventoryItem.productVariant.productMaster.model.brand',
            'salesTransactions.payments.paymentMethod',
            'salesTransactions.payments.detail.documents',
            'salesTransactions.documents',
        ];
    }
}
