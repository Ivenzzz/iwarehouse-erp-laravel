import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const statusColors = {
  available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  reserved: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  reserved_for_transfer: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  qc_pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

function SortableHeader({ label, sort, filters, onSort, align = "left" }) {
  const active = filters.sort === sort;
  const Icon = !active ? ArrowUpDown : filters.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sort)}
      className={`inline-flex items-center gap-1 text-xs font-bold uppercase text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 ${align === "right" ? "justify-end" : ""}`}
    >
      <span>{label}</span>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default function PriceControllerTable({
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
  filters,
  warehouses,
  statusOptions,
  pagination,
  perPageOptions,
  onVisit,
  onExport,
}) {
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const updateFilter = (key, value) => {
    onVisit({ [key]: value, page: undefined });
  };

  const sortBy = (sort) => {
    const direction = filters.sort === sort && filters.direction === "asc" ? "desc" : "asc";
    onVisit({ sort, direction, page: undefined });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={String(filters.warehouse)}
            onChange={(event) => updateFilter("warehouse", event.target.value)}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>

          <select
            value={String(filters.status)}
            onChange={(event) => updateFilter("status", event.target.value)}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <select
            value={String(pagination.perPage)}
            onChange={(event) => onVisit({ perPage: Number(event.target.value), page: undefined })}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <th className="w-10 px-3 py-3 text-left">
                  <Checkbox
                    checked={allSelected}
                    data-indeterminate={someSelected ? "true" : "false"}
                    onCheckedChange={onToggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Product / Variant" sort="product" filters={filters} onSort={sortBy} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Identifier" sort="identifier" filters={filters} onSort={sortBy} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Warehouse" sort="warehouse" filters={filters} onSort={sortBy} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Status" sort="status" filters={filters} onSort={sortBy} />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortableHeader label="Current Cash" sort="cash_price" filters={filters} onSort={sortBy} align="right" />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortableHeader label="Current SRP" sort="srp" filters={filters} onSort={sortBy} align="right" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    No items found. Search to begin.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                      onClick={() => onToggleItem(item.id)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleItem(item.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                            {item.product_label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.variant_label}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {item.identifier}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {item.warehouse_name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${statusColors[item.status] || "bg-gray-100 text-gray-800"}`}
                        >
                          {item.status_label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-900 dark:text-white">
                        {item.cash_price_formatted}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-900 dark:text-white">
                        {item.srp_formatted}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Showing {pagination.from ?? 0} to {pagination.to ?? 0} of {pagination.total ?? 0} item(s)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage <= 1}
            onClick={() => onVisit({ page: pagination.currentPage - 1 })}
          >
            Previous
          </Button>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Page {pagination.currentPage} of {pagination.lastPage}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage >= pagination.lastPage}
            onClick={() => onVisit({ page: pagination.currentPage + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
