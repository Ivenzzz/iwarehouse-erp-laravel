import React from "react";
import { ClipboardCheck, GitCompare, PackageCheck, ReceiptText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PAYMENT_META } from "../lib/constants";
import { formatDate, formatDateTime, formatMoney } from "../lib/formatters";

export default function MatchSummaryCards({ selectedMatch, onOpenPaymentDialog }) {
  const poQty = selectedMatch.lines.reduce((sum, line) => sum + (line.poQuantity || 0), 0);
  const grnQty = selectedMatch.lines.reduce((sum, line) => sum + (line.grnQuantity || 0), 0);
  const grnTotal = selectedMatch.lines.reduce((sum, line) => sum + (line.grnAmount || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.95fr),minmax(0,1.35fr),300px]">
      <Card className="border-border/70 bg-gradient-to-b from-card via-card to-muted/10 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Purchase Order
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground">Qty</p>
              <p className="text-xs font-semibold text-foreground">{poQty}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground">Unit Price</p>
              <p className="font-semibold text-foreground">{formatMoney(selectedMatch.lines[0]?.poPrice || 0)}</p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
              <p className="text-muted-foreground">Total</p>
              <p className="text-xs font-semibold text-foreground">{formatMoney(selectedMatch.totals.poSubtotal)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-success-muted-foreground">Matched</p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-gradient-to-b from-card via-card to-muted/10 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <PackageCheck className="h-4 w-4 text-primary" />
            Goods Receipt
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground">Qty</p>
              <p className="text-xs font-semibold text-foreground">{grnQty}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground">Unit Price</p>
              <p className="font-semibold text-foreground">{formatMoney(selectedMatch.lines[0]?.poPrice || 0)}</p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
              <p className="text-muted-foreground">Total</p>
              <p className="text-xs font-semibold text-foreground">{formatMoney(grnTotal)}</p>
            </div>
          </div>
          <p className={`mt-4 text-xs ${selectedMatch.goodsReceipt ? "text-success-muted-foreground" : "text-warning-muted-foreground"}`}>
            {selectedMatch.goodsReceipt ? "Matched" : "GRN Not Linked Yet"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-gradient-to-b from-card via-card to-muted/10 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ReceiptText className="h-4 w-4 text-primary" />
            Invoice
          </div>
          <div className="mt-3 rounded-xl border border-warning/25 bg-warning-muted/70 px-3 py-2 text-xs text-warning-muted-foreground">
            {selectedMatch.invoiceRecord?.dr_number || selectedMatch.invoiceRecord?.invoice_number
              ? `Invoice ${selectedMatch.invoiceRecord?.dr_number || selectedMatch.invoiceRecord?.invoice_number}`
              : "Invoice Not Linked Yet"}
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground">Total</p>
              <p className="text-xs font-semibold text-foreground">{formatMoney(selectedMatch.totals.invoiceTotal)}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground">Received Date</p>
              <p className="font-semibold text-foreground">
                {formatDate(selectedMatch.goodsReceipt?.created_date || selectedMatch.goodsReceipt?.created_at)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
              <p className="text-muted-foreground">Footer</p>
              <p className="font-semibold text-foreground">{formatMoney(selectedMatch.totals.poTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-gradient-to-b from-card via-card to-muted/10 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <GitCompare className="h-4 w-4 text-primary" />
            Payment Status
          </div>
          <p className="mt-4 text-xs font-semibold text-foreground">{PAYMENT_META[selectedMatch.paymentState]?.label || "Blocked"}</p>
          <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(selectedMatch.payable?.paid_date)}</p>
          <p className="mt-4 text-xs text-muted-foreground">Paid By</p>
          <p className="break-all font-semibold text-foreground">{selectedMatch.payable?.paid_by || "Not paid yet"}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedMatch.paymentState === "paid"
              ? "This PO has already been marked as paid."
              : selectedMatch.paymentState === "ready"
                ? "Ready for supplier payment recording."
                : "Payment is blocked until matching passes."}
          </p>
          <button
            type="button"
            disabled={selectedMatch.paymentState !== "ready"}
            onClick={onOpenPaymentDialog}
            className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
              selectedMatch.paymentState === "ready"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            }`}
          >
            {selectedMatch.paymentState === "paid" ? "Already Paid" : "Mark as Paid"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
