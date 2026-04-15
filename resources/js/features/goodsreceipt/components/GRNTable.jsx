import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Eye, Printer, Search, User, Loader2, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const getStatusColor = (status) => {
  switch (status) {
    case "ongoing":
      return "bg-warning/10 text-[hsl(var(--warning))] border border-warning/20";
    case "completed":
      return "bg-success/10 text-[hsl(var(--success))] border border-success/20";
    case "completed_with_discrepancy":
      return "bg-warning/10 text-[hsl(var(--warning))] border border-warning/20";
    case "draft":
      return "bg-muted text-muted-foreground border border-border";
    case "qc_pending":
      return "bg-warning/10 text-[hsl(var(--warning))] border border-warning/20";
    case "qc_rejected":
      return "bg-destructive/10 text-[hsl(var(--destructive))] border border-destructive/20";
    case "warehouse_encoding":
      return "bg-primary/10 text-primary border border-primary/20";
    default:
      return "bg-primary/10 text-primary border border-primary/20";
  }
};

const formatCurrency = (value) => `P${(Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const getGRNNumber = (grn) => grn.grn_number || "";
const getGRNStatus = (grn) => grn.status || "draft";
const getGRNDate = (grn) => grn.encoded_date || grn.created_date || "";
const getGRNTotalAmount = (grn) => grn.total_amount ?? 0;
const getEncodedBy = (grn) => {
  if (grn.encoded_by) {
    return grn.encoded_by;
  }

  const noteMatch = grn.notes?.match(/completed by (.+?) on/i);
  return noteMatch?.[1] || "System";
};

const countTotalItems = (grn) => {
  return Number(grn.item_count || 0);
};

const formatLocalTime = (dateStr) => {
  if (!dateStr) return { date: "N/A", time: "" };

  let safeDateStr = dateStr;
  if (dateStr.includes("T") && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
    safeDateStr += "Z";
  }

  const date = new Date(safeDateStr);
  if (isNaN(date.getTime())) return { date: "Invalid Date", time: "" };

  return {
    date: format(date, "MMM dd, yyyy"),
    time: format(date, "h:mm a"),
  };
};

export default function GRNTable({
  allGRNs,
  loadingGRNs,
  onViewDetails,
  onPrintGRN,
  onPrintBarcodes,
  onPrintQRStickers,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const uniqueSuppliers = useMemo(() => {
    const map = new Map();
    allGRNs.forEach((grn) => {
      if (!grn.supplier_id) return;
      map.set(grn.supplier_id, grn.supplier_name || "Unknown Supplier");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allGRNs]);

  const filteredGRNs = useMemo(() => {
    return allGRNs.filter((grn) => {
      const grnNumber = getGRNNumber(grn);
      const supplierId = grn.supplier_id;
      const supplierName = grn.supplier_name || "";

      const matchesSearch =
        !searchQuery ||
        grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSupplier = supplierFilter === "all" || String(supplierId) === String(supplierFilter);

      return matchesSearch && matchesSupplier;
    });
  }, [allGRNs, searchQuery, supplierFilter]);

  if (loadingGRNs) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <p>Loading Goods Receipts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger
            className="
            w-[240px]
            bg-background border-border text-foreground
            focus:ring-2 focus:ring-ring
          "
          >
            <SelectValue placeholder="Filter by Supplier" />
          </SelectTrigger>

          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem value="all" className="focus:bg-accent">
              All Suppliers
            </SelectItem>
            {uniqueSuppliers.map((supplier) => (
              <SelectItem
                key={supplier.id}
                value={supplier.id}
                className="focus:bg-accent"
              >
                {supplier.name || "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search GRN number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
            pl-9
            bg-background border-border text-foreground
            placeholder:text-muted-foreground
            focus-visible:ring-2 focus-visible:ring-ring
          "
          />
        </div>
      </div>

      {filteredGRNs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-foreground">No Goods Receipt Notes found</p>
          <p className="text-xs mt-1 text-muted-foreground">Try adjusting your filters.</p>
        </div>
      ) : (
        <div
          className="
          overflow-hidden border rounded-lg
          bg-card border-border
          shadow-sm
        "
        >
          <table className="w-full text-sm">
            <thead
              className="
              border-b border-border
              bg-muted/80
              sticky top-0 z-10
              backdrop-blur
            "
            >
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">GRN Number</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-400">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-400">Encoded Date</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-400">Items</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-400">Total Cost</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-400">Encoded By</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-400">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredGRNs.map((grn) => {
                const rawDate = getGRNDate(grn);
                const { date: displayDate, time: displayTime } = formatLocalTime(rawDate);
                const status = getGRNStatus(grn);
                const grnNumber = getGRNNumber(grn);
                const totalCost = getGRNTotalAmount(grn);
                const itemCount = countTotalItems(grn);

                const supplierName = grn.supplier_name || "Unknown Supplier";

                const encodedBy = getEncodedBy(grn);
                const itemSummaryList = (grn.item_summary || []).map((entry) => `${entry.count}x ${entry.name}`);

                return (
                  <tr key={grn.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className="
                        font-mono text-xs font-bold
                        text-primary bg-primary/10
                        px-2 py-1 rounded border border-primary/20
                      "
                      >
                        {grnNumber || "N/A"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{supplierName}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">{displayDate}</span>
                        <span className="text-[10px] text-muted-foreground">{displayTime}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="
                              inline-flex items-center justify-center
                              px-2.5 py-0.5 rounded-full text-xs font-bold
                              bg-muted text-foreground
                              cursor-help border border-border
                              hover:border-info/30
                            "
                            >
                              {itemCount}
                            </span>
                          </TooltipTrigger>

                          <TooltipContent
                            className="
                            bg-popover text-popover-foreground
                            border border-border
                          "
                          >
                            <p className="font-bold text-xs mb-1.5 border-b border-border pb-1">
                              Included Items:
                            </p>
                            <ul className="text-xs space-y-1">
                              {itemSummaryList.slice(0, 8).map((line, idx) => (
                                <li key={idx}>{line}</li>
                              ))}
                              {itemSummaryList.length > 8 && (
                                <li className="italic text-muted-foreground">
                                  ...and {itemSummaryList.length - 8} more
                                </li>
                              )}
                              {itemSummaryList.length === 0 && <li className="text-muted-foreground">No items details</li>}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono font-medium text-foreground">
                        {formatCurrency(totalCost)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs truncate max-w-[120px] text-foreground" title={encodedBy}>
                          {encodedBy}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge className={`${getStatusColor(status)} font-bold px-2.5`}>
                        {(status || "draft").replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="
                          h-8 w-8
                          text-primary
                          hover:bg-primary/10
                          focus-visible:ring-2 focus-visible:ring-ring
                        "
                          onClick={() => onViewDetails(grn)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="
                          h-8 w-8
                          text-muted-foreground
                          hover:bg-accent
                          focus-visible:ring-2 focus-visible:ring-ring
                        "
                          onClick={() => onPrintGRN(grn)}
                          title="Print GRN"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="
                          h-7 text-xs ml-1
                          bg-background border-border text-foreground
                          hover:bg-accent hover:border-info/30
                          focus-visible:ring-2 focus-visible:ring-ring
                        "
                          onClick={() => onPrintBarcodes(grn)}
                        >
                          Barcodes
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="
                          h-7 text-xs ml-1
                          bg-background border-border text-foreground
                          hover:bg-accent hover:border-primary/30
                          focus-visible:ring-2 focus-visible:ring-ring
                        "
                          onClick={() => onPrintQRStickers(grn)}
                        >
                          QR Stickers
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="
              bg-background border-border text-foreground
              hover:bg-accent hover:text-accent-foreground
              focus-visible:ring-2 focus-visible:ring-ring
            "
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
