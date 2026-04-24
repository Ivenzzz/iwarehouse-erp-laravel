import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw, Calendar } from "lucide-react";

export default function ProductReportsFilterBar({
  filters,
  brands,
  warehouseOptions,
  onFilterChange,
  onReset,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search customer, DR#, OR#, brand, barcode..."
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              className="border-slate-300 bg-white pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Start Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange("startDate", e.target.value)}
              className="border-slate-300 bg-white pl-9 text-slate-900 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            End Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange("endDate", e.target.value)}
              className="border-slate-300 bg-white pl-9 text-slate-900 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Branch */}
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Branch
          </label>
          <Select
            value={filters.warehouseId || "all"}
            onValueChange={(val) => onFilterChange("warehouseId", val === "all" ? "" : val)}
          >
            <SelectTrigger className="border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <SelectItem value="all">All Branches</SelectItem>
              {warehouseOptions.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Brand */}
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Brand
          </label>
          <Select
            value={filters.brandFilter || "all"}
            onValueChange={(val) => onFilterChange("brandFilter", val === "all" ? "" : val)}
          >
            <SelectTrigger className="border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product (Variant Name) */}
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Product
          </label>
          <Input
            placeholder="Filter by variant name..."
            value={filters.productFilter || ""}
            onChange={(e) => onFilterChange("productFilter", e.target.value)}
            className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Reset */}
        <Button
          variant="outline"
          onClick={onReset}
          className="gap-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}