import React, { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppShell from "@/shared/layouts/AppShell";
import SalesProfitTrackerFilters from "@/features/salesprofittracker/components/SalesProfitTrackerFilters";
import SalesProfitTrackerKPIs from "@/features/salesprofittracker/components/SalesProfitTrackerKPIs";
import SalesProfitTrackerChart from "@/features/salesprofittracker/components/SalesProfitTrackerChart";
import SalesProfitTrackerTable from "@/features/salesprofittracker/components/SalesProfitTrackerTable";
import { buildSalesProfitTrackerParams, normalizeFilters } from "@/features/salesprofittracker/lib/queryParams";

export default function SalesProfitTrackerPage({ filters, options, kpis, chart, rows, pagination }) {
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);
  const [localFilters, setLocalFilters] = useState(normalizedFilters);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLocalFilters(normalizedFilters);
  }, [normalizedFilters]);

  const visit = (nextFilters, overrides = {}) => {
    setLocalFilters(nextFilters);
    setIsLoading(true);

    router.get(
      route("sales-profit-tracker.index"),
      buildSalesProfitTrackerParams(nextFilters, overrides),
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onFinish: () => setIsLoading(false),
      }
    );
  };

  const updateFilter = (key, value) => {
    const nextFilters = { ...localFilters, [key]: value };
    visit(nextFilters, { page: 1 });
  };

  const handleExport = () => {
    window.location.href = route("sales-profit-tracker.export.csv", buildSalesProfitTrackerParams(localFilters));
  };

  return (
    <AppShell title="Sales / Profit Tracker">
      <Head title="Sales / Profit Tracker" />
      <div className="p-4 md:p-6 max-w-full mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sales / Profit Tracker</h1>
              <p className="text-sm text-muted-foreground">Track revenue, costs, and profit margins across time periods</p>
            </div>
          </div>

          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <SalesProfitTrackerFilters
          period={localFilters.period}
          referenceDate={localFilters.referenceDate}
          warehouseId={localFilters.warehouseId}
          warehouses={options?.warehouses || []}
          onPeriodChange={(value) => updateFilter("period", value)}
          onWarehouseChange={(value) => updateFilter("warehouseId", value)}
          onReferenceDateChange={(value) => updateFilter("referenceDate", value)}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SalesProfitTrackerKPIs current={kpis?.current || {}} previous={kpis?.previous || {}} />
            <SalesProfitTrackerChart chartData={chart || []} period={localFilters.period} />
            <SalesProfitTrackerTable
              rows={rows || []}
              pagination={pagination || {}}
              search={localFilters.search}
              onSearchChange={(value) => updateFilter("search", value)}
              onPageChange={(page) => visit(localFilters, { page })}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
