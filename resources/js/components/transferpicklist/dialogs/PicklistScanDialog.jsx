import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Barcode, CheckCircle2, ClipboardList, Keyboard, Package, QrCode, ScanLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import QRCodeScanner from "@/components/shared/QRCodeScanner";
import { useDeviceDetection } from "@/features/stocktransfer/hooks/useDeviceDetection";

function resolveExpectedItems(transfer) {
  if (!transfer) {
    return [];
  }

  return (transfer.product_lines || []).map((line) => {
    return {
      inventory_id: line.inventory_id,
      serial_number: line.serial_number,
      imei1: line.imei1,
      imei2: line.imei2,
      variant_id: line.variant_id,
      variant_name: line.variant_name || line.product_name || "Unknown Variant",
    };
  });
}

export default function PicklistScanDialog({
  open,
  onOpenChange,
  selectedTransfer,
  onConfirmPickup,
  isProcessing,
}) {
  const { isMobileDevice } = useDeviceDetection();
  const [scanMode, setScanMode] = useState(() => (isMobileDevice ? "camera" : "barcode"));
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef(null);

  const expectedItems = useMemo(
    () => resolveExpectedItems(selectedTransfer),
    [selectedTransfer]
  );

  useEffect(() => {
    if (!open) {
      setBarcodeInput("");
      setScannedItems([]);
      setFeedback("");
      return;
    }

    if (scanMode === "barcode") {
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, scanMode]);

  const scannedIds = useMemo(() => new Set(scannedItems.map((item) => item.inventory_id)), [scannedItems]);

  const processScan = useCallback(
    (value) => {
      const barcode = value?.trim();
      if (!barcode) {
        return;
      }

      const found = expectedItems.find((item) =>
        [item.imei1, item.imei2, item.serial_number].filter(Boolean).includes(barcode)
      );

      if (!found) {
        setFeedback("Scanned item is not on this transfer.");
        setBarcodeInput("");
        return;
      }

      if (scannedIds.has(found.inventory_id)) {
        setFeedback("Item already scanned.");
        setBarcodeInput("");
        return;
      }

      setScannedItems((current) => [
        ...current,
        {
          ...found,
          scanned_barcode: barcode,
          scanned_at: new Date().toISOString(),
        },
      ]);
      setFeedback(`Picked ${found.variant_name}`);
      setBarcodeInput("");
    },
    [expectedItems, scannedIds]
  );

  if (!selectedTransfer) {
    return null;
  }

  const sourceWarehouse = selectedTransfer.source_location?.name || "N/A";
  const destinationWarehouse = selectedTransfer.destination_location?.name || "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pick Items for {selectedTransfer.transfer_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span>{sourceWarehouse}</span>
              <span className="text-muted-foreground">to</span>
              <span>{destinationWarehouse}</span>
            </div>
            <Badge variant="secondary">
              {scannedItems.length} / {expectedItems.length} scanned
            </Badge>
          </div>

          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ScanLine className="h-4 w-4" />
                Scan Items
              </div>
              <div className="flex items-center gap-2">
                {!isMobileDevice ? (
                  <>
                    <Button type="button" variant={scanMode === "barcode" ? "default" : "outline"} size="sm" onClick={() => setScanMode("barcode")}>
                      <Keyboard className="mr-1 h-3 w-3" />
                      Barcode
                    </Button>
                    <Button type="button" variant={scanMode === "camera" ? "default" : "outline"} size="sm" onClick={() => setScanMode("camera")}>
                      <QrCode className="mr-1 h-3 w-3" />
                      Camera
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {scanMode === "camera" ? (
              <QRCodeScanner onScan={processScan} className="h-64 w-full rounded-b-lg" />
            ) : (
              <div className="relative p-3">
                <Input
                  ref={inputRef}
                  value={barcodeInput}
                  onChange={(event) => setBarcodeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      processScan(barcodeInput);
                    }
                  }}
                  placeholder="Scan or type IMEI / serial"
                  className="h-11 pr-24"
                />
                <Button type="button" size="sm" className="absolute right-4 top-4" onClick={() => processScan(barcodeInput)}>
                  <Barcode className="mr-1 h-3 w-3" />
                  Enter
                </Button>
              </div>
            )}

            {feedback ? <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">{feedback}</div> : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 text-sm font-medium">Pending Items</div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {expectedItems.filter((item) => !scannedIds.has(item.inventory_id)).map((item) => (
                  <div key={item.inventory_id} className="px-3 py-2 text-sm">
                    <div className="font-medium">{item.variant_name}</div>
                    <div className="text-xs text-muted-foreground">{item.imei1 || item.serial_number || item.inventory_id}</div>
                  </div>
                ))}
                {expectedItems.filter((item) => !scannedIds.has(item.inventory_id)).length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">All items scanned.</div>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 text-sm font-medium">Scanned Items</div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {scannedItems.map((item) => (
                  <div key={item.inventory_id} className="flex items-start justify-between px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{item.variant_name}</div>
                      <div className="text-xs text-muted-foreground">{item.scanned_barcode}</div>
                    </div>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  </div>
                ))}
                {scannedItems.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">No items scanned yet.</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isProcessing || scannedItems.length === 0} onClick={() => onConfirmPickup(scannedItems)}>
              {isProcessing ? "Saving..." : "Confirm Pickup"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
