import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Banknote } from "lucide-react";
import { format } from "date-fns";
import { getRankedQuotes } from "../../lib/rfqService";

export default function CompareQuotesDialog({
  open,
  onOpenChange,
  selectedRFQ,
  onAward,
}) {
  if (!selectedRFQ) return null;

  const rankedQuotes = getRankedQuotes(selectedRFQ);
  const isAwarded = selectedRFQ.status === "converted_to_po";
  const minPrice = rankedQuotes.length
    ? Math.min(...rankedQuotes.map((q) => q.total_amount))
    : 0;
  const minLead = rankedQuotes.length
    ? Math.min(...rankedQuotes.map((q) => q.leadTimeDays))
    : 0;
  const avgPrice = rankedQuotes.length
    ? rankedQuotes.reduce((sum, q) => sum + q.total_amount, 0) / rankedQuotes.length
    : 0;

  const singleQuote = rankedQuotes.length === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl p-0 sm:rounded-lg">
        <div className="flex max-h-[90vh] flex-col overflow-hidden bg-background">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="pr-8 text-lg font-semibold leading-tight break-words">
              Supplier Comparison - {selectedRFQ?.rfq_number}
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Comparing {rankedQuotes.length} quote{rankedQuotes.length !== 1 ? "s" : ""}. Lowest price highlighted in green, fastest ETA in blue.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {rankedQuotes.length > 0 ? (
              <div
                className={
                  singleQuote
                    ? "flex justify-center"
                    : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-start"
                }
              >
                {rankedQuotes.map((quote, idx) => {
                  const isWinner = selectedRFQ.selected_supplier_id === quote.supplier_id;
                  const isLowestPrice = quote.total_amount === minPrice;
                  const isFastest = quote.leadTimeDays === minLead;
                  const savings = avgPrice - quote.total_amount;
                  const savingsPct = avgPrice > 0 ? (savings / avgPrice) * 100 : 0;

                  return (
                    <Card
                      key={idx}
                      className={[
                        "relative border-2 pt-4 transition-shadow hover:shadow-lg",
                        singleQuote ? "w-full max-w-md" : "w-full",
                        isWinner
                          ? "border-success bg-success-muted shadow-md"
                          : "border-border",
                      ].join(" ")}
                    >
                      {isLowestPrice && !isWinner && (
                        <div className="absolute left-4 top-0 z-10 -translate-y-1/2 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow-sm">
                          BEST PRICE
                        </div>
                      )}

                      {isFastest && !isWinner && (
                        <div className="absolute right-4 top-0 z-10 -translate-y-1/2 rounded-full bg-info px-2 py-0.5 text-[10px] font-bold text-info-foreground shadow-sm">
                          FASTEST ETA
                        </div>
                      )}

                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base font-bold leading-snug break-words text-foreground">
                              {quote.supplier_name || "Unknown"}
                            </CardTitle>
                            {isWinner && (
                              <Badge className="mt-1 bg-success text-success-foreground">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-3">
                          <p
                            className={`text-2xl font-bold ${
                              isLowestPrice ? "text-success" : "text-foreground"
                            }`}
                          >
                            {quote.total_amount.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </p>

                          {savings > 0 && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-success">
                              <Banknote className="h-3 w-3 shrink-0" />
                              Save {savingsPct.toFixed(0)}% vs avg
                            </p>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 text-sm">
                        <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
                          <span className="text-muted-foreground">Payment Terms</span>
                          <span className="text-right font-medium">
                            {quote.payment_terms || "N/A"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
                          <span className="text-muted-foreground">ETA</span>
                          <span
                            className={`text-right font-medium ${
                              isFastest ? "text-info" : ""
                            }`}
                          >
                            {quote.eta ? format(new Date(quote.eta), "MMM dd") : "N/A"}{" "}
                            ({quote.leadTimeDays} days)
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Score</span>
                          <Badge variant="outline">
                            {quote.score.toFixed(0)} pts
                          </Badge>
                        </div>

                        {!isAwarded && (
                          <Button
                            size="sm"
                            onClick={() => onAward(selectedRFQ, quote.supplier_id)}
                            className="mt-2 w-full"
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Award to Supplier
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-card py-12 text-center">
                <Clock className="mx-auto mb-2 h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">No quotes received yet</p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t px-6 py-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}