import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getRFQItemDisplay } from "../../lib/rfqItemUtils";

export default function ItemsDialog({ open, onOpenChange, selectedRFQItems }) {
  if (!selectedRFQItems) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Items Required - {selectedRFQItems?.rfq_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(selectedRFQItems.items || []).map((item, idx) => {
                  const { primaryLabel, secondaryLabel } = getRFQItemDisplay(item);
                  return (
                    <tr key={idx} className="hover:bg-accent/40">
                      <td className="px-3 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="text-sm text-foreground">{primaryLabel} x {item.quantity} units</p>
                        {secondaryLabel && <p className="mt-1 text-xs text-muted-foreground">{secondaryLabel}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
