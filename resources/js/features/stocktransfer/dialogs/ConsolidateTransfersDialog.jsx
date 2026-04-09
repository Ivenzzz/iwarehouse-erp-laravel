import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Layers3, Loader2, Package } from "lucide-react";

export default function ConsolidateTransfersDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
  summary,
  warehouses = [],
}) {
  if (!summary) {
    return null;
  }

  const sourceWarehouse = warehouses.find((warehouse) => warehouse.id === summary.sourceLocationId);
  const destinationWarehouse = warehouses.find(
    (warehouse) => warehouse.id === summary.destinationLocationId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-primary" />
            Consolidate Stock Transfers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resulting Shipment
              </div>
              <Badge variant="outline" className="border-border">
                Status: draft
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Transfers</div>
                <div className="font-semibold text-foreground">{summary.transferCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Items</div>
                <div className="font-semibold text-foreground">{summary.totalItems}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Route</div>
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="truncate">{sourceWarehouse?.name || "Unknown"}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{destinationWarehouse?.name || "Unknown"}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Package className="h-4 w-4" />
              Source Transfers
            </div>
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border bg-card p-3">
              {summary.transferNumbers.map((transferNumber) => (
                <Badge key={transferNumber} variant="secondary" className="font-mono">
                  {transferNumber}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consolidating...
              </>
            ) : (
              "Create Consolidated Transfer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
