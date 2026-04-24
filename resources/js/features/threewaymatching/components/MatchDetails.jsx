import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentBadge, StatusBadge } from "./StatusBadge";
import MatchSummaryCards from "./MatchSummaryCards";
import ItemComparisonSection from "./ItemComparisonSection";
import { formatMoney } from "../lib/formatters";
import { MATCHED } from "../lib/constants";

function SelectedMatchTimeline({ selectedMatch }) {
  const stages = [
    { label: "Purchase Order", state: "done" },
    { label: "Goods Receipt", state: selectedMatch.goodsReceipt ? "done" : "warning" },
    { label: "Invoice", state: selectedMatch.invoiceRecord ? "done" : "idle" },
    { label: "Payment", state: selectedMatch.isPaid ? "done" : selectedMatch.paymentState === "ready" ? "current" : "idle" },
  ];

  const getDotClass = (state) => {
    if (state === "done") return "border-success/40 bg-success-muted text-success-muted-foreground";
    if (state === "warning") return "border-warning/40 bg-warning-muted text-warning-muted-foreground";
    if (state === "current") return "border-info/40 bg-info-muted text-info-muted-foreground";
    return "border-border bg-background/30 text-muted-foreground";
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-muted/10 p-4">
      <div className="relative grid grid-cols-4 gap-3">
        <div className="absolute left-[12.5%] right-[12.5%] top-4 h-px bg-border/80" />
        {stages.map((stage) => (
          <div key={stage.label} className="relative z-10 flex flex-col items-center gap-2 text-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${getDotClass(stage.state)}`}>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className={`text-sm ${stage.state === "done" || stage.state === "current" ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {stage.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchDetails({ selectedMatch, onOpenPaymentDialog }) {
  if (!selectedMatch) return null;

  return (
    <div className="xl:h-full xl:min-h-0">
      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/10 shadow-none xl:flex xl:h-full xl:flex-col">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle className="text-xs font-semibold tracking-tight">{selectedMatch.po.po_number || "Purchase Order"}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{selectedMatch.supplierName}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selectedMatch.status} />
                <PaymentBadge state={selectedMatch.paymentState} />
                <span className="rounded-full border border-border/70 bg-background/20 px-3 py-1 text-xs text-muted-foreground">
                  {selectedMatch.lines.length} {selectedMatch.lines.length === 1 ? "line reviewed" : "lines reviewed"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <span
                className={`inline-flex items-center rounded-xl border px-4 py-2 text-xs font-medium ${
                  selectedMatch.status === MATCHED
                    ? "border-success/25 bg-success-muted text-success-muted-foreground"
                    : "border-destructive/25 bg-destructive-muted text-destructive-muted-foreground"
                }`}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {selectedMatch.status === MATCHED ? "Fully Matched" : "Needs Review"}
              </span>
              <span className="inline-flex items-center rounded-xl border border-info/25 bg-info-muted px-4 py-2 text-xs font-medium text-info-muted-foreground">
                {selectedMatch.paymentState === "paid" ? "Paid" : selectedMatch.paymentState === "ready" ? "Ready for Payment" : "Payment Blocked"}
              </span>
            </div>

            <SelectedMatchTimeline selectedMatch={selectedMatch} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          <MatchSummaryCards selectedMatch={selectedMatch} onOpenPaymentDialog={onOpenPaymentDialog} />

          {(selectedMatch.documentWarnings.length > 0 || selectedMatch.totals.hasTotalWarning) && (
            <Card className="border-warning/20 bg-warning-muted shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-warning-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Attention Required
                </div>
                {selectedMatch.documentWarnings.map((warning) => (
                  <p key={warning} className="text-xs text-warning-muted-foreground">
                    {warning}
                  </p>
                ))}
                {selectedMatch.totals.hasTotalWarning && (
                  <p className="text-xs text-warning-muted-foreground">
                    Invoice total {formatMoney(selectedMatch.totals.invoiceTotal)} differs from PO subtotal {formatMoney(selectedMatch.totals.poSubtotal)}. This warning is informational and does not create a mismatch by itself.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <ItemComparisonSection lines={selectedMatch.lines} selectedMatch={selectedMatch} />
        </CardContent>
      </Card>
    </div>
  );
}

