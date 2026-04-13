import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Clock, CheckCircle2, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function RFQStatsCards({
  totalRFQs,
  receivingQuotesCount,
  avgTurnaround,
  convertedCount,
  onFilterChange
}) {
  const stats = [
    {
      label: "Total RFQs",
      value: totalRFQs,
      icon: FileText,
      iconClassName: "text-primary",
      iconSurfaceClassName: "bg-primary/10",
      filter: "all",
      trend: "neutral"
    },
    {
      label: "Receiving Quotes",
      value: receivingQuotesCount,
      icon: DollarSign,
      iconClassName: "text-chart-3",
      iconSurfaceClassName: "bg-chart-3/10",
      filter: "receiving_quotes",
      trend: "up"
    },
    {
      label: "Avg. Turnaround",
      value: `${avgTurnaround} hrs`,
      sub: "Target: <= 48 hrs",
      icon: Clock,
      iconClassName: "text-chart-5",
      iconSurfaceClassName: "bg-chart-5/10",
      filter: "all",
      trend: parseFloat(avgTurnaround) > 48 ? "down" : "up"
    },
    {
      label: "Converted to PO",
      value: convertedCount,
      icon: CheckCircle2,
      iconClassName: "text-chart-2",
      iconSurfaceClassName: "bg-chart-2/10",
      filter: "converted_to_po",
      trend: "up"
    }
  ];

  const renderTrend = (type, label) => {
    if (label === "Avg. Turnaround") {
      if (type === "up") return <span className="flex items-center gap-1 text-xs text-chart-2"><TrendingDown className="h-3 w-3" /> Improved</span>;
      if (type === "down") return <span className="flex items-center gap-1 text-xs text-destructive"><TrendingUp className="h-3 w-3" /> Slower</span>;
    }

    if (type === "up") return <span className="flex items-center gap-1 text-xs text-chart-2"><TrendingUp className="h-3 w-3" /> +12%</span>;
    if (type === "down") return <span className="flex items-center gap-1 text-xs text-destructive"><TrendingDown className="h-3 w-3" /> -5%</span>;
    return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> Same</span>;
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {stats.map((stat, idx) => (
        <Card
          key={idx}
          className="cursor-pointer border-border bg-card text-card-foreground transition-all hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm"
          onClick={() => onFilterChange && onFilterChange(stat.filter)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                {stat.sub ? (
                  <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
                ) : (
                  <div className="mt-1">
                    {renderTrend(stat.trend, stat.label)}
                  </div>
                )}
              </div>
              <div className={`rounded-xl p-3 ${stat.iconSurfaceClassName}`}>
                <stat.icon className={`h-6 w-6 ${stat.iconClassName}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
