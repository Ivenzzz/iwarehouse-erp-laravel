import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, Barcode, CheckCircle2, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Combobox } from "@/shared/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";

export default function CreateOldMethodDialog({
  open,
  onOpenChange,
  warehouses,
  form,
  setForm,
  onScan,
  onSubmit,
  isSubmitting,
}) {
  const [scanInput, setScanInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef(null);

  const scannedIds = useMemo(
    () => new Set((form.scanned_items || []).map((item) => item.inventory_id)),
    [form.scanned_items]
  );

  const sourceWarehouses = warehouses || [];
  const destinationWarehouses = (warehouses || []).filter(
    (warehouse) => String(warehouse.id) !== String(form.source_location_id)
  );
  const sourceWarehouseOptions = sourceWarehouses.map((warehouse) => ({
    value: String(warehouse.id),
    label: warehouse.name,
  }));
  const destinationWarehouseOptions = destinationWarehouses.map((warehouse) => ({
    value: String(warehouse.id),
    label: warehouse.name,
  }));

  const clearScanState = () => {
    setScanInput("");
    setScanFeedback("");
  };

  const handleSourceChange = (value) => {
    const hasScannedItems = (form.scanned_items || []).length > 0;
    if (hasScannedItems) {
      const shouldClear = window.confirm("Changing source warehouse will clear scanned products. Continue?");
      if (!shouldClear) {
        return;
      }
    }

    setForm((current) => ({
      ...current,
      source_location_id: value,
      destination_location_id:
        String(current.destination_location_id) === String(value) ? "" : current.destination_location_id,
      scanned_items: [],
      product_lines: [],
    }));
    clearScanState();
  };

  const handleScan = async () => {
    const barcode = scanInput.trim();
    if (!barcode || isScanning) {
      return;
    }

    if (!form.source_location_id) {
      setScanFeedback("Select source warehouse first.");
      return;
    }

    setIsScanning(true);
    try {
      const item = await onScan(barcode);
      if (!item) {
        setScanFeedback("Scanned item not found.");
        return;
      }

      if (scannedIds.has(item.id)) {
        setScanFeedback("Item already scanned.");
        return;
      }

      if (item.status !== "available") {
        setScanFeedback("Item is not available.");
        return;
      }

      if (String(item.warehouse_id) !== String(form.source_location_id)) {
        setScanFeedback("Item not in selected source warehouse.");
        return;
      }

      setForm((current) => {
        const currentItems = current.scanned_items || [];
        const nextItems = [
          {
            inventory_id: item.id,
            identifier: item.identifier || item.imei1 || item.serial_number || String(item.id),
            variant_name: item.variant_name || item.product_name || "Unknown Variant",
            product_name: item.product_name || "Unknown Product",
          },
          ...currentItems,
        ];

        return {
          ...current,
          scanned_items: nextItems,
          product_lines: nextItems.map((entry) => ({ inventory_id: entry.inventory_id })),
        };
      });

      setScanFeedback(`Added ${item.variant_name || item.product_name || item.identifier}.`);
      setScanInput("");
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } catch (error) {
      setScanFeedback(error?.response?.data?.message || error?.message || "Failed to scan item.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveScanned = (inventoryId) => {
    setForm((current) => {
      const nextItems = (current.scanned_items || []).filter((entry) => entry.inventory_id !== inventoryId);
      return {
        ...current,
        scanned_items: nextItems,
        product_lines: nextItems.map((entry) => ({ inventory_id: entry.inventory_id })),
      };
    });
  };

  const canSubmit =
    !isSubmitting &&
    !!form.source_location_id &&
    !!form.destination_location_id &&
    (form.scanned_items || []).length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          clearScanState();
        } else {
          window.setTimeout(() => inputRef.current?.focus(), 80);
        }
      }}
    >
      <DialogContent className="max-w-5xl border-border bg-background text-foreground p-4">
        <DialogHeader>
          <DialogTitle>Create Transfer (old method)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase text-muted-foreground">Source Warehouse</div>
              <Combobox
                value={String(form.source_location_id || "")}
                onValueChange={handleSourceChange}
                options={sourceWarehouseOptions}
                placeholder="Select source warehouse"
                searchPlaceholder="Search source warehouse..."
                className="h-10"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium uppercase text-muted-foreground">Destination Warehouse</div>
              <Combobox
                value={String(form.destination_location_id || "")}
                onValueChange={(value) => setForm((current) => ({ ...current, destination_location_id: value || "" }))}
                options={destinationWarehouseOptions}
                placeholder="Select destination warehouse"
                searchPlaceholder="Search destination warehouse..."
                disabled={!form.source_location_id}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase text-muted-foreground">Notes</div>
            <Textarea
              value={form.notes || ""}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              placeholder="Optional transfer note"
            />
          </div>

          <div className="rounded-lg border border-border">
            <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">Scan Product</div>
            <div className="space-y-2 p-3">
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={scanInput}
                  onChange={(event) => setScanInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleScan();
                    }
                  }}
                  placeholder="Scan IMEI or serial number"
                  className="h-10 pr-24"
                />
                <Button
                  type="button"
                  size="sm"
                  className="absolute right-1.5 top-1.5 h-7"
                  onClick={handleScan}
                  disabled={isScanning || !scanInput.trim()}
                >
                  <Barcode className="mr-1 h-3 w-3" />
                  Scan
                </Button>
              </div>

              {scanFeedback ? (
                <div className="flex items-start gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3 w-3" />
                  <span>{scanFeedback}</span>
                </div>
              ) : null}

              <div className="max-h-56 overflow-y-auto rounded border border-border">
                {(form.scanned_items || []).map((item) => (
                  <div key={item.inventory_id} className="flex items-center justify-between border-b border-border px-3 py-2 last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{item.variant_name}</div>
                      <div className="text-xs text-muted-foreground">{item.identifier}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <CheckCircle2 className="mr-1 h-3 w-3 text-success" />
                        Scanned
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleRemoveScanned(item.inventory_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(form.scanned_items || []).length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">No products scanned yet.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Creating..." : "Create Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
