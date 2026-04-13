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
  const minPrice = rankedQuotes.length ? Math.min(...rankedQuotes.map((q) => q.total_amount)) : 0;
  const minLead = rankedQuotes.length ? Math.min(...rankedQuotes.map((q) => q.leadTimeDays)) : 0;
  const avgPrice = rankedQuotes.length
    ? rankedQuotes.reduce((sum, q) => sum + q.total_amount, 0) / rankedQuotes.length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Supplier Comparison - {selectedRFQ?.rfq_number}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Comparing {rankedQuotes.length} quotes. Lowest price highlighted in green, fastest ETA in blue.
          </p>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          {rankedQuotes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {rankedQuotes.map((quote, idx) => {
                const isWinner = selectedRFQ.selected_supplier_id === quote.supplier_id;
                const isLowestPrice = quote.total_amount === minPrice;
                const isFastest = quote.leadTimeDays === minLead;
                const savings = avgPrice - quote.total_amount;
                const savingsPct = avgPrice > 0 ? (savings / avgPrice) * 100 : 0;

                return (
                  <Card
                    key={idx}
                    className={`relative border-2 transition-shadow hover:shadow-lg ${isWinner ? "border-success bg-success-muted shadow-md" : "border-border"}`}
                  >
                    {isLowestPrice && !isWinner && (
                      <div className="absolute -top-3 left-4 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                        BEST PRICE
                      </div>
                    )}
                    {isFastest && !isWinner && (
                      <div className="absolute -top-3 right-4 rounded-full bg-info px-2 py-0.5 text-[10px] font-bold text-info-foreground">
                        FASTEST ETA
                      </div>
                    )}

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          {/* supplier_name is denormalized on the quote */}
                          <CardTitle className="text-base font-bold text-foreground">
                            {quote.supplier_name || "Unknown"}
                          </CardTitle>
                          {isWinner && <Badge className="mt-1 bg-success text-success-foreground">Selected</Badge>}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className={`text-2xl font-bold ${isLowestPrice ? "text-success" : "text-foreground"}`}>
                          {quote.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </p>
                        {savings > 0 && (
                          <p className="flex items-center gap-1 text-xs text-success">
                            <Banknote className="h-3 w-3" />
                            Save {savingsPct.toFixed(0)}% vs avg
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-border pb-2">
                        <span className="text-muted-foreground">Payment Terms</span>
                        <span className="font-medium">{quote.payment_terms || "N/A"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span className="text-muted-foreground">ETA</span>
                        <span className={`font-medium ${isFastest ? "text-info" : ""}`}>
                          {quote.eta ? format(new Date(quote.eta), "MMM dd") : "N/A"} ({quote.leadTimeDays} days)
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-foreground">Score</span>
                        <Badge variant="outline">{quote.score.toFixed(0)} pts</Badge>
                      </div>

                      {!isAwarded && (
                        <Button
                          size="sm"
                          onClick={() => onAward(selectedRFQ, quote.supplier_id)}
                          className="mt-4 w-full"
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
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
