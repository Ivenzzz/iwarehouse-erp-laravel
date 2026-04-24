import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ComparisonDocumentCard from "./ComparisonDocumentCard";
import { CheckBadge } from "./StatusBadge";
import { formatDate, formatMoney, formatQuantity } from "../utils/threeWayMatchingFormatters";
import { MATCHED } from "../utils/threeWayMatchingMeta";

function PaymentPanel({ selectedMatch }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-card via-card to-muted/10 p-4">
      <p className="text-xs font-semibold text-foreground">Payment Status</p>
      <p className="mt-3 text-xs font-semibold text-foreground">
        {selectedMatch.paymentState === "paid" ? "Paid" : selectedMatch.paymentState === "ready" ? "Ready" : "Blocked"}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {selectedMatch.payable?.paid_date ? formatDate(selectedMatch.payable.paid_date) : "Not paid yet"}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Paid By</p>
      <p className="break-all font-semibold text-foreground">{selectedMatch.payable?.paid_by || "N/A"}</p>
      <div className="mt-5 rounded-xl border border-border/70 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
        {selectedMatch.paymentState === "paid"
          ? "This PO has already been marked as paid."
          : selectedMatch.paymentState === "ready"
            ? "This PO is ready for payment."
            : "Matching must pass before payment."}
      </div>
    </div>
  );
}

export default function ItemComparisonSection({ lines, selectedMatch }) {
  return (
    <Card className="border-border/70 bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs">Item-Level Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {lines.map((line) => (
          <div
            key={line.key}
            className="rounded-[28px] border border-border/70 bg-gradient-to-br from-card via-card to-muted/10 p-5 shadow-none"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-tight text-foreground">{line.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{line.conditionLabel}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`w-fit rounded-xl px-4 py-2 text-xs ${
                      line.status === MATCHED
                        ? "border-success/20 bg-success-muted text-success-muted-foreground"
                        : "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground"
                    }`}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {line.status === MATCHED ? "Fully Matched" : "Needs Review"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr),minmax(0,1.35fr),280px]">
                <ComparisonDocumentCard
                  title="Purchase Order"
                  quantityLabel="Qty"
                  quantityValue={formatQuantity(line.poQuantity)}
                  priceLabel="Unit Price"
                  priceValue={line.poPrice === null || line.poPrice === undefined ? "N/A" : formatMoney(line.poPrice)}
                  totalLabel="Total"
                  totalValue={formatMoney(line.poAmount)}
                  specLabel={line.poSpecSummary}
                  statusLabel={line.hasPOLine ? "Matched" : "Missing"}
                />
                <ComparisonDocumentCard
                  title="Goods Receipt"
                  quantityLabel="Qty"
                  quantityValue={formatQuantity(line.grnQuantity)}
                  priceLabel="Unit Price"
                  priceValue={line.poPrice === null || line.poPrice === undefined ? "N/A" : formatMoney(line.poPrice)}
                  totalLabel="Total"
                  totalValue={line.grnAmount === null ? "N/A" : formatMoney(line.grnAmount)}
                  specLabel={line.grnSpecSummary}
                  statusLabel={line.hasGRNLine ? "Matched" : "GRN Not Linked Yet"}
                  warning={!line.hasGRNLine}
                />
                <ComparisonDocumentCard
                  title="Invoice"
                  quantityLabel="Qty"
                  quantityValue={formatQuantity(line.invoiceQuantity)}
                  priceLabel="Unit Price"
                  priceValue={line.invoicePrice === null || line.invoicePrice === undefined ? "N/A" : formatMoney(line.invoicePrice)}
                  totalLabel="Total"
                  totalValue={formatMoney(line.invoiceAmount)}
                  specLabel={line.invoiceSpecSummary}
                  statusLabel={line.hasInvoiceLine ? "Matched" : "Missing"}
                />
                <PaymentPanel selectedMatch={selectedMatch} />
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-5 w-5 ${line.status === MATCHED ? "text-success" : "text-destructive"}`} />
                    <p className="text-xs font-semibold text-foreground">
                      Variance:{" "}
                      <span className={line.status === MATCHED ? "text-success-muted-foreground" : "text-destructive-muted-foreground"}>
                        {line.status === MATCHED ? "None" : "Detected"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CheckBadge state={line.identityStatus} label="Item" />
                    <CheckBadge state={line.quantityStatus} label="Qty" />
                    <CheckBadge state={line.priceStatus} label="Price" />
                  </div>
                </div>

                <div className="mt-4 border-t border-border/70 pt-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span>
                      Qty Delta:{" "}
                      <span className={`font-mono font-semibold ${line.quantityVariance > 0 ? "text-destructive" : "text-foreground"}`}>
                        {line.quantityVariance === null
                          ? "N/A"
                          : `${line.quantityVariance > 0 ? "+" : ""}${formatQuantity(line.quantityVariance)}`}
                      </span>
                    </span>
                    <span className="hidden text-border lg:inline">|</span>
                    <span>
                      Price Delta:{" "}
                      <span className={`font-mono font-semibold ${line.priceVariance > 0 ? "text-destructive" : "text-foreground"}`}>
                        {line.priceVariance === null
                          ? "N/A"
                          : `${line.priceVariance > 0 ? "+" : ""}${formatMoney(line.priceVariance)}`}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>PO: {line.poLabel}</p>
                      <p>GR: {line.grnLabel}</p>
                      <p>Invoice: {line.invoiceLabel}</p>
                    </div>
                    {line.issues.length > 0 ? (
                      <div className="space-y-1">
                        {line.issues.map((issue) => (
                          <p key={issue} className="text-xs text-destructive">
                            {issue}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-success-muted-foreground">All checks passed for this line.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
