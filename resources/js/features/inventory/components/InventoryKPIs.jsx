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
      bgClass: "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-900",
    },
    {
      label: "Available Stock",
      value: (data?.availableStock ?? 0).toLocaleString(),
      icon: CheckCircle,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-900",
    },
    {
      label: "Total Valuation",
      value: formatCurrency(data?.totalValuation ?? 0),
      icon: DollarSign,
      colorClass: "text-cyan-600 dark:text-cyan-400",
      bgClass: "bg-cyan-50 border-cyan-100 dark:bg-cyan-950/50 dark:border-cyan-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className="relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                {loading ? (
                  <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
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