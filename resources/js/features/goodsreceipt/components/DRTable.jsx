import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Package,
  Truck,
  FileText,
  Calendar,
  Hash,
  Building2,
  MapPin,
  Box,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ROW_HEIGHT = 232;
const normalizeSpecValue = (value) => String(value || "").trim().toLowerCase();

const getProductLabel = (item) => {
  const spec = [
    item.product_spec?.ram,
    item.product_spec?.rom,
    item.product_spec?.condition,
  ].filter(Boolean).join(" / ");

  return {
    name: item.product_name || "Unknown Product",
    spec,
  };
};

function PendingDRRow({ dr, onSelectDR, style }) {
  const logistics = dr.logistics_json || {};
  const courier = logistics.logistics_company || "In-house Logistics";
  const tracking = logistics.waybill_number || "-";
  const destination = logistics.destination || "Main Warehouse";

  const declaredInfo = dr.declared_items_json || {};
  const items = declaredInfo.items || [];
  const boxCount = declaredInfo.box_count_received || declaredInfo.box_count_declared || 1;
  const totalQty = items.reduce((sum, item) => sum + (item.expected_quantity || item.actual_quantity || 0), 0);
  const distinctProducts = items.length;
  const firstItemDisplay = items[0] ? getProductLabel(items[0]) : { name: "Unknown Product", spec: "" };

  const supplierName = dr.supplier_name || "Unknown Supplier";

  return (
    <div
      className="absolute left-0 top-0 w-full border-b border-border px-4 py-4 transition-colors hover:bg-accent/40"
      style={style}
    >
      <div className="grid grid-cols-[20%_20%_25%_25%_10%] text-sm">
        <div className="pr-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {dr.dr_number}
              </span>
              <Badge variant="outline" className="h-5 border-border bg-background px-1.5 text-[10px] text-muted-foreground">
                Internal
              </Badge>
            </div>

            <div className="mt-1 space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Vendor DR:</span>
                <span className="font-mono text-foreground">{dr.dr_number || dr.vendor_dr_number || "-"}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Hash className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Ref #:</span>
                <span className="font-mono text-[10px] text-muted-foreground">{dr.reference_number || "-"}</span>
              </div>
            </div>

            {dr.po_number && (
              <div className="mt-1">
                <Badge variant="secondary" className="border border-border bg-muted text-[10px] text-muted-foreground hover:bg-accent">
                  PO: {dr.po_number}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="pr-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-md border border-info/20 bg-info/10 p-1.5">
                <Truck className="h-4 w-4 text-[hsl(var(--info))]" />
              </div>

              <div>
                <p className="text-xs font-bold text-foreground">{courier}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">Waybill: {tracking}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span>Boxes/Units:</span>
              <span className="font-bold text-foreground">{boxCount}</span>
            </div>

            <div className="flex items-center gap-1 pl-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="max-w-[120px] truncate" title={destination}>
                {destination}
              </span>
            </div>
          </div>
        </div>

        <div className="pr-4">
          <div className="flex flex-col gap-1">
            <div className="mb-1 flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="line-clamp-1 text-sm font-semibold text-foreground" title={supplierName}>
                  {supplierName}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {dr.supplier_code ? `Code: ${dr.supplier_code}` : `ID: ${dr.supplier_id || "-"}`}
                </p>
              </div>
            </div>

              <div className="flex w-fit items-center gap-2 rounded border border-border bg-background p-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{dr.date_received ? format(new Date(dr.date_received), "MMM dd, yyyy") : "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="pr-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className="border border-primary/20 bg-primary/10 text-primary">
                {totalQty} Units
              </Badge>
              <span className="text-[10px] font-medium text-muted-foreground">
                {distinctProducts} SKU{distinctProducts > 1 ? "s" : ""}
              </span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help rounded border border-border bg-background p-2 text-xs text-foreground hover:border-info/30 hover:bg-accent/40">
                    <div className="line-clamp-1 font-medium">{firstItemDisplay.name}</div>
                    {firstItemDisplay.spec && (
                      <div className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{firstItemDisplay.spec}</div>
                    )}
                    {distinctProducts > 1 && (
                      <div className="mt-1 text-[10px] text-muted-foreground">+ {distinctProducts - 1} other item(s)</div>
                    )}
                  </div>
                </TooltipTrigger>

                <TooltipContent className="max-w-xs border border-border bg-popover text-popover-foreground">
                  <p className="mb-1 text-xs font-bold">Declared Items:</p>
                  <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-3 text-xs text-popover-foreground">
                    {items.slice(0, 5).map((item, idx) => (
                      <li key={idx} className="text-slate-100">
                        {(() => {
                          const display = getProductLabel(item);
                          return (
                            <>
                              <span className="text-muted-foreground">{item.expected_quantity || item.actual_quantity || 0}x</span>{" "}
                              {display.name}
                              {display.spec ? <span className="text-muted-foreground"> ({display.spec})</span> : null}
                            </>
                          );
                        })()}
                      </li>
                    ))} 
                    {items.length > 5 && <li className="text-muted-foreground">...and {items.length - 5} more</li>}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Button
            onClick={() => onSelectDR(dr)}
            size="sm"
            className="border border-success/25 bg-success/10 font-semibold text-[hsl(var(--success))] transition-all hover:scale-105 hover:bg-success/15 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Package className="mr-1.5 h-4 w-4" />
            Add Products
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DRTable({
  deliveryReceipts,
  loadingDRs,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectDR,
}) {
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: deliveryReceipts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem || !hasNextPage || isFetchingNextPage) return;
    if (lastItem.index >= deliveryReceipts.length - 5) {
      onLoadMore?.();
    }
  }, [deliveryReceipts.length, hasNextPage, isFetchingNextPage, onLoadMore, rowVirtualizer]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="overflow-x-auto bg-background">
        <div className="min-w-[1180px]">
          <div className="sticky top-0 z-10 grid grid-cols-[20%_20%_25%_25%_10%] border-b border-border bg-muted/80 backdrop-blur">
            <div className="px-4 py-3 text-left font-semibold text-muted-foreground">Document References</div>
            <div className="px-4 py-3 text-left font-semibold text-muted-foreground">Logistics & Route</div>
            <div className="px-4 py-3 text-left font-semibold text-muted-foreground">Supplier & Date</div>
            <div className="px-4 py-3 text-left font-semibold text-muted-foreground">Package Contents</div>
            <div className="px-4 py-3 text-center font-semibold text-muted-foreground">Action</div>
          </div>

          {loadingDRs ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                <span>Loading Delivery Receipts...</span>
              </div>
            </div>
          ) : deliveryReceipts.length === 0 ? (
            <div className="bg-muted/20 py-16 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="font-medium text-foreground">No Pending Deliveries</p>
              <p className="text-xs text-muted-foreground">All delivery receipts have been processed.</p>
            </div>
          ) : (
            <>
              <div ref={parentRef} className="h-[640px] overflow-auto">
                <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const dr = deliveryReceipts[virtualRow.index];
                    return (
                      <PendingDRRow
                        key={dr.id}
                        dr={dr}
                        onSelectDR={onSelectDR}
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                          height: `${virtualRow.size}px`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {(hasNextPage || isFetchingNextPage) && (
                <div className="flex items-center justify-center border-t border-border bg-background px-4 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLoadMore?.()}
                    disabled={!hasNextPage || isFetchingNextPage}
                    className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronDown className="mr-2 h-4 w-4" />
                    {isFetchingNextPage ? "Loading more..." : hasNextPage ? "Load more" : "All loaded"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
