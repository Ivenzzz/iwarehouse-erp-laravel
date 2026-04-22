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

const CONDITION_LABELS = {
  "Brand New": "Brand New",
  "Certified Pre-Owned": "Certified Pre-Owned",
};

function SortableHeader({ label, active, direction, onClick, align = "left" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground ${align === "right" ? "justify-end" : ""}`}
    >
      <span>{label}</span>
      {!active ? <ArrowUpDown className="size-3.5" /> : direction === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
    </button>
  );
}

const CHIP_BASE_CLASS = "text-[10px] px-1.5 h-5";
const CHIP_COLORS = {
  conditionDefault: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  conditionCpo: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  ram: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  rom: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  color: "bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400",
  cpu: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
  gpu: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
};

function getStatusHeatmapClass(status) {
  const normalized = String(status || "").trim();
  if (["available", "active"].includes(normalized)) return "bg-green-500/10";
  if (["reserved", "reserved_for_transfer", "sold", "on_hold"].includes(normalized)) return "bg-yellow-500/10";
  if (["in_transit", "for_branch_transfer", "qc_pending", "bundled", "scrap"].includes(normalized)) return "bg-orange-500/10";
  if (["rma", "damaged", "stolen_lost"].includes(normalized)) return "bg-red-500/10";
  return "bg-muted/50";
}

export default function InventoryTable({
  items,
  filters,
  warehouses,
  brands,
  categories,
  pagination,
  perPageOptions,
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

  const conditionOptions = useMemo(() => {
    const foundConditions = [...new Set(items
      .map((item) => String(item.variantCondition ?? "").trim())
      .filter(Boolean))];

    const normalizedConditions = ["Brand New", "Certified Pre-Owned", ...foundConditions]
      .filter((value, index, arr) => arr.indexOf(value) === index);

    return [
      { value: "all", label: "All Conditions" },
      ...normalizedConditions.map((condition) => ({
        value: condition,
        label: CONDITION_LABELS[condition] ?? condition,
      })),
    ];
  }, [items]);

  const allVisibleSelected = items.length > 0 && items.every((item) => selectedItems.includes(item.id));

  const updateFilter = (key, value) => {
    onVisit({ [key]: value, page: undefined });
  };

  const toggleSort = (field) => {
    const direction = filters.sort === field && filters.direction === "asc" ? "desc" : "asc";
    onVisit({ sort: field, direction, page: undefined });
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
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(0,0.8fr))]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onVisit({ search: searchValue.trim(), page: undefined });
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="eg. iPhone 13 4 256 grey bn"
            className="h-10 pl-9 pr-12 bg-background"
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

        {/* Comboboxes automatically use standard UI theme */}
        <Combobox
          value={String(filters.location)}
          onValueChange={(value) => updateFilter("location", value || "all")}
          options={locationOptions}
          placeholder="All Warehouses"
          className="h-10"
        />

        <Combobox
          value={String(filters.status)}
          onValueChange={(value) => updateFilter("status", value || "all")}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
          className="h-10"
        />

        <Combobox
          value={String(filters.brand)}
          onValueChange={(value) => updateFilter("brand", value || "all")}
          options={brandOptions}
          placeholder="All Brands"
          className="h-10"
        />

        <Combobox
          value={String(filters.category)}
          onValueChange={(value) => updateFilter("category", value || "all")}
          options={categoryOptions}
          placeholder="All Categories"
          className="h-10"
        />

        <Combobox
          value={String(filters.condition ?? "all")}
          onValueChange={(value) => updateFilter("condition", value || "all")}
          options={conditionOptions}
          placeholder="All Conditions"
          className="h-10"
        />

        <Combobox
          value={String(filters.stockAge ?? "all")}
          onValueChange={(value) => updateFilter("stockAge", value || "all")}
          options={STOCK_AGE_OPTIONS}
          placeholder="All Stock Age"
          className="h-10"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-xs">
          <thead className="sticky top-0 z-10 border-b border-primary bg-background text-muted-foreground backdrop-blur-md">
            <tr>
              <th className="px-4 py-3 text-left">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
              </th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Product" active={filters.sort === "productName"} direction={filters.direction} onClick={() => toggleSort("productName")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Barcode" active={filters.sort === "serial_number"} direction={filters.direction} onClick={() => toggleSort("serial_number")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Location" active={filters.sort === "warehouseName"} direction={filters.direction} onClick={() => toggleSort("warehouseName")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Encoded" active={filters.sort === "encoded_date"} direction={filters.direction} onClick={() => toggleSort("encoded_date")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Age" active={filters.sort === "stockAgeDays"} direction={filters.direction} onClick={() => toggleSort("stockAgeDays")} /></th>
              <th className="px-4 py-3 text-left">Warranty</th>
              <th className="px-4 py-3 text-right"><SortableHeader align="right" label="Cost" active={filters.sort === "cost_price"} direction={filters.direction} onClick={() => toggleSort("cost_price")} /></th>
              <th className="px-4 py-3 text-right"><SortableHeader align="right" label="Cash" active={filters.sort === "cash_price"} direction={filters.direction} onClick={() => toggleSort("cash_price")} /></th>
              <th className="px-4 py-3 text-right"><SortableHeader align="right" label="SRP" active={filters.sort === "srp"} direction={filters.direction} onClick={() => toggleSort("srp")} /></th>
              <th className="px-4 py-3 text-left"><SortableHeader label="Status" active={filters.sort === "status"} direction={filters.direction} onClick={() => toggleSort("status")} /></th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {items.length ? items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <td className="px-4 py-4">
                  <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={(checked) => toggleRow(item.id, checked)} />
                </td>
                <td className="px-4 py-4">
                  <div className="max-w-[280px] space-y-1">
                    <div className="font-medium text-foreground">{[item.brandName, item.masterModel].filter(Boolean).join(" ") || item.productName}</div>
                    <div className="flex flex-wrap gap-1">
                      {item.variantCondition ? (
                        <Badge
                          variant="outline"
                          className={`${CHIP_BASE_CLASS} ${item.variantCondition === "Certified Pre-Owned" ? CHIP_COLORS.conditionCpo : CHIP_COLORS.conditionDefault}`}
                        >
                          {item.variantCondition === "Certified Pre-Owned" ? "CPO" : item.variantCondition}
                        </Badge>
                      ) : null}
                      {item.attrRAM && <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.ram}`}>{item.attrRAM}</Badge>}
                      {item.attrROM && <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.rom}`}>{item.attrROM}</Badge>}
                      {item.attrColor && <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.color}`}>{item.attrColor}</Badge>}
                      {item.cpu && <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.cpu}`}>{item.cpu}</Badge>}
                      {item.gpu && <Badge variant="outline" className={`${CHIP_BASE_CLASS} ${CHIP_COLORS.gpu}`}>{item.gpu}</Badge>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                  <div className="space-y-0.5">
                    {item.imei1 && <div>{item.imei1}</div>}
                    {item.serial_number && <div>{item.serial_number}</div>}
                  </div>
                </td>
                <td className="px-4 py-4 text-foreground/80">{item.warehouseName}</td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{formatDateTime(item.encoded_date || item.created_date)}</td>
                <td className="px-4 py-4">
                  <span className={`text-xs font-medium ${getStockAgeColor(item.encoded_date || item.created_date)}`}>
                    {calculateStockAge(item.encoded_date || item.created_date)}
                  </span>
                </td>
                <td className="px-4 py-4 text-foreground/80">{item.warranty_description || "No Warranty"}</td>
                <td className="px-4 py-4 text-right font-mono text-xs text-muted-foreground">{formatCurrency(item.cost_price)}</td>
                <td className="px-4 py-4 text-right font-mono text-xs font-medium text-foreground">{formatCurrency(item.cash_price)}</td>
                <td className="px-4 py-4 text-right font-mono text-xs text-muted-foreground">{formatCurrency(item.srp)}</td>
                <td className="px-4 py-4">
                  <Badge className={`${getStatusColor(item.status)} ${getStatusHeatmapClass(item.status)} border-0 px-2 py-0.5 text-[10px] uppercase shadow-none`}>
                    {item.status === "available" ? "active" : item.status.replaceAll("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-right">
                  <Button variant="ghost" size="sm" className="" onClick={() => onViewDetails(item)}>
                    <Eye className="size-4" />
                  </Button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No inventory items matched the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Showing {pagination.from ?? 0} to {pagination.to ?? 0} of {pagination.total ?? 0} item(s)
        </div>
        <div className="flex items-center gap-2">
          <select
            value={String(pagination.perPage)}
            onChange={(event) => onVisit({ perPage: Number(event.target.value), page: undefined })}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-ring"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
          <Button variant="outline" size="sm" disabled={pagination.currentPage <= 1} onClick={() => onVisit({ page: pagination.currentPage - 1 })}>
            Previous
          </Button>
          <div className="text-xs text-muted-foreground px-2">
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
