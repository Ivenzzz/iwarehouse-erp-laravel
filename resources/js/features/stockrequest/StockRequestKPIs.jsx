import React from "react";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";

export default function StockRequestKPIs({ metrics }) {
  const stats = [
    { label: "Total Requests", value: metrics.total, icon: FileText, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/30" },
    { label: "Pending", value: metrics.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/30" },
    { label: "Approved", value: metrics.approved, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/30" },
    { label: "Rejected", value: metrics.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/30" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <div 
          key={idx} 
          className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {stat.label}
            </p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {stat.value}
            </h3>
          </div>
          <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
            <stat.icon size={22} />
          </div>
        </div>
      ))}
    </div>
  );
}