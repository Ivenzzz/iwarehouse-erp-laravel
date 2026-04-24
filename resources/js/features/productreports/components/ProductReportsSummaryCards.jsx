import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Package, FileText } from "lucide-react";

const formatPHP = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function ProductReportsSummaryCards({ summary }) {
  const cards = [
    {
      title: "Total Line Items",
      value: summary.totalRows,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      ring: "ring-1 ring-blue-100 dark:ring-blue-900/40",
    },
    {
      title: "Total Quantity",
      value: summary.totalQuantity,
      icon: ShoppingCart,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
      ring: "ring-1 ring-violet-100 dark:ring-violet-900/40",
    },
    {
      title: "Total Value",
      value: formatPHP(summary.totalValue),
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      ring: "ring-1 ring-emerald-100 dark:ring-emerald-900/40",
    },
    {
      title: "Unique Transactions",
      value: summary.uniqueTransactions,
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      ring: "ring-1 ring-amber-100 dark:ring-amber-900/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card
          key={i}
          className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.title}
                </p>
                <p className={`mt-1 text-2xl font-bold ${card.color}`}>
                  {card.value}
                </p>
              </div>

              <div className={`rounded-lg p-2 ${card.bgColor} ${card.ring}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}