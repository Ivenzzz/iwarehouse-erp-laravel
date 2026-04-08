import React, {
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useState,
  useDeferredValue,
  startTransition,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import {
  getStatusColor,
  formatCurrency,
  formatDateTime,
  getStockAgeColor,
} from "./utils/inventoryUtils";
import {
  STOCK_AGE_OPTIONS,
} from "./services/inventoryQueryService";

const ROW_HEIGHT = 52;

const INVENTORY_STATUSES = [
  "available",
  "reserved",
  "reserved_for_transfer",
  "sold",
  "qc_pending",
  "rma",
  "for_return_to_supplier",
  "on_hold",
  "damaged",
  "stolen_lost",
  "scrap",
  "in_transit",
];

export function InventoryTanstackTable({
  items,
  localItems = [],
  productMasters,
  variants,
  warehouses,
  brands,
  categories,
  onViewDetails,
  selectedItems = [],
  onSelectionChange,
  filters,
  onFiltersChange,
  isSearchingFullInventory = false,
  exactLookupActive = false,
  exactLookupFoundCount = 0,
}) {
  const tableContainerRef = useRef(null);
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const deferredItems = useDeferredValue(items);
  const deferredSelectedItems = useDeferredValue(selectedItems);

  useEffect(() => {
    setSearchValue(filters.search ?? "");
  }, [filters.search]);

  const updateFilter = useCallback(
    (key, value) => {
      startTransition(() => {
        onFiltersChange((current) => ({
          ...current,
          [key]: value,
        }));
      });
    },
    [onFiltersChange]
  );

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="border-slate-400 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 dark:border-slate-600 dark:data-[state=checked]:bg-indigo-500"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="border-slate-400 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 dark:border-slate-600 dark:data-[state=checked]:bg-indigo-500"
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "productName",
        header: ({ column }) => <SortableHeader column={column} title="Product Details" />,
        size: 300,
        cell: ({ row }) => {
          const { brandName, masterModel, variantCondition, attrRAM, attrROM, attrColor, cpu, gpu } = row.original;
          const isCPO = variantCondition === "Certified Pre-Owned";
          const badgeCls = "text-[10px] px-1.5 h-5";
          return (
            <div className="flex flex-col w-[280px] max-w-[280px] gap-1.5 py-1">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 break-words whitespace-normal leading-tight">
                {[brandName, masterModel].filter(Boolean).join(" ") || row.original.productName}
              </span>
              <div className="flex flex-wrap gap-1">
                {row.original._isExactLookupFallback && (
                  <Badge
                    variant="outline"
                    className={`${badgeCls} bg-blue-100/60 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20`}
                  >
                    Full inventory
                  </Badge>
                )}
                {row.original._outsideCurrentFilters && (
                  <Badge
                    variant="outline"
                    className={`${badgeCls} bg-orange-100/60 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20`}
                  >
                    Outside filters
                  </Badge>
                )}
                {variantCondition && (
                  <Badge variant="outline" className={`${badgeCls} ${isCPO ? "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20" : "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20"}`}>
                    {isCPO ? "CPO" : variantCondition}
                  </Badge>
                )}
                {attrRAM && (
                  <Badge variant="outline" className={`${badgeCls} bg-violet-100/50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20`}>
                    {attrRAM}
                  </Badge>
                )}
                {attrROM && (
                  <Badge variant="outline" className={`${badgeCls} bg-sky-100/50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20`}>
                    {attrROM}
                  </Badge>
                )}
                {attrColor && (
                  <Badge variant="outline" className={`${badgeCls} bg-pink-100/50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20`}>
                    {attrColor}
                  </Badge>
                )}
                {cpu && (
                  <Badge variant="outline" className={`${badgeCls} bg-indigo-100/50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20`}>
                    {cpu}
                  </Badge>
                )}
                {gpu && (
                  <Badge variant="outline" className={`${badgeCls} bg-cyan-100/50 text-cyan-700 border-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-400 dark:border-cyan-400/20`}>
                    {gpu}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "barcode",
        header: ({ column }) => <SortableHeader column={column} title="Barcode" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
            {row.original.imei1 && <span>{row.original.imei1}</span>}
            {row.original.imei2 && <span>{row.original.imei2}</span>}
            {row.original.serial_number && <span>{row.original.serial_number}</span>}
          </div>
        ),
      },
      {
        accessorKey: "warehouseName",
        header: ({ column }) => <SortableHeader column={column} title="Location" />,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {row.original.warehouseName}
          </span>
        ),
      },
      {
        accessorKey: "created_date",
        header: ({ column }) => <SortableHeader column={column} title="Encoded" />,
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDateTime(row.original.created_date)}
          </span>
        ),
      },
      {
        accessorKey: "stockAgeDays",
        header: ({ column }) => <SortableHeader column={column} title="Age" />,
        cell: ({ row }) => (
          <span className={`font-medium text-xs ${getStockAgeColor(row.original.created_date)}`}>
            {row.original.stockAgeDisplay}
          </span>
        ),
      },
      {
        accessorKey: "warranty_description",
        header: "Warranty",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-normal break-words">
            {row.original.warranty_description || "-"}
          </span>
        ),
      },
      {
        accessorKey: "cost_price",
        header: ({ column }) => (
          <SortableHeader column={column} title="Cost" className="justify-end" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-right block text-slate-600 dark:text-slate-400 font-mono">
            {formatCurrency(row.original.cost_price)}
          </span>
        ),
      },
      {
        accessorKey: "cash_price",
        header: ({ column }) => (
          <SortableHeader column={column} title="Cash" className="justify-end" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-right block text-slate-900 dark:text-slate-100 font-mono">
            {formatCurrency(row.original.cash_price)}
          </span>
        ),
      },
      {
        accessorKey: "srp",
        header: ({ column }) => (
          <SortableHeader column={column} title="SRP" className="justify-end" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-right block text-slate-500 dark:text-slate-500 font-mono">
            {formatCurrency(row.original.srp)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <SortableHeader column={column} title="Status" className="justify-center" />
        ),
        cell: ({ row }) => {
          const displayStatus = row.original.status === "available" ? "active" : row.original.status?.replace(/_/g, " ");
          return (
            <div className="flex justify-center">
              <Badge className={`${getStatusColor(row.original.status)} uppercase text-[10px] px-2 py-0.5 shadow-none border-0`}>
                {displayStatus}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => (
          <span className="text-center block text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-medium">
            View
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(row.original)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-full"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onViewDetails]
  );

  const rowSelectionState = useMemo(
    () =>
      deferredSelectedItems.reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {}),
    [deferredSelectedItems]
  );

  const table = useReactTable({
    data: deferredItems,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting: filters.sorting,
      rowSelection: rowSelectionState,
    },
    onSortingChange: (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(filters.sorting) : updater;
      updateFilter("sorting", nextSorting);
    },
    onRowSelectionChange: (updater) => {
      const nextSelection =
        typeof updater === "function" ? updater(rowSelectionState) : updater;
      const selectedIds = Object.keys(nextSelection).filter((key) => nextSelection[key]);
      onSelectionChange?.(selectedIds);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();
  const totalRows = rows.length;

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  useEffect(() => {
    tableContainerRef.current?.scrollTo({ top: 0 });
  }, [
    filters.search,
    filters.location,
    filters.status,
    filters.category,
    filters.brand,
    filters.condition,
    filters.stockAge,
    filters.sorting,
  ]);

  const locationOptions = useMemo(
    () => [
      { value: "all", label: "All Locations" },
      ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
    ],
    [warehouses]
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Status" },
      ...INVENTORY_STATUSES.map((status) => ({
        value: status,
        label: status === "available" ? "active" : status.replace(/_/g, " "),
      })),
    ],
    []
  );

  const conditionOptions = useMemo(() => {
    const conditions = [...new Set(variants.map((item) => item.condition).filter(Boolean))];
    return [{ value: "all", label: "All Conditions" }, ...conditions.map((value) => ({ value, label: value }))];
  }, [variants]);

  const categoryOptions = useMemo(
    () => [{ value: "all", label: "All Categories" }, ...categories.map((item) => ({ value: item.id, label: item.name }))],
    [categories]
  );

  const brandOptions = useMemo(
    () => [{ value: "all", label: "All Brands" }, ...brands.map((item) => ({ value: item.id, label: item.name }))],
    [brands]
  );

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100 bg-transparent">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="e.g. iPhone 13 4 256 grey bn"
            value={searchValue}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchValue(nextValue);
              updateFilter("search", nextValue);
            }}
            className="pl-9 h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Combobox
            options={locationOptions}
            value={filters.location}
            onValueChange={(value) => updateFilter("location", value || "all")}
            placeholder="Location"
            className="w-[150px] dark:bg-slate-950 dark:border-slate-700"
          />
          <Combobox
            options={statusOptions}
            value={filters.status}
            onValueChange={(value) => updateFilter("status", value || "all")}
            placeholder="Status"
            className="w-[140px] dark:bg-slate-950 dark:border-slate-700"
          />
          <Combobox
            options={categoryOptions}
            value={filters.category}
            onValueChange={(value) => updateFilter("category", value || "all")}
            placeholder="Category"
            className="w-[140px] dark:bg-slate-950 dark:border-slate-700"
          />
          <Combobox
            options={brandOptions}
            value={filters.brand}
            onValueChange={(value) => updateFilter("brand", value || "all")}
            placeholder="Brand"
            className="w-[140px] dark:bg-slate-950 dark:border-slate-700"
          />
          <Combobox
            options={conditionOptions}
            value={filters.condition}
            onValueChange={(value) => updateFilter("condition", value || "all")}
            placeholder="Condition"
            className="w-[140px] dark:bg-slate-950 dark:border-slate-700"
          />
          <Combobox
            options={STOCK_AGE_OPTIONS}
            value={filters.stockAge}
            onValueChange={(value) => updateFilter("stockAge", value || "all")}
            placeholder="Stock Age"
            className="w-[140px] dark:bg-slate-950 dark:border-slate-700"
          />
        </div>
      </div>

      {(isSearchingFullInventory || exactLookupFoundCount > 0) && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-2 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <span>
            {isSearchingFullInventory
              ? "Searching all inventory for an exact IMEI/serial match..."
              : `Found ${exactLookupFoundCount} exact match${exactLookupFoundCount === 1 ? "" : "es"} from the full inventory search.`}
          </span>
          {exactLookupFoundCount > 0 && (
            <span className="text-blue-600/80 dark:text-blue-200/80">
              Current browse filters stay active for local results.
            </span>
          )}
        </div>
      )}

      <div
        ref={tableContainerRef}
        className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-auto relative inventory-scroll"
        style={{ height: "calc(100vh - 340px)", minHeight: "400px" }}
      >
        <table className="w-full text-xs text-left border-collapse" style={{ minWidth: "1400px" }}>
          <thead className="sticky top-0 z-20 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200 dark:border-slate-800">
                {headerGroup.headers.map((header, headerIdx) => {
                  const isSticky = headerIdx <= 1;
                  const isLastSticky = headerIdx === 1;
                  return (
                    <th
                      key={header.id}
                      className={[
                        "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900",
                        isSticky ? "sticky z-30" : "",
                        isLastSticky ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]" : "",
                      ].join(" ")}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                        ...(headerIdx === 0 ? { left: 0 } : {}),
                        ...(headerIdx === 1 ? { left: 40 } : {}),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-slate-500 dark:text-slate-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 opacity-20" />
                    <p>
                      {exactLookupActive && !isSearchingFullInventory
                        ? "No matching item was found in the first 5,000 records or the full inventory."
                        : "No inventory items match your filters."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px`, padding: 0, border: 0 }}
                    />
                  </tr>
                )}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index}
                      className={[
                        "group border-b border-slate-100 dark:border-slate-800/50",
                        row.getIsSelected()
                          ? "bg-indigo-50 dark:bg-indigo-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      ].join(" ")}
                      style={{ height: `${ROW_HEIGHT}px`, maxHeight: `${ROW_HEIGHT}px`, boxSizing: "border-box" }}
                    >
                      {row.getVisibleCells().map((cell, cellIdx) => {
                        const isSticky = cellIdx <= 1;
                        const isLastSticky = cellIdx === 1;
                        const isSelected = row.getIsSelected();
                        const cellBg = isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/10"
                          : "bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50";
                        return (
                          <td
                            key={cell.id}
                            className={[
                              "px-4 py-2 align-middle overflow-hidden",
                              isSticky ? `sticky z-10 ${cellBg}` : "",
                              isLastSticky ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]" : "",
                            ].join(" ")}
                            style={{
                              height: `${ROW_HEIGHT}px`,
                              maxHeight: `${ROW_HEIGHT}px`,
                              boxSizing: "border-box",
                              ...(cellIdx === 0 ? { left: 0 } : {}),
                              ...(cellIdx === 1 ? { left: 40 } : {}),
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0)}px`,
                        padding: 0,
                        border: 0,
                      }}
                    />
                  </tr>
                )}
              </>
            )}

          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {totalRows.toLocaleString()}
          </span>
          <span>
            {exactLookupFoundCount > 0
              ? `${localItems.length.toLocaleString()} local item${localItems.length === 1 ? "" : "s"} + ${exactLookupFoundCount.toLocaleString()} full-inventory match${exactLookupFoundCount === 1 ? "" : "es"}`
              : "loaded filtered items"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SortableHeader({ column, title, className = "" }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={[
        "-ml-3 h-8 text-xs font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-800",
        "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400",
        className,
      ].join(" ")}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{title}</span>
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3 text-indigo-500" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-1 h-3 w-3 text-indigo-500" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
      )}
    </Button>
  );
}
