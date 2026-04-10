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

export default function SalesKPICards({ kpis, isLoading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
            kpi.bg || "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}
        >
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {kpi.label}
              </p>
              <h3 className={`text-xl font-bold mt-1 ${kpi.color}`}>
                {formatCurrency(kpi.value)}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{kpi.sub}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}