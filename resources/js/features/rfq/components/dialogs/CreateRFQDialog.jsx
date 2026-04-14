import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function CreateRFQDialog({
  open,
  onOpenChange,
  selectedStockRequest,
  onSubmit,
  isSubmitting,
}) {
  if (!selectedStockRequest) return null;

  // StockRequest items already have denormalized fields: brand, model, variant_name, condition, variant_attributes
  const items = selectedStockRequest.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create RFQ from SR: {selectedStockRequest?.request_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will create a Request for Quotation based on the approved Stock Request.
          </p>
          <div>
            <p className="mb-2 font-semibold">Items ({items.length})</p>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const label = item.variant_name || [item.brand, item.model].filter(Boolean).join(" ") || "Unknown Product";
                const attrs = item.variant_attributes || {};
                const specParts = [attrs.ram, attrs.rom, item.condition].filter(Boolean);
                const specLabel = specParts.join(" / ");

                return (
                  <div key={idx} className="rounded bg-muted/50 p-3">
                    <p className="font-medium text-foreground">{label}</p>
                    {specLabel && <p className="text-sm text-muted-foreground">{specLabel}</p>}
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              Create RFQ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
