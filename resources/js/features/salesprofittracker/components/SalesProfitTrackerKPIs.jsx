import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Percent, Boxes, CreditCard, Wallet } from "lucide-react";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function changePercent(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

const kpiDefs = [
  { key: "totalRevenue", label: "Total Revenue", icon: DollarSign, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", isCurrency: true },
  { key: "totalCost", label: "Total Cost", icon: Boxes, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800/40", isCurrency: true },
  { key: "grossProfit", label: "Gross Profit", icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", isCurrency: true },
  { key: "profitMargin", label: "Profit Margin", icon: Percent, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20", isCurrency: false },
  { key: "totalMDR", label: "MDR Deductions", icon: CreditCard, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", isCurrency: true },
  { key: "netProfit", label: "Net Profit (after MDR)", icon: Wallet, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20", isCurrency: true },
];

export default function SalesProfitTrackerKPIs({ current, previous }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {kpiDefs.map((kpi) => {
        const Icon = kpi.icon;
        const value = current?.[kpi.key] || 0;
        const prevValue = previous?.[kpi.key] || 0;
        const change = changePercent(value, prevValue);

        return (
          <Card key={kpi.key} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {kpi.isCurrency ? formatCurrency(value) : `${value.toFixed(1)}%`}
              </p>
              {change !== null && (
                <div className="flex items-center gap-1 mt-1.5">
                  {change >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs prev</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
