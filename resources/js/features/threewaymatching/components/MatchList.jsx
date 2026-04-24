import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "../utils/threeWayMatchingFormatters";
import { PaymentBadge, StatusBadge } from "./StatusBadge";

function MatchListCards({ matches, selectedMatchId, onSelect }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-border/70 bg-background/20 p-4 text-xs text-muted-foreground">
        No purchase orders in this tab.
      </div>
    );
  }

  return matches.map((match) => {
    const isSelected = match.id === selectedMatchId;

    return (
      <button
        key={match.id}
        type="button"
        onClick={() => onSelect(match.id)}
        className={`w-full rounded-[22px] border p-4 text-left transition-all ${
          isSelected
            ? "border-primary/60 bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
            : "border-border/70 bg-gradient-to-br from-card via-card to-muted/10 hover:border-primary/30 hover:bg-accent/10"
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-tight text-foreground">{match.po.po_number || "Untitled PO"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{match.supplierName}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={match.status} />
              <PaymentBadge state={match.paymentState} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
              <p className="font-medium text-foreground">
                {match.invoiceRecord?.dr_number || match.invoiceRecord?.invoice_number || "Not linked"}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">GRN</p>
              <p className="font-medium text-foreground">
                {match.goodsReceipt?.grn_number || match.goodsReceipt?.receipt_info?.grn_number || "Not linked"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <p className="text-muted-foreground">Expected: {formatDate(match.po.expected_delivery_date)}</p>
            <p className={match.discrepancyCount > 0 ? "text-destructive" : "text-muted-foreground"}>
              {match.discrepancyCount} {match.discrepancyCount === 1 ? "issue" : "issues"}
            </p>
          </div>
        </div>
      </button>
    );
  });
}

export default function MatchList({ matches, selectedMatchId, onSelect }) {
  const [paymentTab, setPaymentTab] = useState("unpaid");

  const { paidMatches, unpaidMatches } = useMemo(
    () => ({
      paidMatches: matches.filter((match) => match.isPaid),
      unpaidMatches: matches.filter((match) => !match.isPaid),
    }),
    [matches]
  );

  return (
    <Card className="overflow-hidden border-border/70 bg-gradient-to-b from-card via-card to-muted/10 shadow-none xl:flex xl:h-full xl:flex-col">
      <CardHeader className="border-b border-border/70 pb-5">
        <CardTitle className="text-xs tracking-tight">Purchase Orders</CardTitle>
      </CardHeader>

      <Tabs value={paymentTab} onValueChange={setPaymentTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/70 px-4 py-3">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-border/70 bg-background/20 p-1">
            <TabsTrigger value="unpaid" className="text-xs">
              Unpaid ({unpaidMatches.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs">
              Paid ({paidMatches.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="unpaid" className="mt-0 min-h-0 flex-1">
          <CardContent className="space-y-4 overflow-y-auto p-4 xl:h-full">
            <MatchListCards matches={unpaidMatches} selectedMatchId={selectedMatchId} onSelect={onSelect} />
          </CardContent>
        </TabsContent>

        <TabsContent value="paid" className="mt-0 min-h-0 flex-1">
          <CardContent className="space-y-4 overflow-y-auto p-4 xl:h-full">
            <MatchListCards matches={paidMatches} selectedMatchId={selectedMatchId} onSelect={onSelect} />
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
