import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import AppShell from "@/shared/layouts/AppShell";
import ProductReportsSummaryCards from "@/features/productreports/components/ProductReportsSummaryCards";
import ProductReportsFilterBar from "@/features/productreports/components/ProductReportsFilterBar";
import ProductReportsTable from "@/features/productreports/components/ProductReportsTable";
import ProductReportsPagination from "@/features/productreports/components/ProductReportsPagination";
import { buildProductReportParams, normalizeFilters } from "@/features/productreports/lib/queryParams";

export default function ProductReportsPage({
  rows,
  summary,
  options,
  filters,
  pagination,
}) {
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);
  const [localFilters, setLocalFilters] = useState(normalizedFilters);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    setLocalFilters(normalizedFilters);
  }, [normalizedFilters]);

  const visit = (overrides = {}) => {
    setIsLoading(true);
    router.get(
      route("product-reports.index"),
      buildProductReportParams(localFilters, overrides),
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
    setLocalFilters(nextFilters);
    setIsLoading(true);
    router.get(
      route("product-reports.index"),
      buildProductReportParams(nextFilters, { page: 1 }),
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onFinish: () => setIsLoading(false),
      }
    );
  };

  const resetFilters = () => {
    const reset = normalizeFilters();
    setLocalFilters(reset);
    setIsLoading(true);
    router.get(
      route("product-reports.index"),
      buildProductReportParams(reset, { page: 1 }),
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onFinish: () => setIsLoading(false),
      }
    );
  };

  const handleSort = (column) => {
    const nextFilters = {
      ...localFilters,
      sortBy: column,
      sortDir:
        localFilters.sortBy === column && localFilters.sortDir === "asc"
          ? "desc"
          : "asc",
    };

    setLocalFilters(nextFilters);
    setIsLoading(true);
    router.get(
      route("product-reports.index"),
      buildProductReportParams(nextFilters, { page: 1 }),
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onFinish: () => setIsLoading(false),
      }
    );
  };

  const handleExport = () => {
    window.location.href = route(
      "product-reports.export.csv",
      buildProductReportParams(localFilters)
    );
  };

  const handleExportXLSX = () => {
    window.location.href = route(
      "product-reports.export.xlsx",
      buildProductReportParams(localFilters)
    );
  };

  return (
    <AppShell title="Product Reports">
      <Head title="Product Reports" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              Product Reports
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sales transaction line-item report by branch, customer, and product
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={handleExportXLSX} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export XLSX
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <ProductReportsSummaryCards summary={summary} />
        </div>

        <div className="mb-4">
          <ProductReportsFilterBar
            filters={localFilters}
            brands={options?.brands || []}
            warehouseOptions={options?.warehouses || []}
            onFilterChange={updateFilter}
            onReset={resetFilters}
          />
        </div>

        <ProductReportsTable
          rows={rows || []}
          isLoading={isLoading}
          sortBy={localFilters.sortBy}
          sortDir={localFilters.sortDir}
          onSort={handleSort}
        />

        {(pagination?.total || 0) > 0 && (
          <ProductReportsPagination
            page={pagination.page}
            totalPages={pagination.last_page}
            totalRows={pagination.total}
            pageSize={pagination.per_page}
            onPageChange={(page) => visit({ page })}
          />
        )}
      </div>
    </AppShell>
  );
}
