import React from "react";
import { User, Calendar, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

export default function CustomerInsights({ customer }) {
  if (!customer) return null;

  const insights = customer.insights || {};
  const frequentItems = insights.frequent_purchases || [];
  const lastVisitDate = insights.last_visit_at ? new Date(insights.last_visit_at) : null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-2 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
        <User className="w-4 h-4" />
        <span>Customer Insights</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-white dark:bg-slate-800 px-2 py-2">
          <div className="flex items-center gap-1 mb-1">
            <ShoppingBag className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Transactions</p>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {insights.transaction_count || 0}
          </p>
        </div>
        <div className="rounded bg-white dark:bg-slate-800 px-2 py-2">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Last Visit</p>
          </div>
          <p className="text-[11px] font-medium text-slate-900 dark:text-slate-100">
            {lastVisitDate ? format(lastVisitDate, "MMM dd, yyyy") : "N/A"}
          </p>
        </div>
      </div>

      {frequentItems.length > 0 && (
        <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-1 mb-1.5">
            <ShoppingBag className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Frequent Purchases</p>
          </div>
          <div className="space-y-1">
            {frequentItems.map((item, idx) => (
              <div
                key={idx}
                className="text-xs bg-white dark:bg-gray-800 rounded px-2 py-1 flex justify-between items-center"
              >
                <span className="truncate text-gray-900 dark:text-white">{item.product_name}</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold ml-2">{item.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
