import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ComparisonDocumentCard({
  title,
  quantityLabel,
  quantityValue,
  priceLabel,
  priceValue,
  totalLabel,
  totalValue,
  specLabel,
  statusLabel,
  warning,
}) {
  const statusIsWarning = statusLabel?.toLowerCase().includes("not linked") || statusLabel?.toLowerCase().includes("missing") || warning;

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-card via-card to-muted/10 shadow-none">
      <div className="rounded-t-2xl border-b border-border/70 bg-muted/25 px-4 py-3">
        <p className="font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{quantityLabel}</span>
            <span className="font-mono font-semibold text-foreground">{quantityValue}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{priceLabel}</span>
            <span className="font-mono font-semibold text-foreground">{priceValue}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span className="text-muted-foreground">{totalLabel}</span>
            <span className="font-mono text-xs font-semibold text-foreground">{totalValue}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{specLabel}</span>
        </div>

        <div className={`flex items-center gap-2 text-xs ${statusIsWarning ? "text-warning-muted-foreground" : "text-success-muted-foreground"}`}>
          {statusIsWarning ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}
