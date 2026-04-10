import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import {
  Box,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Package,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";

import InventoryItemDialog from "@/features/placementreports/InventoryItemDialog";
import PlacementTableRow from "@/features/placementreports/PlacementTableRow";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import AppShell from "@/shared/layouts/AppShell";

const RELOAD_PROPS = [
  "filters",
  "warehouses",
  "summary",
  "footerTotals",
  "rows",
  "pagination",
];

const EMPTY_DIALOG = {
  open: false,
  isLoading: false,
  error: "",
  items: [],
  warehouseName: "",
  variantName: "",
};

function SortIndicator({ filters, columnKey, warehouseId = "" }) {
  const active = columnKey === "warehouse"
    ? filters.sort === "warehouse" && String(filters.sort_warehouse_id) === String(warehouseId)
    : filters.sort === columnKey;

  if (!active) {
    return <ChevronUp className="w-3 h-3 opacity-30" />;
  }

  return filters.direction === "asc"
    ? <ChevronUp className="w-3 h-3" />
    : <ChevronDown className="w-3 h-3" />;
}

export default function PlacementReports({
  filters,
  warehouses,
  summary,
  footerTotals,
  rows,
  pagination,
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search ?? "");
  const [loadedRows, setLoadedRows] = useState(rows ?? []);
  const [loadedPagination, setLoadedPagination] = useState(
    pagination ?? { page: 1, hasMore: false, total: 0, perPage: 50 }
  );
  const [expandedRows, setExpandedRows] = useState({});
  const [variantRowsByMaster, setVariantRowsByMaster] = useState({});
  const [loadingVariants, setLoadingVariants] = useState({});
  const [variantErrorsByMaster, setVariantErrorsByMaster] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [itemDialog, setItemDialog] = useState(EMPTY_DIALOG);
  const tableContainerRef = useRef(null);
  const expandedRowsRef = useRef({});
  const variantRowsByMasterRef = useRef({});
  const loadingVariantsRef = useRef({});

  useEffect(() => {
    setSearchTerm(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    expandedRowsRef.current = expandedRows;
  }, [expandedRows]);

  useEffect(() => {
    variantRowsByMasterRef.current = variantRowsByMaster;
  }, [variantRowsByMaster]);

  useEffect(() => {
    loadingVariantsRef.current = loadingVariants;
  }, [loadingVariants]);

  useEffect(() => {
    setLoadedRows(rows ?? []);
    setLoadedPagination(pagination ?? { page: 1, hasMore: false, total: 0, perPage: 50 });
  }, [rows, pagination]);

  const queryStateKey = useMemo(() => JSON.stringify({
    search: filters.search ?? "",
    warehouse: String(filters.warehouse ?? "all"),
    sort: filters.sort ?? "display_name",
    direction: filters.direction ?? "asc",
    sort_warehouse_id: String(filters.sort_warehouse_id ?? ""),
  }), [filters.direction, filters.search, filters.sort, filters.sort_warehouse_id, filters.warehouse]);

  useEffect(() => {
    setExpandedRows({});
    setVariantRowsByMaster({});
    setLoadingVariants({});
    setVariantErrorsByMaster({});
    tableContainerRef.current?.scrollTo({ top: 0 });
  }, [queryStateKey]);

  const currentQuery = useCallback((overrides = {}) => ({
    search: overrides.search ?? filters.search,
    warehouse: overrides.warehouse ?? filters.warehouse,
    sort: overrides.sort ?? filters.sort,
    sort_warehouse_id: overrides.sort_warehouse_id ?? filters.sort_warehouse_id,
    direction: overrides.direction ?? filters.direction,
    page: overrides.page ?? 1,
  }), [filters.direction, filters.search, filters.sort, filters.sort_warehouse_id, filters.warehouse]);

  const visitPlacementReports = useCallback((params = {}) => {
    router.get(route("placement-reports.index"), currentQuery(params), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }, [currentQuery]);

  useEffect(() => {
    const normalized = searchTerm.trim();

    if (normalized === (filters.search ?? "")) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      visitPlacementReports({ search: normalized, page: 1 });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filters.search, searchTerm, visitPlacementReports]);

  const warehouseOptions = useMemo(() => ([
    { value: "all", label: "All Stores" },
    ...warehouses.map((warehouse) => ({
      value: String(warehouse.id),
      label: warehouse.name,
    })),
  ]), [warehouses]);

  const handleSort = useCallback((sort, sortWarehouseId = "") => {
    const isSameSort =
      filters.sort === sort
      && String(filters.sort_warehouse_id || "") === String(sortWarehouseId || "");
    const direction = isSameSort && filters.direction === "asc" ? "desc" : "asc";

    visitPlacementReports({
      sort,
      sort_warehouse_id: sort === "warehouse" ? String(sortWarehouseId) : "",
      direction,
      page: 1,
    });
  }, [filters.direction, filters.sort, filters.sort_warehouse_id, visitPlacementReports]);

  const handleRefresh = useCallback(() => {
    router.reload({
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
    });
  }, []);

  const loadMoreRows = useCallback(async () => {
    if (loadingMore || !loadedPagination.hasMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const response = await axios.get(route("placement-reports.rows"), {
        params: currentQuery({ page: loadedPagination.page + 1 }),
      });

      setLoadedRows((current) => [...current, ...(response.data.rows || [])]);
      setLoadedPagination(response.data.pagination || loadedPagination);
    } finally {
      setLoadingMore(false);
    }
  }, [currentQuery, loadedPagination, loadingMore]);

  const maybeLoadMoreRows = useCallback(() => {
    const container = tableContainerRef.current;

    if (!container || loadingMore || !loadedPagination.hasMore) {
      return;
    }

    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 600;

    if (nearBottom) {
      loadMoreRows();
    }
  }, [loadMoreRows, loadedPagination.hasMore, loadingMore]);

  useEffect(() => {
    maybeLoadMoreRows();
  }, [loadedRows.length, maybeLoadMoreRows]);

  const handleToggleExpand = useCallback(async (row) => {
    const masterId = row.product_master_id;
    const nextExpanded = !expandedRowsRef.current[masterId];

    setExpandedRows((current) => ({
      ...current,
      [masterId]: nextExpanded,
    }));

    if (!nextExpanded) {
      return;
    }

    if (variantRowsByMasterRef.current[masterId] || loadingVariantsRef.current[masterId]) {
      return;
    }

    setVariantErrorsByMaster((current) => ({
      ...current,
      [masterId]: "",
    }));
    setLoadingVariants((current) => ({
      ...current,
      [masterId]: true,
    }));

    try {
      const response = await axios.get(route("placement-reports.variants", masterId), {
        params: currentQuery(),
      });

      setVariantRowsByMaster((current) => ({
        ...current,
        [masterId]: Array.isArray(response.data?.variants) ? response.data.variants : [],
      }));
    } catch (error) {
      setVariantErrorsByMaster((current) => ({
        ...current,
        [masterId]: error.response?.data?.message || error.message || "Failed to load variants.",
      }));
    } finally {
      setLoadingVariants((current) => ({
        ...current,
        [masterId]: false,
      }));
    }
  }, [currentQuery]);

  const handleOpenItems = useCallback(async ({ warehouseId, variantId = null, productMasterId = null }) => {
    const warehouseName = warehouses.find((warehouse) => String(warehouse.id) === String(warehouseId))?.name || "Warehouse";

    setItemDialog({
      open: true,
      isLoading: true,
      error: "",
      items: [],
      warehouseName,
      variantName: "",
    });

    try {
      const response = await axios.get(route("placement-reports.items"), {
        params: {
          warehouse_id: warehouseId,
          ...(variantId ? { variant_id: variantId } : {}),
          ...(productMasterId ? { product_master_id: productMasterId } : {}),
        },
      });

      setItemDialog({
        open: true,
        isLoading: false,
        error: "",
        items: response.data.items || [],
        warehouseName: response.data.warehouseName || warehouseName,
        variantName: response.data.variantName || "",
      });
    } catch (error) {
      setItemDialog({
        open: true,
        isLoading: false,
        error: error.response?.data?.message || error.message || "Failed to load items.",
        items: [],
        warehouseName,
        variantName: "",
      });
    }
  }, [warehouses]);

  const visibleProductTotal = loadedRows.length;
  const totalProducts = loadedPagination.total ?? loadedRows.length;

  return (
    <AppShell title="Placement Reports">
      <Head title="Placement Reports" />

      <div className="mx-auto flex w-full flex-col gap-6">
        <section className="rounded-xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:bg-slate-950">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Placement Reports
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Track inventory distribution across all stores
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = route("placement-reports.export.csv", currentQuery());
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = route("placement-reports.export.xlsx", currentQuery());
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export XLSX
              </Button>
            </div>
          </div>

          <div className="space-y-6 px-5 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border border-blue-200 shadow-none">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Stores</p>
                      <p className="text-3xl font-bold text-blue-900">{summary.totalStores}</p>
                    </div>
                    <Store className="w-10 h-10 text-blue-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border border-green-200 shadow-none">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Total Unique Products</p>
                      <p className="text-3xl font-bold text-green-900">{summary.totalUniqueProducts}</p>
                    </div>
                    <Box className="w-10 h-10 text-green-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border border-purple-200 shadow-none">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Total Items</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {Number(summary.totalItems || 0).toLocaleString()}
                      </p>
                    </div>
                    <Package className="w-10 h-10 text-purple-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by product name or brand..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Combobox
                    value={String(filters.warehouse)}
                    onValueChange={(value) => visitPlacementReports({ warehouse: value || "all", page: 1 })}
                    options={warehouseOptions}
                    placeholder="All Stores"
                    searchPlaceholder="Search stores..."
                    className="h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div
                    ref={tableContainerRef}
                    onScroll={maybeLoadMoreRows}
                    className="overflow-auto"
                    style={{ height: "calc(100vh - 360px)", minHeight: "420px" }}
                  >
                    <table className="w-full min-w-max text-[11px]">
                      <thead className="sticky top-0 z-20 bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th
                            className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 min-w-[250px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => handleSort("display_name")}
                          >
                            <div className="flex items-center gap-1">
                              Product Name
                              <SortIndicator filters={filters} columnKey="display_name" />
                            </div>
                          </th>
                          <th
                            className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 min-w-[80px] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40"
                            onClick={() => handleSort("total")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Total Items
                              <SortIndicator filters={filters} columnKey="total" />
                            </div>
                          </th>
                          {warehouses.map((warehouse) => (
                            <th
                              key={warehouse.id}
                              className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 min-w-[80px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => handleSort("warehouse", warehouse.id)}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {warehouse.name}
                                <SortIndicator filters={filters} columnKey="warehouse" warehouseId={warehouse.id} />
                              </div>
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 min-w-[100px]">Valuation</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 min-w-[80px]">15 Day Sell Out</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 min-w-[80px]">30 Day Sell Out</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 bg-teal-50 dark:bg-teal-900/20 min-w-[90px]">Avg Sell Out/Day</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 bg-indigo-50 dark:bg-indigo-900/20 min-w-[90px]">Inventory Life</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 bg-rose-50 dark:bg-rose-900/20 min-w-[100px]">Suggested PO Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadedRows.length === 0 ? (
                          <tr>
                            <td colSpan={warehouses.length + 8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                              <p>No placement data found</p>
                              {(filters.search || filters.warehouse !== "all") ? (
                                <Button
                                  variant="outline"
                                  className="mt-4 text-[11px] h-8"
                                  onClick={() => visitPlacementReports({
                                    search: "",
                                    warehouse: "all",
                                    sort: "display_name",
                                    sort_warehouse_id: "",
                                    direction: "asc",
                                    page: 1,
                                  })}
                                >
                                  Clear Filters
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        ) : (
                          loadedRows.map((row) => {
                            const masterId = row.product_master_id;
                            const expanded = !!expandedRows[masterId];
                            const variants = variantRowsByMaster[masterId] || [];
                            const loadingVariantRows = !!loadingVariants[masterId];
                            const variantError = variantErrorsByMaster[masterId] || "";

                            return (
                              <Fragment key={masterId}>
                                <PlacementTableRow
                                  virtualRow={{ type: "master", row }}
                                  warehouses={warehouses}
                                  isExpanded={expanded}
                                  onToggleExpand={() => handleToggleExpand(row)}
                                  onOpenItems={handleOpenItems}
                                />
                                {expanded && loadingVariantRows ? (
                                  <tr className="border-b bg-slate-50/60 dark:bg-slate-900/40">
                                    <td colSpan={warehouses.length + 8} className="px-6 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                                      Loading variants...
                                    </td>
                                  </tr>
                                ) : null}
                                {expanded && variantError ? (
                                  <tr className="border-b bg-red-50/80 dark:bg-red-950/30">
                                    <td colSpan={warehouses.length + 8} className="px-6 py-3 text-[11px] text-red-600 dark:text-red-300">
                                      {variantError}
                                    </td>
                                  </tr>
                                ) : null}
                                {expanded && !loadingVariantRows && !variantError && variants.map((variant) => (
                                  <PlacementTableRow
                                    key={variant.variant_id}
                                    virtualRow={{ type: "variant", variant }}
                                    warehouses={warehouses}
                                    onOpenItems={handleOpenItems}
                                  />
                                ))}
                              </Fragment>
                            );
                          })
                        )}
                        {loadingMore ? (
                          <tr>
                            <td colSpan={warehouses.length + 8} className="px-6 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                              Loading more products...
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                      {loadedRows.length > 0 ? (
                        <tfoot className="sticky bottom-0 z-20 bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 text-[11px]">
                          <tr>
                            <td className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Grand Total:</td>
                            <td className="px-3 py-2 text-center bg-green-100 dark:bg-green-900/30">
                              <span className="font-bold text-green-600 dark:text-green-400">
                                {Number(footerTotals.grandTotal || 0).toLocaleString()}
                              </span>
                            </td>
                            {warehouses.map((warehouse) => (
                              <td key={warehouse.id} className="px-3 py-2 text-center bg-gray-100 dark:bg-gray-700">
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  {Number(footerTotals.warehouses?.[warehouse.id] || 0).toLocaleString()}
                                </span>
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center bg-amber-100 dark:bg-amber-900/30"><span className="font-bold text-amber-700 dark:text-amber-400">-</span></td>
                            <td className="px-3 py-2 text-center bg-orange-100 dark:bg-orange-900/30"><span className="font-bold text-orange-600">-</span></td>
                            <td className="px-3 py-2 text-center bg-orange-100 dark:bg-orange-900/30"><span className="font-bold text-orange-600">-</span></td>
                            <td className="px-3 py-2 text-center bg-teal-100 dark:bg-teal-900/30"><span className="font-bold text-teal-600">-</span></td>
                            <td className="px-3 py-2 text-center bg-indigo-100 dark:bg-indigo-900/30"><span className="font-bold text-indigo-600">-</span></td>
                            <td className="px-3 py-2 text-center bg-rose-100 dark:bg-rose-900/30"><span className="font-bold text-rose-600">-</span></td>
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                </div>

                {loadedRows.length > 0 ? (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-[11px] text-gray-600">
                      Showing {visibleProductTotal.toLocaleString()} of {Number(totalProducts || 0).toLocaleString()} products
                    </div>
                    {loadedPagination.hasMore ? (
                      <div className="text-[11px] text-gray-500">Scroll to load more</div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <InventoryItemDialog
        open={itemDialog.open}
        onOpenChange={(open) => setItemDialog((current) => ({ ...current, open }))}
        items={itemDialog.items}
        warehouseName={itemDialog.warehouseName}
        variantName={itemDialog.variantName}
        isLoading={itemDialog.isLoading}
        error={itemDialog.error}
      />
    </AppShell>
  );
}
