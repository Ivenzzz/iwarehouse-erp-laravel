import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search, X } from "lucide-react";

import { calculateStockAge, formatCurrency, formatDateTime, getStatusColor, getStockAgeColor } from "@/features/inventory/lib/inventoryUtils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "available", label: "available" },
  { value: "reserved", label: "reserved" },
  { value: "reserved_for_transfer", label: "reserved for transfer" },
  { value: "sold", label: "sold" },
  { value: "qc_pending", label: "qc pending" },
  { value: "rma", label: "rma" },
  { value: "for_return_to_supplier", label: "for return to supplier" },
  { value: "on_hold", label: "on hold" },
  { value: "damaged", label: "damaged" },
  { value: "stolen_lost", label: "stolen lost" },
  { value: "scrap", label: "scrap" },
  { value: "in_transit", label: "in transit" },
  { value: "bundled", label: "bundled" },
];

const STOCK_AGE_OPTIONS = [
  { value: "all", label: "All Stock Age" },
  { value: "today", label: "Today" },
  { value: "1-7", label: "1-7 days" },
  { value: "8-30", label: "8-30 days" },
  { value: "31-60", label: "31-60 days" },
  { value: "61-90", label: "61-90 days" },
  { value: "90+", label: "90+ days" },
];

function SortableHeader({ label, active, direction, onClick, align = "left" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 ${align === "right" ? "justify-end" : ""}`}
    >
      <span>{label}</span>
      {!active ? <ArrowUpDown className="size-3.5" /> : direction === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
    </button>
  );
}

const CHIP_BASE_CLASS = "text-[10px] px-1.5 h-5";
const CHIP_COLORS = {
  conditionDefault: "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20",
  conditionCpo: "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  ram: "bg-violet-100/50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  rom: "bg-sky-100/50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  color: "bg-pink-100/50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20",
  cpu: "bg-indigo-100/50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
  gpu: "bg-cyan-100/50 text-cyan-700 border-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-400 dark:border-cyan-400/20",
};

function getAgeHeatmapClass(encodedDate) {
  const textClass = getStockAgeColor(encodedDate);

  if (textClass.includes("text-green")) {
    return "bg-green-50/70 dark:bg-green-500/10";
  }

  if (textClass.includes("text-yellow")) {
    return "bg-yellow-50/80 dark:bg-yellow-500/10";
  }

  if (textClass.includes("text-orange")) {
    return "bg-orange-50/80 dark:bg-orange-500/10";
  }

  if (textClass.includes("text-red")) {
    return "bg-red-50/80 dark:bg-red-500/10";
  }

  return "bg-slate-50 dark:bg-slate-800/40";
}

function getStatusHeatmapClass(status) {
  const normalized = String(status || "").trim();

  if (["available", "active"].includes(normalized)) {
    return "bg-green-50/70 dark:bg-green-500/10";
  }

  if (["reserved", "reserved_for_transfer", "sold", "sold_as_replacement", "on_hold"].includes(normalized)) {
    return "bg-yellow-50/80 dark:bg-yellow-500/10";
  }

  if (["in_transit", "for_branch_transfer", "qc_pending", "for_return_to_supplier", "bundled", "scrap"].includes(normalized)) {
    return "bg-orange-50/80 dark:bg-orange-500/10";
  }

  if (["rma", "damaged", "stolen_lost"].includes(normalized)) {
    return "bg-red-50/80 dark:bg-red-500/10";
  }

  return "bg-slate-50 dark:bg-slate-800/40";
}

export default function InventoryTable({
  items,
  filters,
  warehouses,
  brands,
  categories,
  pagination,
  perPageOptions,
  exactLookup,
  selectedItems,
  onSelectionChange,
  onViewDetails,
  onVisit,
}) {
  const [searchValue, setSearchValue] = useState(filters.search ?? "");

  useEffect(() => {
    setSearchValue(filters.search ?? "");
  }, [filters.search]);

  const locationOptions = useMemo(() => ([
    { value: "all", label: "All Warehouses" },
    ...warehouses.map((warehouse) => ({
      value: String(warehouse.id),
      label: warehouse.name,
    })),
  ]), [warehouses]);

  const brandOptions = useMemo(() => ([
    { value: "all", label: "All Brands" },
    ...brands.map((brand) => ({
      value: String(brand.id),
      label: brand.name,
    })),
  ]), [brands]);

  const categoryOptions = useMemo(() => ([
    { value: "all", label: "All Categories" },
    ...categories.map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
  ]), [categories]);

  const allVisibleSelected = items.length > 0 && items.every((item) => selectedItems.includes(item.id));

  const updateFilter = (key, value) => {
    onVisit({
      [key]: value,
      page: undefined,
    });
  };

  const toggleSort = (field) => {
    const direction = filters.sort === field && filters.direction === "asc" ? "desc" : "asc";
    onVisit({
      sort: field,
      direction,
      page: undefined,
    });
  };

  const toggleRow = (id, checked) => {
    if (checked) {
      onSelectionChange([...new Set([...selectedItems, id])]);
      return;
    }

    onSelectionChange(selectedItems.filter((itemId) => itemId !== id));
  };

  const toggleAllVisible = (checked) => {
    if (checked) {
      onSelectionChange([...new Set([...selectedItems, ...items.map((item) => item.id)])]);
      return;
    }

    onSelectionChange(selectedItems.filter((itemId) => !items.some((item) => item.id === itemId)));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,0.8fr))]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onVisit({ search: searchValue.trim(), page: undefined });
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search product, IMEI, serial, warehouse..."
            className="h-10 pl-9 pr-12"
          />
          <div className="absolute right-1 top-1 flex items-center gap-1">
            {filters.search ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => {
                setSearchValue("");
                onVisit({ search: "", page: undefined });
              }}>
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </form>

        <Combobox
          value={String(filters.location)}
          onValueChange={(value) => updateFilter("location", value || "all")}
          options={locationOptions}
          placeholder="All Warehouses"
          searchPlaceholder="Search warehouses..."
          className="h-10"
        />

        <Combobox
          value={String(filters.status)}
          onValueChange={(value) => updateFilter("status", value || "all")}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
          searchPlaceholder="Search statuses..."
          className="h-10"
        />

        <Combobox
          value={String(filters.brand)}
          onValueChange={(value) => updateFilter("brand", value || "all")}
          options={brandOptions}
          placeholder="All Brands"
          searchPlaceholder="Search brands..."
          className="h-10"
        />

        <Combobox
          value={String(filters.category)}
          onValueChange={(value) => updateFilter("category", value || "all")}
          options={categoryOptions}
          placeholder="All Categories"
          searchPlaceholder="Search categories..."
          className="h-10"
        />

        <Combobox
          value={String(filters.stockAge)}
          onValueChange={(value) => updateFilter("stockAge", value || "all")}
          options={STOCK_AGE_OPTIONS}
          placeholder="All Stock Age"
          searchPlaceholder="Search stock age..."
          className="h-10"
        />
      </div>

      {exactLookup?.active ? (
        <div className="rounded-sm bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          Found {exactLookup.matchedCount} exact match{exactLookup.matchedCount === 1 ? "" : "es"} for "{exactLookup.search}".
          {exactLookup.outsideCurrentFiltersCount > 0 ? ` ${exactLookup.outsideCurrentFiltersCount} result(s) are outside the current browse filters.` : ""}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-sm border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 shadow-[0_1px_0_rgba(148,163,184,0.35)] dark:bg-slate-950 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
              </th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Product" active={filters.sort === "productName"} direction={filters.direction} onClick={() => toggleSort("productName")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Barcode" active={filters.sort === "serial_number"} direction={filters.direction} onClick={() => toggleSort("serial_number")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Location" active={filters.sort === "warehouseName"} direction={filters.direction} onClick={() => toggleSort("warehouseName")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Encoded" active={filters.sort === "encoded_date"} direction={filters.direction} onClick={() => toggleSort("encoded_date")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Age" active={filters.sort === "stockAgeDays"} direction={filters.direction} onClick={() => toggleSort("stockAgeDays")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Status" active={filters.sort === "status"} direction={filters.direction} onClick={() => toggleSort("status")} /></th>
              <th className="px-4 py-3 text-right"><SortableHeader align="right" label="Cost" active={filters.sort === "cost_price"} direction={filters.direction} onClick={() => toggleSort("cost_price")} /></th>
              <th className="px-4 py-3 text-right"><SortableHeader align="right" label="Cash" active={filters.sort === "cash_price"} direction={filters.direction} onClick={() => toggleSort("cash_price")} /></th>
              <th className="px-4 py-3 text-right"><SortableHeader align="right" label="SRP" active={filters.sort === "srp"} direction={filters.direction} onClick={() => toggleSort("srp")} /></th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {items.length ? items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-4">
                  <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={(checked) => toggleRow(item.id, checked)} />
                </td>
                <td className="px-4 py-4">
                  <div className="max-w-[280px] space-y-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{[item.brandName, item.masterModel].filter(Boolean).join(" ") || item.productName}</div>
                    <div className="flex flex-wrap gap-1">
                      {item.variantCondition ? (
                        <Badge
                          variant="outline"
                          className={`${CHIP_BASE_CLASS} ${item.variantCondition === "Certified Pre-Owned" ? CHIP_COLORS.conditionCpo : CHIP_COLORS.conditionDefault}`}
                        >
                          {item.variantCondition === "Certified Pre-Owned" ? "CPO" : item.variantCondition}
                        </Badge>
                      ) : null}
                      {item.attrRAM ? <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.ram}`}>{item.attrRAM}</Badge> : null}
                      {item.attrROM ? <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.rom}`}>{item.attrROM}</Badge> : null}
                      {item.attrColor ? <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.color}`}>{item.attrColor}</Badge> : null}
                      {item.cpu ? <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.cpu}`}>{item.cpu}</Badge> : null}
                      {item.gpu ? <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.gpu}`}>{item.gpu}</Badge> : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                  <div className="space-y-0.5">
                    {item.imei1 ? <div>{item.imei1}</div> : null}
                    {item.imei2 ? <div>{item.imei2}</div> : null}
                    {item.serial_number ? <div>{item.serial_number}</div> : null}
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{item.warehouseName}</td>
                <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.encoded_date || item.created_date)}</td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex min-w-[72px] items-center justify-center rounded-md px-2 py-1 text-xs font-medium ${getStockAgeColor(item.encoded_date || item.created_date)} ${getAgeHeatmapClass(item.encoded_date || item.created_date)}`}
                  >
                    {calculateStockAge(item.encoded_date || item.created_date)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Badge className={`${getStatusColor(item.status)} ${getStatusHeatmapClass(item.status)} border-0 px-2 py-0.5 text-[10px] uppercase shadow-none`}>
                    {item.status === "available" ? "active" : item.status.replaceAll("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">{formatCurrency(item.cost_price)}</td>
                <td className="px-4 py-4 text-right font-mono text-xs font-medium text-slate-900 dark:text-slate-100">{formatCurrency(item.cash_price)}</td>
                <td className="px-4 py-4 text-right font-mono text-xs text-slate-500 dark:text-slate-400">{formatCurrency(item.srp)}</td>
                <td className="px-4 py-4 text-right">
                  <Button variant="outline" size="sm" onClick={() => onViewDetails(item)}>
                    <Eye className="size-4" />
                    View
                  </Button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No inventory items matched the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing {pagination.from ?? 0} to {pagination.to ?? 0} of {pagination.total ?? 0} item(s)
        </div>
        <div className="flex items-center gap-2">
          <select
            value={String(pagination.perPage)}
            onChange={(event) => onVisit({ perPage: Number(event.target.value), page: undefined })}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
          <Button variant="outline" size="sm" disabled={pagination.currentPage <= 1} onClick={() => onVisit({ page: pagination.currentPage - 1 })}>
            Previous
          </Button>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Page {pagination.currentPage} of {pagination.lastPage}
          </div>
          <Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.lastPage} onClick={() => onVisit({ page: pagination.currentPage + 1 })}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
