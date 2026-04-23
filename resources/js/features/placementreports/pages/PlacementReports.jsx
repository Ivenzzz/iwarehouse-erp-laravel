import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Box,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
  "suppliers",
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

const MASTER_ROW_HEIGHT = 44;
const VARIANT_ROW_HEIGHT = 36;
const STATUS_ROW_HEIGHT = 40;

function SortIndicator({ filters, columnKey, warehouseId = "" }) {
  const active =
    columnKey === "warehouse"
      ? filters.sort === "warehouse" &&
        String(filters.sort_warehouse_id) === String(warehouseId)
      : filters.sort === columnKey;

  if (!active) {
    return <ChevronUp className="w-3 h-3 opacity-30" />;
  }

  return filters.direction === "asc" ? (
    <ChevronUp className="w-3 h-3" />
  ) : (
    <ChevronDown className="w-3 h-3" />
  );
}

export default function PlacementReports({
  filters,
  warehouses,
  suppliers,
  summary,
  footerTotals,
  rows,
  pagination,
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search ?? "");
  const [expandedRows, setExpandedRows] = useState({});
  const [variantRowsByMaster, setVariantRowsByMaster] = useState({});
  const [loadingVariants, setLoadingVariants] = useState({});
  const [variantErrorsByMaster, setVariantErrorsByMaster] = useState({});
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

  const queryStateKey = useMemo(
    () =>
      JSON.stringify({
        search: filters.search ?? "",
        warehouse: String(filters.warehouse ?? "all"),
        supplier: String(filters.supplier ?? "all"),
        sort: filters.sort ?? "display_name",
        direction: filters.direction ?? "asc",
        sort_warehouse_id: String(filters.sort_warehouse_id ?? ""),
        page: Number(filters.page ?? 1),
        perPage: Number(filters.perPage ?? pagination.perPage ?? 50),
      }),
    [
      filters.direction,
      filters.page,
      filters.perPage,
      filters.search,
      filters.supplier,
      filters.sort,
      filters.sort_warehouse_id,
      filters.warehouse,
      pagination.perPage,
    ]
  );

  useEffect(() => {
    setExpandedRows({});
    setVariantRowsByMaster({});
    setLoadingVariants({});
    setVariantErrorsByMaster({});
    tableContainerRef.current?.scrollTo({ top: 0 });
  }, [queryStateKey]);

  const currentQuery = useCallback(
    (overrides = {}) => ({
      search: overrides.search ?? filters.search,
      warehouse: overrides.warehouse ?? filters.warehouse,
      supplier: overrides.supplier ?? filters.supplier,
      sort: overrides.sort ?? filters.sort,
      sort_warehouse_id:
        overrides.sort_warehouse_id ?? filters.sort_warehouse_id,
      direction: overrides.direction ?? filters.direction,
      page: overrides.page ?? 1,
      perPage: overrides.perPage ?? filters.perPage ?? pagination.perPage ?? 50,
    }),
    [
      filters.direction,
      filters.perPage,
      filters.search,
      filters.supplier,
      filters.sort,
      filters.sort_warehouse_id,
      filters.warehouse,
      pagination.perPage,
    ]
  );

  const visitPlacementReports = useCallback(
    (params = {}) => {
      router.get(
        route("placement-reports.index"),
        currentQuery(params),
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
        }
      );
    },
    [currentQuery]
  );

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

  const warehouseOptions = useMemo(
    () => [
      { value: "all", label: "All Stores" },
      ...warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name,
      })),
    ],
    [warehouses]
  );

  const supplierOptions = useMemo(
    () => [
      { value: "all", label: "All Suppliers" },
      ...(suppliers || []).map((supplier) => ({
        value: String(supplier.id),
        label: supplier.name,
      })),
    ],
    [suppliers]
  );

  const handleSort = useCallback(
    (sort, sortWarehouseId = "") => {
      const isSameSort =
        filters.sort === sort &&
        String(filters.sort_warehouse_id || "") ===
          String(sortWarehouseId || "");
      const direction =
        isSameSort && filters.direction === "asc" ? "desc" : "asc";

      visitPlacementReports({
        sort,
        sort_warehouse_id: sort === "warehouse" ? String(sortWarehouseId) : "",
        direction,
        page: 1,
      });
    },
    [
      filters.direction,
      filters.sort,
      filters.sort_warehouse_id,
      visitPlacementReports,
    ]
  );

  const handleRefresh = useCallback(() => {
    router.reload({
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
    });
  }, []);

  const handleToggleExpand = useCallback(
    async (row) => {
      const masterId = row.product_master_id;
      const nextExpanded = !expandedRowsRef.current[masterId];

      setExpandedRows((current) => ({
        ...current,
        [masterId]: nextExpanded,
      }));

      if (!nextExpanded) return;

      if (
        variantRowsByMasterRef.current[masterId] ||
        loadingVariantsRef.current[masterId]
      ) {
        return;
      }

      setVariantErrorsByMaster((current) => ({ ...current, [masterId]: "" }));
      setLoadingVariants((current) => ({ ...current, [masterId]: true }));

      try {
        const response = await axios.get(
          route("placement-reports.variants", masterId),
          { params: currentQuery() }
        );

        setVariantRowsByMaster((current) => ({
          ...current,
          [masterId]: Array.isArray(response.data?.variants)
            ? response.data.variants
            : [],
        }));
      } catch (error) {
        setVariantErrorsByMaster((current) => ({
          ...current,
          [masterId]:
            error.response?.data?.message ||
            error.message ||
            "Failed to load variants.",
        }));
      } finally {
        setLoadingVariants((current) => ({ ...current, [masterId]: false }));
      }
    },
    [currentQuery]
  );

  const handleOpenItems = useCallback(
    async ({ warehouseId, variantId = null, productMasterId = null }) => {
      const warehouseName =
        warehouses.find(
          (warehouse) => String(warehouse.id) === String(warehouseId)
        )?.name || "Warehouse";

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
            supplier: filters.supplier ?? "all",
            ...(variantId ? { variant_id: variantId } : {}),
            ...(productMasterId
              ? { product_master_id: productMasterId }
              : {}),
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
          error:
            error.response?.data?.message ||
            error.message ||
            "Failed to load items.",
          items: [],
          warehouseName,
          variantName: "",
        });
      }
    },
    [filters.supplier, warehouses]
  );

  const visibleProductTotal = rows.length;
  const totalProducts = pagination.total ?? rows.length;
  const currentPage = Number(pagination.page || 1);
  const selectedPerPage = Number(filters.perPage ?? pagination.perPage ?? 50);
  const lastPage = Math.max(
    1,
    Math.ceil(Number(totalProducts || 0) / Number(selectedPerPage || 50))
  );
  const perPageOptions = useMemo(
    () => [
      { value: "10", label: "10" },
      { value: "100", label: "100" },
      { value: "500", label: "500" },
      { value: "1000", label: "1k" },
      { value: "5000", label: "5k" },
    ],
    []
  );

  const flatVirtualRows = useMemo(() => {
    const nextRows = [];

    rows.forEach((row) => {
      const masterId = row.product_master_id;
      const expanded = !!expandedRows[masterId];
      const variants = variantRowsByMaster[masterId] || [];
      const isLoading = !!loadingVariants[masterId];
      const error = variantErrorsByMaster[masterId] || "";

      nextRows.push({
        id: `master-${masterId}`,
        type: "master",
        masterId,
        rowData: row,
        isExpanded: expanded,
      });

      if (!expanded) {
        return;
      }

      if (isLoading) {
        nextRows.push({
          id: `loading-${masterId}`,
          type: "loading",
          masterId,
          message: "Loading variants...",
        });
        return;
      }

      if (error) {
        nextRows.push({
          id: `error-${masterId}`,
          type: "error",
          masterId,
          message: error,
        });
        return;
      }

      variants.forEach((variant) => {
        nextRows.push({
          id: `variant-${variant.variant_id}`,
          type: "variant",
          masterId,
          variantId: variant.variant_id,
          rowData: variant,
        });
      });
    });

    return nextRows;
  }, [
    expandedRows,
    loadingVariants,
    rows,
    variantErrorsByMaster,
    variantRowsByMaster,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: flatVirtualRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => {
      const rowType = flatVirtualRows[index]?.type;

      if (rowType === "variant") return VARIANT_ROW_HEIGHT;
      if (rowType === "loading" || rowType === "error") return STATUS_ROW_HEIGHT;
      return MASTER_ROW_HEIGHT;
    },
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const topPaddingHeight = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const bottomPaddingHeight =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  useEffect(() => {
    rowVirtualizer.scrollToOffset(0);
  }, [queryStateKey, rowVirtualizer]);

  return (
    <AppShell title="Placement Reports">
      <Head title="Placement Reports" />

      <div className="mx-auto flex w-full flex-col gap-6">
        {/*
          ┌─────────────────────────────────────────┐
          │  MAIN CARD                               │
          │  bg-card   — adapts light / soft-dark    │
          │  Shadow: visible in light, subtle dark    │
          └─────────────────────────────────────────┘
        */}
        <section className="rounded-xl border border-border bg-card shadow-sm dark:shadow-none">

          {/* ── Header bar ─────────────────────────────────── */}
          <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Placement Reports
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track inventory distribution across all stores
              </p>
            </div>

            {/* ── Toolbar buttons ── */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = route(
                    "placement-reports.export.csv",
                    currentQuery()
                  );
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = route(
                    "placement-reports.export.xlsx",
                    currentQuery()
                  );
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export XLSX
              </Button>
            </div>
          </div>

          <div className="space-y-6 px-5 py-5">

            {/* ── Summary cards ───────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Total Stores */}
              <Card className="bg-card border border-border shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Stores
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {summary.totalStores}
                      </p>
                    </div>
                    {/*
                      Alpha-based icon container:
                      bg-blue-500/10 renders as a soft blue tint on ANY background
                      — no separate dark: class needed.
                    */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10">
                      <Store className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Unique Products */}
              <Card className="bg-card border border-border shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Unique Products
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {summary.totalUniqueProducts}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10">
                      <Box className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Items */}
              <Card className="bg-card border border-border shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Items
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {Number(summary.totalItems || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-violet-500/10">
                      <Package className="w-6 h-6 text-violet-500 dark:text-violet-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* ── Search + store + supplier filter ─────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search by product name or brand..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="px-4 py-5"
                />
              </div>
              <Combobox
                value={String(filters.warehouse)}
                onValueChange={(value) =>
                  visitPlacementReports({ warehouse: value || "all", page: 1 })
                }
                options={warehouseOptions}
                placeholder="All Stores"
                searchPlaceholder="Search stores..."
                className="h-10"
              />
              <Combobox
                value={String(filters.supplier ?? "all")}
                onValueChange={(value) =>
                  visitPlacementReports({ supplier: value || "all", page: 1 })
                }
                options={supplierOptions}
                placeholder="All Suppliers"
                searchPlaceholder="Search suppliers..."
                className="h-10"
              />
            </div>

            {/* ── Table ───────────────────────────────────── */}
            <div className="relative">
              <div
                ref={tableContainerRef}
                className="h-[70vh] max-h-[760px] overflow-x-auto overflow-y-auto rounded-lg border border-border"
              >
              <table className="w-full min-w-max text-xs bg-background">
                <thead className="sticky top-0 z-20 border-b-2 border-border bg-background">
                  <tr>
                    <th
                      className="min-w-[250px] cursor-pointer px-3 py-2.5 text-left font-semibold text-muted-foreground hover:bg-muted/60 transition-colors"
                      onClick={() => handleSort("display_name")}
                    >
                      <div className="flex items-center gap-1">
                        Product Name
                        <SortIndicator filters={filters} columnKey="display_name" />
                      </div>
                    </th>
                    <th
                      className="min-w-[80px] cursor-pointer px-3 py-2.5 text-center font-semibold text-muted-foreground bg-blue-500/10 hover:bg-blue-500/15 transition-colors"
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
                        className="min-w-[80px] cursor-pointer px-3 py-2.5 text-center font-semibold text-muted-foreground hover:bg-muted/60 transition-colors"
                        onClick={() => handleSort("warehouse", warehouse.id)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {warehouse.name}
                          <SortIndicator
                            filters={filters}
                            columnKey="warehouse"
                            warehouseId={warehouse.id}
                          />
                        </div>
                      </th>
                    ))}

                    {/* Valuation — amber accent */}
                    <th className="min-w-[100px] px-3 py-2.5 text-center font-semibold text-muted-foreground bg-amber-500/10">
                      Valuation
                    </th>

                    {/* 15-Day Sell Out — orange accent */}
                    <th className="min-w-[80px] px-3 py-2.5 text-center font-semibold text-muted-foreground bg-orange-500/10">
                      15 Day Sell Out
                    </th>

                    {/* 30-Day Sell Out — orange accent */}
                    <th className="min-w-[80px] px-3 py-2.5 text-center font-semibold text-muted-foreground bg-orange-500/10">
                      30 Day Sell Out
                    </th>

                    {/* Avg Sell Out/Day — teal accent */}
                    <th className="min-w-[90px] px-3 py-2.5 text-center font-semibold text-muted-foreground bg-teal-500/10">
                      Avg Sell Out/Day
                    </th>

                    {/* Inventory Life — indigo accent */}
                    <th className="min-w-[90px] px-3 py-2.5 text-center font-semibold text-muted-foreground bg-indigo-500/10">
                      Inventory Life
                    </th>

                    {/* Suggested PO Qty — rose accent */}
                    <th className="min-w-[100px] px-3 py-2.5 text-center font-semibold text-muted-foreground bg-rose-500/10">
                      Suggested PO Qty
                    </th>
                  </tr>
                </thead>

                {/* ── Body ─────────────────────────────────── */}
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={warehouses.length + 8}
                        className="py-16 text-center text-muted-foreground"
                      >
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No placement data found</p>
                        {filters.search || filters.warehouse !== "all" ? (
                          <Button
                            variant="outline"
                            className="mt-4 text-[11px] h-8"
                            onClick={() =>
                              visitPlacementReports({
                                search: "",
                                warehouse: "all",
                                supplier: "all",
                                sort: "display_name",
                                sort_warehouse_id: "",
                                direction: "asc",
                                page: 1,
                              })
                            }
                          >
                            Clear Filters
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {topPaddingHeight > 0 ? (
                        <tr aria-hidden="true">
                          <td
                            colSpan={warehouses.length + 8}
                            style={{ height: `${topPaddingHeight}px` }}
                          />
                        </tr>
                      ) : null}

                      {virtualRows.map((virtualRow) => {
                        const tableRow = flatVirtualRows[virtualRow.index];

                        if (!tableRow) return null;

                        if (tableRow.type === "loading") {
                          return (
                            <tr
                              key={tableRow.id}
                              className="border-b border-border bg-background"
                            >
                              <td
                                colSpan={warehouses.length + 8}
                                className="px-6 py-3 text-[11px] text-muted-foreground"
                              >
                                {tableRow.message}
                              </td>
                            </tr>
                          );
                        }

                        if (tableRow.type === "error") {
                          return (
                            <tr
                              key={tableRow.id}
                              className="border-b border-border bg-red-500/10"
                            >
                              <td
                                colSpan={warehouses.length + 8}
                                className="px-6 py-3 text-[11px] text-red-600 dark:text-red-400"
                              >
                                {tableRow.message}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <PlacementTableRow
                            key={tableRow.id}
                            rowType={tableRow.type}
                            rowData={tableRow.rowData}
                            warehouses={warehouses}
                            isExpanded={tableRow.isExpanded}
                            onToggleExpand={handleToggleExpand}
                            onOpenItems={handleOpenItems}
                          />
                        );
                      })}

                      {bottomPaddingHeight > 0 ? (
                        <tr aria-hidden="true">
                          <td
                            colSpan={warehouses.length + 8}
                            style={{ height: `${bottomPaddingHeight}px` }}
                          />
                        </tr>
                      ) : null}
                    </>
                  )}
                </tbody>

                {/*
                  ── Footer (Grand Total row) ─────────────────
                  bg-muted/50 gives a neutral tinted surface.
                  Accent cells use the same /15 alpha tokens as headers
                  but slightly stronger so they read as "totals".
                */}
                {rows.length > 0 ? (
                  <tfoot className="sticky bottom-0 z-20 border-t-2 border-border bg-muted/60 text-[11px]">
                    <tr>
                      {/* Label */}
                      <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                        Grand Total:
                      </td>

                      {/* Grand total — blue accent */}
                      <td className="px-3 py-2.5 text-center bg-blue-500/15">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {Number(footerTotals.grandTotal || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Per-warehouse totals */}
                      {warehouses.map((warehouse) => (
                        <td
                          key={warehouse.id}
                          className="px-3 py-2.5 text-center bg-muted"
                        >
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(
                              footerTotals.warehouses?.[warehouse.id] || 0
                            ).toLocaleString()}
                          </span>
                        </td>
                      ))}

                      {/* Valuation — amber */}
                      <td className="px-3 py-2.5 text-center bg-amber-500/15">
                        <span className="font-bold text-amber-600 dark:text-amber-400">—</span>
                      </td>

                      {/* 15-Day — orange */}
                      <td className="px-3 py-2.5 text-center bg-orange-500/15">
                        <span className="font-bold text-orange-600 dark:text-orange-400">—</span>
                      </td>

                      {/* 30-Day — orange */}
                      <td className="px-3 py-2.5 text-center bg-orange-500/15">
                        <span className="font-bold text-orange-600 dark:text-orange-400">—</span>
                      </td>

                      {/* Avg Sell Out — teal */}
                      <td className="px-3 py-2.5 text-center bg-teal-500/15">
                        <span className="font-bold text-teal-600 dark:text-teal-400">—</span>
                      </td>

                      {/* Inventory Life — indigo */}
                      <td className="px-3 py-2.5 text-center bg-indigo-500/15">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">—</span>
                      </td>

                      {/* Suggested PO — rose */}
                      <td className="px-3 py-2.5 text-center bg-rose-500/15">
                        <span className="font-bold text-rose-600 dark:text-rose-400">—</span>
                      </td>
                    </tr>
                  </tfoot>
                ) : null}

              </table>
              </div>
            </div>

            {/* ── Pagination ──────────────────────────────── */}
            {rows.length > 0 ? (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-[11px] text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {visibleProductTotal.toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {Number(totalProducts || 0).toLocaleString()}
                  </span>{" "}
                  products
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Rows
                    </span>
                    <Combobox
                      value={String(selectedPerPage)}
                      onValueChange={(value) =>
                        visitPlacementReports({
                          perPage: Number(value || 50),
                          page: 1,
                        })
                      }
                      options={perPageOptions}
                      placeholder="Rows"
                      searchPlaceholder="Search rows..."
                      className="h-8 min-w-[84px]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 px-2 text-[11px]"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      visitPlacementReports({ page: currentPage - 1 })
                    }
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Prev
                  </Button>

                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Page{" "}
                    <span className="font-medium text-foreground">
                      {currentPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {lastPage}
                    </span>
                  </span>

                  <Button
                    variant="outline"
                    className="h-8 px-2 text-[11px]"
                    disabled={!pagination.hasMore}
                    onClick={() =>
                      visitPlacementReports({ page: currentPage + 1 })
                    }
                  >
                    Next
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}

          </div>
        </section>
      </div>

      <InventoryItemDialog
        open={itemDialog.open}
        onOpenChange={(open) =>
          setItemDialog((current) => ({ ...current, open }))
        }
        items={itemDialog.items}
        warehouseName={itemDialog.warehouseName}
        variantName={itemDialog.variantName}
        isLoading={itemDialog.isLoading}
        error={itemDialog.error}
      />
    </AppShell>
  );
}
