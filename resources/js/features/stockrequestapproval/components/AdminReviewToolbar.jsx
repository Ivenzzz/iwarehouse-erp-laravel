import React from "react";
import { Search, Building2, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminReviewToolbar({
  searchTerm,
  setSearchTerm,
  filterStore,
  setFilterStore,
  filterDateRange,
  setFilterDateRange,
  warehouses,
  selectedCount,
  onBatchReview,
  onClearSelection,
}) {
  const stores = warehouses?.filter(
    (w) => w.warehouse_type === "store" || w.warehouse_type === "kiosk"
  ) || [];

  return (
    <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between bg-muted/40">
      {/* Left: Filters */}
      <div className="flex items-center gap-3 flex-1 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search request..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-background border border-input rounded text-sm focus:border-primary focus:outline-none w-48 transition-colors text-foreground"
          />
        </div>

        <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

        {/* Branch Filter */}
        <Select value={filterStore} onValueChange={setFilterStore}>
          <SelectTrigger className="w-[180px] bg-background border-input text-foreground">
            <Building2 size={16} className="text-muted-foreground mr-2" />
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select value={filterDateRange} onValueChange={setFilterDateRange}>
          <SelectTrigger className="w-[140px] bg-background border-input text-foreground">
            <Calendar size={16} className="text-muted-foreground mr-2" />
            <SelectValue placeholder="This Week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right: Bulk Actions (Conditional) */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <span className="text-sm text-foreground mr-2">
            {selectedCount} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchReview}
            className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900"
          >
            <CheckCircle size={14} className="mr-1" /> Review
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

