<?php

namespace App\Features\Dashboard\Queries;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardQuery
{
    public function handle(): array
    {
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();

        $summary = [
            'mtdSales' => round((float) DB::table('sales_transactions')
                ->whereBetween('created_at', [$start, $end])
                ->sum('total_amount'), 2),
            'mtdCogs' => round((float) DB::table('sales_transaction_items')
                ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
                ->whereBetween('sales_transactions.created_at', [$start, $end])
                ->sum('sales_transaction_items.snapshot_cost_price'), 2),
            'salesCount' => (int) DB::table('sales_transactions')
                ->whereBetween('created_at', [$start, $end])
                ->count(),
        ];

        $salesPerDayRows = DB::table('sales_transactions')
            ->selectRaw('DATE(created_at) as day, SUM(total_amount) as revenue')
            ->whereBetween('created_at', [$start, $end])
            ->groupByRaw('DATE(created_at)')
            ->orderByRaw('DATE(created_at)')
            ->get();

        $salesPerDay = $salesPerDayRows
            ->map(function (object $row): array {
                $day = Carbon::parse((string) $row->day);

                return [
                    'label' => $day->format('M d'),
                    'value' => round((float) $row->revenue, 2),
                ];
            })
            ->values()
            ->all();

        $weeklySales = collect($salesPerDayRows)
            ->groupBy(fn (object $row) => Carbon::parse((string) $row->day)->weekOfMonth)
            ->map(function ($group, $week): array {
                return [
                    'label' => 'Week '.$week,
                    'value' => round((float) collect($group)->sum(fn (object $row) => (float) $row->revenue), 2),
                ];
            })
            ->sortBy(fn (array $row) => (int) str_replace('Week ', '', $row['label']))
            ->values()
            ->all();

        $brandSales = DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('inventory_items', 'inventory_items.id', '=', 'sales_transaction_items.inventory_item_id')
            ->join('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->whereBetween('sales_transactions.created_at', [$start, $end])
            ->groupBy('product_brands.id', 'product_brands.name')
            ->selectRaw('product_brands.id as brand_id, product_brands.name as brand_name, SUM(sales_transaction_items.line_total) as revenue')
            ->orderByDesc('revenue')
            ->orderBy('product_brands.name')
            ->orderBy('product_brands.id')
            ->get()
            ->map(fn (object $row): array => [
                'label' => (string) $row->brand_name,
                'value' => round((float) $row->revenue, 2),
            ])
            ->values()
            ->all();

        $topProducts = DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->join('inventory_items', 'inventory_items.id', '=', 'sales_transaction_items.inventory_item_id')
            ->join('product_variants', 'product_variants.id', '=', 'inventory_items.product_variant_id')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->whereBetween('sales_transactions.created_at', [$start, $end])
            ->groupBy(
                'product_variants.id',
                'product_brands.name',
                'product_models.model_name',
                'product_variants.model_code',
                'product_variants.ram',
                'product_variants.rom',
                'product_variants.color'
            )
            ->selectRaw('
                product_variants.id as variant_id,
                product_brands.name as brand_name,
                product_models.model_name as model_name,
                product_variants.model_code as model_code,
                product_variants.ram as ram,
                product_variants.rom as rom,
                product_variants.color as color,
                COUNT(sales_transaction_items.id) as qty_sold,
                SUM(sales_transaction_items.line_total) as revenue
            ')
            ->orderByDesc('revenue')
            ->orderBy('product_brands.name')
            ->orderBy('product_models.model_name')
            ->orderBy('product_variants.id')
            ->limit(10)
            ->get()
            ->map(function (object $row): array {
                $parts = array_filter([
                    trim((string) $row->brand_name),
                    trim((string) $row->model_name),
                    trim((string) $row->model_code),
                    trim((string) $row->ram),
                    trim((string) $row->rom),
                    trim((string) $row->color),
                ], fn (string $part) => $part !== '');

                return [
                    'name' => implode(' ', $parts),
                    'qtySold' => (int) $row->qty_sold,
                    'revenue' => round((float) $row->revenue, 2),
                ];
            })
            ->values()
            ->all();

        $salesRepresentatives = DB::table('sales_transactions')
            ->leftJoin('employees', 'employees.id', '=', 'sales_transactions.sales_representative_id')
            ->whereBetween('sales_transactions.created_at', [$start, $end])
            ->groupBy('employees.id', 'employees.first_name', 'employees.last_name')
            ->selectRaw('
                employees.id as employee_id,
                employees.first_name as first_name,
                employees.last_name as last_name,
                SUM(sales_transactions.total_amount) as revenue
            ')
            ->orderByDesc('revenue')
            ->orderBy('employees.last_name')
            ->orderBy('employees.first_name')
            ->orderBy('employees.id')
            ->get()
            ->map(function (object $row): array {
                $fullName = trim(
                    implode(' ', array_filter([(string) $row->first_name, (string) $row->last_name], fn (string $v) => trim($v) !== ''))
                );

                return [
                    'name' => $fullName !== '' ? $fullName : 'Unassigned',
                    'revenue' => round((float) $row->revenue, 2),
                ];
            })
            ->values()
            ->all();

        return [
            'summary' => $summary,
            'charts' => [
                'salesPerDay' => $salesPerDay,
                'weeklySales' => $weeklySales,
                'brandSales' => $brandSales,
            ],
            'tables' => [
                'topProducts' => $topProducts,
                'salesRepresentatives' => $salesRepresentatives,
            ],
            'period' => [
                'month' => (int) now()->month,
                'monthLabel' => now()->format('F'),
                'year' => (int) now()->year,
            ],
        ];
    }
}

