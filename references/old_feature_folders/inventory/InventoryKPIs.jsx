import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "./utils/inventoryUtils";
import { useInventoryKPIs } from "./hooks/useInventoryKPIs";

export function InventoryKPIs() {
  const { data, isLoading } = useInventoryKPIs();

  const totalItems = data?.totalItems ?? 0;
  const availableStock = data?.availableStock ?? 0;
  const totalValuation = data?.totalValuation ?? 0;

  const kpis = [
    {
      label: "Total Items",
      value: totalItems.toLocaleString(),
      icon: Package,
      colorClass: "text-indigo-600 dark:text-indigo-400",
      bgClass: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
    },
    {
      label: "Available Stock",
      value: availableStock.toLocaleString(),
      icon: CheckCircle,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    },
    {
      label: "Total Valuation",
      value: formatCurrency(totalValuation),
      icon: DollarSign,
      colorClass: "text-cyan-600 dark:text-cyan-400",
      bgClass: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </p>
                {isLoading ? (
                  <div className="h-9 w-32 animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {kpi.value}
                  </p>
                )}
              </div>
              <div 
                className={`flex h-12 w-12 items-center justify-center rounded-xl border ${kpi.bgClass}`}
              >
                <kpi.icon className={`h-6 w-6 ${kpi.colorClass}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}