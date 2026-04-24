import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const formatPHP = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const SortableHeader = ({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
  className = "",
}) => {
  const isActive = sortBy === column;

  return (
    <th
      className={`select-none whitespace-nowrap px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer
        text-slate-500 dark:text-slate-400
        hover:bg-slate-100 dark:hover:bg-slate-800
        ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </th>
  );
};

const COLUMNS = [
  { label: "Branch", key: "branch" },
  { label: "Customer Name", key: "customerName" },
  { label: "Contact No", key: "contactNo" },
  { label: "DR#", key: "drNumber" },
  { label: "OR#", key: "orNumber" },
  { label: "Brand", key: "brand" },
  { label: "Model", key: "model" },
  { label: "Product", key: "product" },
  { label: "Category", key: "category" },
  { label: "Subcategory", key: "subcategory" },
  { label: "Condition", key: "condition" },
  { label: "Cost", key: "cost", isCurrency: true },
  { label: "Color", key: "color" },
  { label: "Payment Type", key: "paymentType" },
  { label: "Supplier", key: "supplierName" },
  { label: "Supplier Contact", key: "supplierContact" },
  { label: "Qty", key: "quantity" },
  { label: "Barcode", key: "barcode" },
  { label: "Value", key: "value", isCurrency: true },
  { label: "Sales Person", key: "salesPerson" },
  { label: "Date (M-D-Y)", key: "date" },
  { label: "Time", key: "time" },
  { label: "Week #", key: "weekNumber" },
  { label: "Month", key: "month" },
  { label: "Year", key: "year" },
];

export default function ProductReportsTable({
  rows,
  isLoading,
  sortBy,
  sortDir,
  onSort,
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
          <p className="text-slate-500 dark:text-slate-400">
            Loading sales data...
          </p>
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">
          No records match the filters
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Scroll container: enables sticky header */}
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-xs">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <tr>
              {COLUMNS.map((col) => (
                <SortableHeader
                  key={col.key}
                  label={col.label}
                  column={col.key}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                {COLUMNS.map((col) => {
                  const val = row[col.key];

                  if (col.isCurrency) {
                    return (
                      <td
                        key={col.key}
                        className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-slate-900 dark:text-slate-100"
                      >
                        {formatPHP(val)}
                      </td>
                    );
                  }

                  if (col.key === "quantity") {
                    return (
                      <td
                        key={col.key}
                        className="px-3 py-2.5 text-right text-slate-900 dark:text-slate-100"
                      >
                        {val}
                      </td>
                    );
                  }

                  if (col.key === "weekNumber") {
                    return (
                      <td
                        key={col.key}
                        className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-400"
                      >
                        {val}
                      </td>
                    );
                  }

                  if (
                    col.key === "barcode" ||
                    col.key === "drNumber" ||
                    col.key === "orNumber"
                  ) {
                    return (
                      <td
                        key={col.key}
                        className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300"
                      >
                        {val}
                      </td>
                    );
                  }

                  if (col.key === "branch") {
                    return (
                      <td
                        key={col.key}
                        className="whitespace-nowrap px-3 py-2.5 text-slate-900 dark:text-slate-100"
                      >
                        {val}
                      </td>
                    );
                  }

                  if (col.key === "product") {
                    return (
                      <td
                        key={col.key}
                        className="max-w-[200px] truncate whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300"
                        title={val}
                      >
                        {val}
                      </td>
                    );
                  }

                  if (col.key === "paymentType") {
                    return (
                      <td
                        key={col.key}
                        className="max-w-[260px] truncate whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300"
                        title={val}
                      >
                        {val}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300"
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}