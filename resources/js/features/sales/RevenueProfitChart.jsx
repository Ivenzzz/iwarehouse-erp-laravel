import React from "react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
);

export default function RevenueProfitChart({ dailyData, isLoading }) {
  // Find max for scaling
  const maxSales = Math.max(...Object.values(dailyData).map((d) => d.sales || 0), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Revenue vs Profitability
      </h3>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="flex items-end gap-4 h-48 px-2">
          {Object.entries(dailyData).map(([day, data]) => {
            const salesHeight = (data.sales / maxSales) * 100;
            const profitHeight = maxSales > 0 ? (data.profit / maxSales) * 100 : 0;

            return (
              <div key={day} className="flex-1 flex flex-col items-center group">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  Sales: {formatCurrency(data.sales)} | Profit: {formatCurrency(data.profit)}
                </div>

                {/* Bars Container */}
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  {/* Sales Bar */}
                  <div
                    className="w-1/3 bg-blue-400 dark:bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-500 dark:hover:bg-blue-400 relative"
                    style={{ height: `${Math.max(salesHeight, 4)}%` }}
                  >
                    {/* Profit Bar (Nested) */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-green-500 dark:bg-green-400 rounded-t"
                      style={{ height: `${profitHeight > 0 ? (profitHeight / salesHeight) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Label */}
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-400 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Profit</span>
        </div>
      </div>
    </div>
  );
}