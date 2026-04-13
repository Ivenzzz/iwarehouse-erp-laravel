import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, FileText, ChevronDown, ChevronUp, Send, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@inertiajs/react";
import { getStatusColor, getStatusLabel } from "../lib/rfqUtils";
import { getRFQItemDisplay } from "../lib/rfqItemUtils";

export default function RFQTableRow({
  rfq,
  onPrint,
  onCompare,
  onAddQuote,
  onEmail,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const canAddQuote = !["converted_to_po", "cancelled", "closed"].includes(rfq.status);
  const isConvertedToPO = rfq.status === "converted_to_po";

  const rfqItems = rfq.items?.items || [];
  const supplierQuotes = rfq.supplier_quotes?.supplier_quotes || [];
  const consolidatedTo = rfq.metadata?.consolidated_to_rfq;

  return (
    <>
      <tr
        className={`group border-b border-border transition-colors hover:bg-accent/40 ${isExpanded ? "bg-accent/30" : "bg-background"} ${rfq.status === "consolidated" ? "bg-muted/40 opacity-80" : ""}`}
        onClick={(e) => {
          if (e.target.closest("button") || e.target.closest('[role="checkbox"]')) return;
          setIsExpanded(!isExpanded);
        }}
      >
        {/* RFQ Number */}
        <td className="cursor-pointer px-2 py-3 md:px-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">{rfq.rfq_number || "N/A"}</span>
            {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </div>
        </td>

        {/* Items Count */}
        <td className="px-2 py-3 md:px-4">
          <span className="text-xs font-medium">{rfqItems.length} items</span>
        </td>

        {/* Requested By — denormalized */}
        <td className="px-2 py-3 md:px-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">{rfq.requested_by_name || "N/A"}</span>
            <span className="text-[10px] text-muted-foreground">{rfq.requested_store || "N/A"}</span>
          </div>
        </td>

        {/* Approved By — denormalized */}
        <td className="px-2 py-3 md:px-4">
          <span className="text-xs text-foreground">{rfq.approved_by_name || "N/A"}</span>
        </td>

        {/* Created Date */}
        <td className="px-2 py-3 md:px-4">
          <span className="text-xs text-foreground">
            {(rfq.created_at || rfq.created_date)
              ? format(new Date(rfq.created_at || rfq.created_date), "MMMM dd, yyyy | h:mm:ss a")
              : "N/A"}
          </span>
        </td>

        {/* Required By — denormalized */}
        <td className="px-2 py-3 md:px-4">
          <span className="text-xs text-foreground">
            {rfq.required_date ? format(new Date(rfq.required_date), "MMM dd, yyyy") : "N/A"}
          </span>
        </td>

        {/* Quotes */}
        <td className="px-2 py-3 md:px-4">
          <span className={`text-xs font-medium ${supplierQuotes.length > 0 ? "text-chart-2" : "text-muted-foreground"}`}>
            {supplierQuotes.length} quotes
          </span>
        </td>

        {/* Status */}
        <td className="px-2 py-3 md:px-4">
          <Badge className={`${getStatusColor(rfq.status)} rounded-full border px-3`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">{getStatusLabel(rfq.status)}</span>
          </Badge>
          {rfq.status === "consolidated" && consolidatedTo && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <ArrowRight className="h-3 w-3" /> To: {consolidatedTo}
            </div>
          )}
        </td>

        {/* Actions */}
        <td className="px-2 py-3 md:px-4">
          {rfq.status !== "consolidated" && (
            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button size="icon" variant="ghost" onClick={() => onEmail(rfq)} className="h-7 w-7" title="Email Suppliers">
                <Send className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onPrint(rfq)} className="h-7 w-7" title="Print">
                <Printer className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onCompare(rfq)} className="h-7 border-border bg-background px-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground">
                Compare
              </Button>
              {canAddQuote && (
                <Button size="sm" className="h-7 bg-primary px-2 text-xs text-primary-foreground hover:bg-primary/90" onClick={() => onAddQuote(rfq)}>
                  Add Quote
                </Button>
              )}
              {isConvertedToPO && rfq.converted_po_number && (
                <Link href={`/purchase-orders?search=${rfq.converted_po_number}`}>
                  <Button size="sm" variant="outline" className="h-7 border-border bg-background px-2 text-xs text-chart-2 hover:bg-accent">
                    <FileText className="mr-1 h-3 w-3" /> PO
                  </Button>
                </Link>
              )}
            </div>
          )}
        </td>
      </tr>

      {/* Expanded Details */}
      {isExpanded && (
        <tr className="border-b border-border bg-muted/30">
          <td colSpan="9" className="p-4">
            <div className="grid grid-cols-1 gap-6 pl-8 md:grid-cols-2">
              {/* Items Detail */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requested Items</h4>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/70 text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfqItems.map((item, idx) => {
                        const { primaryLabel, secondaryLabel } = getRFQItemDisplay(item);
                        return (
                          <tr key={idx} className="border-t border-border">
                            <td className="p-2">
                              <div className="font-medium text-foreground">{primaryLabel}</div>
                              {secondaryLabel && <div className="text-[10px] text-muted-foreground">{secondaryLabel}</div>}
                            </td>
                            <td className="p-2 text-right font-medium">{item.quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quotes Detail — supplier_name is denormalized on each quote */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Received Quotes</h4>
                {supplierQuotes.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/70 text-muted-foreground">
                        <tr>
                          <th className="p-2 text-left">Supplier</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-left">ETA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierQuotes.map((quote, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="p-2 font-medium">{quote.supplier_name || "N/A"}</td>
                            <td className="p-2 text-muted-foreground">{quote.quote_date ? format(new Date(quote.quote_date), "MMM dd") : "-"}</td>
                            <td className="p-2 text-right font-bold text-foreground">
                              {quote.total_amount?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-muted-foreground">{quote.eta ? format(new Date(quote.eta), "MMM dd") : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-xs italic text-muted-foreground">
                    No quotes received yet. Click "Add Quote" to record one.
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
