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

const PAYMENT_COLORS = {
  Cash: "bg-green-500",
  GCash: "bg-blue-500",
  Maya: "bg-purple-500",
  "Credit Card": "bg-orange-500",
  "Debit Card": "bg-indigo-500",
  "Bank Transfer": "bg-cyan-500",
};

export default function PaymentMethodBreakdown({ paymentMethods, isLoading }) {
  const total = Object.values(paymentMethods).reduce((sum, val) => sum + val, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
        Payment Methods
      </h3>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-3">
          {Object.entries(paymentMethods).map(([method, amount]) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0;
            const colorClass = PAYMENT_COLORS[method] || "bg-gray-500";
            
            return (
              <div key={method}>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">{method}</span>
                  <span className="text-gray-800 dark:text-gray-200 font-semibold">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}