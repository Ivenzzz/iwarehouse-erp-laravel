import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle, DollarSign, Package } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { formatCurrency } from "@/features/inventory/lib/inventoryUtils";

export default function InventoryKPIs({ refreshToken = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    axios.get(route("inventory.kpis"))
      .then((response) => {
        if (active) setData(response.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const kpis = [
    {
      label: "Total Items",
      value: (data?.totalItems ?? 0).toLocaleString(),
      icon: Package,
      colorClass: "text-indigo-600 dark:text-indigo-400",
      bgClass: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
      cardClass: "border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] before:bg-indigo-500/70",
    },
    {
      label: "Available Stock",
      value: (data?.availableStock ?? 0).toLocaleString(),
      icon: CheckCircle,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
      cardClass: "border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] before:bg-emerald-500/70",
    },
    {
      label: "Total Valuation",
      value: formatCurrency(data?.totalValuation ?? 0),
      icon: DollarSign,
      colorClass: "text-cyan-600 dark:text-cyan-400",
      bgClass: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20",
      cardClass: "border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] before:bg-cyan-500/70",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className={`relative overflow-hidden rounded-xl ${kpi.cardClass} before:absolute before:inset-x-0 before:top-0 before:h-1 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_10px_24px_rgba(0,0,0,0.28)]`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </p>
                {loading ? (
                  <div className="h-9 w-32 animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {kpi.value}
                  </p>
                )}
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${kpi.bgClass}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.colorClass}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
