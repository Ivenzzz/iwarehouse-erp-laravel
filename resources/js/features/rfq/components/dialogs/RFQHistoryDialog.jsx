import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { getStatusColor } from "../../lib/rfqUtils";

export default function RFQHistoryDialog({ open, onOpenChange, historyRFQ }) {
  if (!historyRFQ) return null;

  const supplierQuotes = historyRFQ.supplier_quotes?.supplier_quotes || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col p-0">
        <div className="border-b p-6">
          <DialogHeader>
            <DialogTitle>Procurement History - {historyRFQ?.rfq_number}</DialogTitle>
            <DialogDescription>Complete workflow from Stock Request to RFQ</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-info-muted p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-info" />
                  Request for Quotation
                </h3>
                <Badge className="bg-info text-info-foreground">{historyRFQ.rfq_number}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">RFQ Date</p>
                  <p className="font-medium">{historyRFQ.created_at ? format(new Date(historyRFQ.created_at), "MMM dd, yyyy h:mm a") : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Required Date</p>
                  <p className="font-medium">{historyRFQ.required_date ? format(new Date(historyRFQ.required_date), "MMM dd, yyyy") : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Requested By</p>
                  <p className="font-medium">{historyRFQ.requested_by_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(historyRFQ.status)}>{historyRFQ.status?.replace(/_/g, " ")}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Quotes Received</p>
                  <p className="font-medium">{supplierQuotes.length} quotes</p>
                </div>
              </div>
              {supplierQuotes.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-muted-foreground">Supplier Quotes:</p>
                  {supplierQuotes.map((quote, idx) => (
                    <div key={idx} className="mb-2 rounded bg-card p-3">
                      <div className="mb-2 flex items-start justify-between">
                        <span className="text-sm font-semibold">{quote.supplier_name || "Unknown"}</span>
                        {historyRFQ.selected_supplier_id === quote.supplier_id && (
                          <Badge className="bg-success text-success-foreground text-xs">Awarded</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-semibold">₱{quote.subtotal?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </div>
                        {quote.shipping_cost > 0 && (
                          <div className="flex justify-between">
                            <span>Shipping:</span>
                            <span className="font-semibold">₱{quote.shipping_cost?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-1 font-bold">
                          <span>Total:</span>
                          <span>₱{quote.total_amount?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="mt-2 text-muted-foreground">
                          <p>Payment Terms: {quote.payment_terms}</p>
                          <p>ETA: {quote.eta ? format(new Date(quote.eta), "MMM dd, yyyy") : "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t p-6">
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
