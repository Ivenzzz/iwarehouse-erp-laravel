import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function MarkAsPaidDialog({
  open,
  onOpenChange,
  selectedMatch,
  paymentFile,
  paymentNotes,
  isSaving,
  onFileChange,
  onNotesChange,
  onCancel,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Mark Purchase Order as Paid</DialogTitle>
          <DialogDescription>
            Upload the supplier invoice document and add optional payment notes. This will be saved to the purchase order payable record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Purchase Order</p>
            <p className="font-semibold text-foreground">{selectedMatch?.po?.po_number || "N/A"}</p>
            <p className="mt-2 text-sm text-muted-foreground">Supplier</p>
            <p className="font-semibold text-foreground">{selectedMatch?.supplierName || "N/A"}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="invoice-document">
              Invoice Document
            </label>
            <Input
              id="invoice-document"
              type="file"
              accept=".pdf,image/*"
              onChange={(event) => onFileChange(event.target.files?.[0] || null)}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {paymentFile ? `Selected file: ${paymentFile.name}` : "Upload the supplier invoice or proof of payment document."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="payment-notes">
              Notes
            </label>
            <Textarea
              id="payment-notes"
              placeholder="Optional payment notes..."
              value={paymentNotes}
              onChange={(event) => onNotesChange(event.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
