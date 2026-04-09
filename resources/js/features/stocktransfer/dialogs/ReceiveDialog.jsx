import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle, AlertCircle, AlertTriangle,
  Trash2, X,
  QrCode, AlertOctagon, Loader2,
  Camera, Keyboard, ChevronUp, ChevronDown
} from "lucide-react";
import { useDeviceDetection } from "../hooks/useDeviceDetection";
import QRCodeScanner from "@/components/shared/QRCodeScanner";

const formatItemName = (item) =>
  [item?.product_name || item?.productName, item?.variant_name || item?.variantName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unknown Product";

const getItemIdentifier = (item) =>
  item?.identifier || item?.imei1 || item?.imei2 || item?.serial_number || item?.inventory_id || item?.inventoryId || "Unknown Identifier";

export default function ReceiveDialog({
  open,
  onOpenChange,
  receivingTransfer,
  onFinalizeReceive,
  isReceiving,
  onPhotoUpload,
  lookupInventoryItemByBarcode,
}) {
  // --- Device Detection ---
  const { isMobileDevice } = useDeviceDetection();

  // --- Local State ---
  const [barcodeInput, setBarcodeInput] = useState("");
  const [receivedItems, setReceivedItems] = useState([]);
  const [overageItems, setOverageItems] = useState([]);
  const [unknownItems, setUnknownItems] = useState([]);
  const [branchRemarks, setBranchRemarks] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  
  // UI State
  const [scanMode, setScanMode] = useState(() => isMobileDevice ? "qr_code" : "barcode");
  const [isScannerExpanded, setIsScannerExpanded] = useState(true);
  const [lastScanResult, setLastScanResult] = useState(null); // { type: 'success'|'error'|'warning', message: '' }

  const [showUnknownConfirm, setShowUnknownConfirm] = useState(false);
  const [pendingUnknownBarcode, setPendingUnknownBarcode] = useState("");

  const inputRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  const expectedItems = useMemo(() => {
    if (!receivingTransfer) return [];

    return (receivingTransfer.product_lines || []).map((line) => ({
      inventoryId: line.inventory_id,
      imei1: line.imei1,
      imei2: line.imei2,
      serialNumber: line.serial_number,
      productName: line.product_name,
      variantName: line.variant_name,
      received: Boolean(line.is_received),
      productMasterId: line.product_master_id,
      variantId: line.variant_id,
      identifier: getItemIdentifier(line),
    }));
  }, [receivingTransfer]);

  // --- Reset State on Dialog Open/Close ---
  useEffect(() => {
    if (open && receivingTransfer) {
      const alreadyReceived = expectedItems.filter((item) => item.received);
      setReceivedItems(alreadyReceived);
      setOverageItems(receivingTransfer.overage_items_json || []);
      setUnknownItems(receivingTransfer.unknown_items_json || []);
      setBranchRemarks(receivingTransfer.receiving_json?.branch_remarks || "");
      setDiscrepancyReason(receivingTransfer.receiving_json?.discrepancy_reason || "");
      setPhotoUrl(receivingTransfer.receiving_json?.photo_proof_url || "");
      
      setActiveTab("pending");
      setIsScannerExpanded(true);
      setLastScanResult(null);
    } else {
      setBarcodeInput("");
      setReceivedItems([]);
      setOverageItems([]);
      setUnknownItems([]);
      setBranchRemarks("");
      setDiscrepancyReason("");
      setPhotoUrl("");
      setLastScanResult(null);
    }
  }, [open, receivingTransfer, expectedItems]);

  // --- Focus input logic ---
  useEffect(() => {
    if (open && inputRef.current && scanMode === "barcode") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, scanMode]);

  useEffect(() => {
    if (isMobileDevice) {
      setScanMode("qr_code");
    }
  }, [isMobileDevice]);

  // --- Show Feedback Helper ---
  const showFeedback = useCallback((type, message) => {
    setLastScanResult({ type, message });
    
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    
    // Auto-clear success messages after 3s, keep errors longer
    feedbackTimeoutRef.current = setTimeout(() => {
      setLastScanResult(null);
    }, type === 'success' ? 3000 : 5000);
  }, []);

  const allScannedBarcodes = useMemo(() => {
    const barcodes = new Set();
    receivedItems.forEach((item) => {
      if (item.imei1) barcodes.add(item.imei1);
      if (item.imei2) barcodes.add(item.imei2);
      if (item.serialNumber) barcodes.add(item.serialNumber);
      if (item.identifier) barcodes.add(item.identifier);
    });
    overageItems.forEach((item) => {
      if (item.imei1) barcodes.add(item.imei1);
      if (item.imei2) barcodes.add(item.imei2);
      if (item.serial_number) barcodes.add(item.serial_number);
      if (item.identifier) barcodes.add(item.identifier);
    });
    unknownItems.forEach((item) => {
      barcodes.add(item.scanned_barcode || item.barcode);
    });
    return barcodes;
  }, [receivedItems, overageItems, unknownItems]);

  const progress = useMemo(() => {
    const totalExpected = expectedItems.length;
    const previouslyReceived = expectedItems.filter((i) => i.received).length;
    const newlyReceivedIds = receivedItems
      .filter((item) => !expectedItems.find((e) => e.inventoryId === item.inventoryId && e.received))
      .map((item) => item.inventoryId);
    const newlyReceived = newlyReceivedIds.length;
    const totalReceived = previouslyReceived + newlyReceived;
    const stillPending = totalExpected - totalReceived;

    return {
      totalExpected,
      previouslyReceived,
      newlyReceived,
      totalReceived,
      stillPending,
      overageCount: overageItems.length,
      unknownCount: unknownItems.length,
    };
  }, [expectedItems, receivedItems, overageItems, unknownItems]);

  const hasVariance = progress.stillPending > 0 || progress.overageCount > 0 || progress.unknownCount > 0;

  const canFinalize = useMemo(() => {
    if (progress.totalReceived === 0 && progress.overageCount === 0 && progress.unknownCount === 0) return false;
    if (hasVariance && !branchRemarks.trim()) return false;
    return true;
  }, [progress, hasVariance, branchRemarks]);

  // --- Handlers ---
  
  const processScan = useCallback(async (barcode) => {
    if (!barcode) return;

    if (allScannedBarcodes.has(barcode)) {
      showFeedback('warning', 'Already scanned in this session');
      setBarcodeInput("");
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    const expectedItem = expectedItems.find(
      (item) => [item.imei1, item.imei2, item.serialNumber, item.identifier].filter(Boolean).includes(barcode)
    );

    if (expectedItem && !expectedItem.received) {
      setReceivedItems((prev) => [...prev, { ...expectedItem, scanned_barcode: barcode }]);
      showFeedback('success', `Received: ${formatItemName(expectedItem)}`);
      setBarcodeInput("");
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    const invItem = await lookupInventoryItemByBarcode(barcode);

    if (!invItem) {
      setPendingUnknownBarcode(barcode);
      setShowUnknownConfirm(true);
      setBarcodeInput("");
      return;
    }

    const overageEntry = {
      inventory_id: invItem.id || invItem.inventory_id,
      product_master_id: invItem.product_master_id,
      variant_id: invItem.variant_id,
      product_name: invItem.product_name,
      variant_name: invItem.variant_name,
      imei1: invItem.imei1,
      imei2: invItem.imei2,
      serial_number: invItem.serial_number,
      identifier: invItem.identifier,
      received_date: new Date().toISOString(),
    };
    setOverageItems((prev) => [...prev, overageEntry]);
    showFeedback('warning', `Marked as Overage: ${formatItemName(overageEntry)}`);
    setActiveTab("exceptions");
    setBarcodeInput("");
    if (inputRef.current) inputRef.current.focus();
  }, [allScannedBarcodes, expectedItems, lookupInventoryItemByBarcode, showFeedback]);

  const handleScan = useCallback(() => {
    const barcode = barcodeInput.trim();
    void processScan(barcode);
  }, [barcodeInput, processScan]);

  const handleQRScan = useCallback((scannedCode) => {
    void processScan(scannedCode);
  }, [processScan]);

  const confirmUnknownBarcode = useCallback(() => {
    if (!pendingUnknownBarcode) return;
    const unknownEntry = {
      barcode: pendingUnknownBarcode,
      scanned_barcode: pendingUnknownBarcode,
      scanned_date: new Date().toISOString(),
    };
    setUnknownItems((prev) => [...prev, unknownEntry]);
    showFeedback('error', 'Item recorded as Unknown');
    setActiveTab("exceptions");
    setPendingUnknownBarcode("");
    setShowUnknownConfirm(false);
    if (inputRef.current) inputRef.current.focus();
  }, [pendingUnknownBarcode, showFeedback]);

  const removeOverageItem = useCallback((index) => {
    setOverageItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeUnknownItem = useCallback((index) => {
    setUnknownItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const uploaded = await onPhotoUpload(file);
      setPhotoUrl(uploaded?.file_url || "");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }, [onPhotoUpload]);

  const handleFinalize = useCallback(() => {
    const destLocationId = receivingTransfer.destination_location_id;
    const missingItems = expectedItems
      .filter((e) => !e.received && !receivedItems.some((r) => r.inventoryId === e.inventoryId))
      .map((e) => ({
        inventory_id: e.inventoryId,
        product_master_id: e.productMasterId,
        variant_id: e.variantId,
        product_name: e.productName,
        variant_name: e.variantName,
        imei1: e.imei1,
        imei2: e.imei2,
        serial_number: e.serialNumber,
        identifier: e.identifier,
        reported_date: new Date().toISOString(),
      }));
    const newlyReceivedIds = receivedItems
      .filter((item) => !expectedItems.find((e) => e.inventoryId === item.inventoryId && e.received))
      .map((item) => item.inventoryId);
    const isFullyReceived = progress.stillPending === 0;
    const finalStatus = isFullyReceived ? "fully_received" : "partially_received";

    onFinalizeReceive({
      transfer: receivingTransfer,
      newlyReceivedInventoryIds: newlyReceivedIds,
      overageItems: overageItems,
      unknownItems: unknownItems.map((item) => ({
        barcode: item.barcode || item.scanned_barcode,
      })),
      missingItems: missingItems,
      finalStatus,
      destinationWarehouseId: destLocationId,
      receivingJson: {
        branch_remarks: branchRemarks,
        discrepancy_reason: discrepancyReason,
        photo_proof_url: photoUrl,
      },
    });
  }, [receivingTransfer, expectedItems, receivedItems, overageItems, unknownItems, progress, branchRemarks, discrepancyReason, photoUrl, onFinalizeReceive]);

  if (!receivingTransfer) return null;

  const isScannerPaused = showUnknownConfirm;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-[100dvh] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
          
          {/* 1. Header & Route Info */}
          <div className="bg-card border-b border-border p-3 sm:p-6 pb-3 flex-shrink-0">
            <DialogHeader className="mb-2 text-left">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
                <div className="p-1.5 bg-success-muted rounded-full">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
                <div className="flex flex-col text-left">
                  <span>Receive Stock Transfer</span>
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground">{receivingTransfer.transfer_number}</span>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Compact Progress Bar */}
            <div className="space-y-1 mt-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.totalReceived} / {progress.totalExpected} scanned</span>
                <span>{Math.round((progress.totalExpected > 0 ? progress.totalReceived / progress.totalExpected : 0) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${
                    progress.stillPending === 0 && progress.totalExpected > 0 ? "bg-success" : "bg-primary"
                  }`}
                  style={{ width: `${progress.totalExpected > 0 ? (progress.totalReceived / progress.totalExpected) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="p-3 sm:p-6 space-y-4">
              
              {/* SCANNER SECTION (Collapsible) */}
              <div className="bg-card rounded-xl shadow-sm border border-border sticky top-0 z-20 overflow-hidden">
                {/* Scanner Header / Controls */}
                <div 
                  className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border cursor-pointer"
                  onClick={() => setIsScannerExpanded(!isScannerExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Scan Input
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isMobileDevice && (
                      <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5 mr-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setScanMode("barcode")}
                          className={`p-1 rounded ${scanMode === "barcode" ? "bg-white shadow" : "text-slate-500"}`}
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setScanMode("qr_code"); setIsScannerExpanded(true); }}
                          className={`p-1 rounded ${scanMode === "qr_code" ? "bg-white shadow" : "text-slate-500"}`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {isScannerExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Collapsible Content */}
                <div className={`transition-all duration-300 ease-in-out ${isScannerExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {/* Manual Barcode Input */}
                  {scanMode === "barcode" && (
                    <div className="relative p-3">
                      <div className="relative">
                        <Input
                          ref={inputRef}
                          className="h-12 pl-10 pr-20 text-base border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
                          placeholder="Scan/Type barcode..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleScan()}
                          autoFocus={scanMode === "barcode"}
                        />
                        <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Button 
                          onClick={handleScan} 
                          size="sm" 
                          className="absolute right-1.5 top-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          Enter
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* QR Scanner */}
                  {scanMode === "qr_code" && (
                    <div className="p-0 relative">
                      <QRCodeScanner
                        onScan={handleQRScan}
                        onClose={!isMobileDevice ? () => setScanMode("barcode") : undefined}
                        paused={isScannerPaused}
                        className="h-48 sm:h-64 w-full rounded-none sm:rounded-b-lg"
                      />
                      {isMobileDevice && (
                        <div className="absolute bottom-2 right-2 left-2 flex justify-center">
                           <button
                            onClick={() => { setScanMode("barcode"); }}
                            className="bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1"
                          >
                            <Keyboard className="w-3 h-3" /> Type ID
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Last Scanned Feedback Banner (Always visible if exists) */}
                {lastScanResult && (
                  <div className={`px-4 py-2 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1
                    ${lastScanResult.type === 'success' ? 'bg-success-muted text-success-muted-foreground border-t border-success/20' : 
                      lastScanResult.type === 'warning' ? 'bg-warning-muted text-warning-muted-foreground border-t border-warning/20' : 
                      'bg-destructive-muted text-destructive-muted-foreground border-t border-destructive/20'}`}
                  >
                    {lastScanResult.type === 'success' ? <CheckCircle className="w-4 h-4" /> : 
                     lastScanResult.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : 
                     <AlertCircle className="w-4 h-4" />}
                    <span className="truncate">{lastScanResult.message}</span>
                  </div>
                )}
              </div>

              {/* LIST TABS */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-2 h-9 bg-muted text-muted-foreground">
                  <TabsTrigger value="pending" className="text-xs">
                    Pending <Badge variant="secondary" className="ml-1.5 px-1 py-0 h-4 min-w-[1rem] text-[10px]">{progress.stillPending}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="received" className="text-xs">
                    Received <Badge variant="secondary" className="ml-1.5 px-1 py-0 h-4 min-w-[1rem] text-[10px] bg-success-muted text-success-muted-foreground">{progress.newlyReceived}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="exceptions" className="text-xs relative">
                    Exceptions
                    {(progress.overageCount > 0 || progress.unknownCount > 0) && (
                      <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Content Area */}
                <div className="min-h-[200px]">
                  <TabsContent value="pending" className="mt-0">
                    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      {progress.stillPending === 0 ? (
                        <div className="py-8 text-center">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-muted mb-3">
                            <CheckCircle className="w-6 h-6 text-success" />
                          </div>
                          <p className="text-sm font-medium">All items scanned!</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left min-w-[350px]">
                            <thead className="bg-muted/40 border-b border-border">
                              <tr>
                                <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Variant</th>
                                <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-right">Progress</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {(() => {
                                // Group pending items by variant
                                const pendingByVariant = {};
                                expectedItems.forEach((item) => {
                                  const key = `${item.productMasterId}-${item.variantId}`;
                                  if (!pendingByVariant[key]) {
                                    pendingByVariant[key] = {
                                      productName: item.productName,
                                      variantName: item.variantName,
                                      total: 0,
                                      received: 0,
                                    };
                                  }
                                  pendingByVariant[key].total += 1;
                                  if (item.received || receivedItems.some((r) => r.id === item.inventoryId)) {
                                    pendingByVariant[key].received += 1;
                                  }
                                });

                                // Filter to show only variants with pending items
                                return Object.entries(pendingByVariant)
                                  .filter(([_, data]) => data.received < data.total)
                                  .map(([key, data]) => (
                                    <tr key={key} className="group hover:bg-accent/50">
                                      <td className="px-3 py-2">
                                        <p className="font-medium text-foreground">
                                          {data.variantName || data.productName}
                                        </p>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className="font-mono text-sm">
                                          <span className="text-primary font-semibold">{data.received}</span>
                                          <span className="text-muted-foreground">/{data.total}</span>
                                        </span>
                                      </td>
                                    </tr>
                                  ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="received" className="mt-0">
                     <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      {progress.newlyReceived === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                          No items received yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                           <table className="w-full text-sm text-left min-w-[350px]">
                            <thead className="bg-muted/40 border-b border-border sticky top-0">
                              <tr>
                                <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Product</th>
                                <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Identifier</th>
                                <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {receivedItems
                                .filter((item) => !expectedItems.find((e) => e.inventoryId === item.inventoryId && e.received))
                                .map((item) => {
                                  return (
                                    <tr key={item.inventoryId} className="bg-success-muted/60">
                                      <td className="px-3 py-2">
                                        <p className="font-medium truncate max-w-[150px] sm:max-w-[200px]">{formatItemName(item)}</p>
                                      </td>
                                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                                        {getItemIdentifier(item)}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <Badge className="bg-success-muted text-success-muted-foreground h-5 text-[10px]">Received</Badge>
                                      </td>
                                    </tr>
                                  );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                     </div>
                  </TabsContent>

                  <TabsContent value="exceptions" className="mt-0">
                     <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      {overageItems.length === 0 && unknownItems.length === 0 ? (
                         <div className="py-8 text-center text-sm text-muted-foreground">
                           No exceptions found.
                         </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left min-w-[350px]">
                            <thead className="bg-warning-muted border-b border-warning/20">
                               <tr>
                                <th className="px-3 py-2 font-medium text-warning-muted-foreground whitespace-nowrap">Type</th>
                                <th className="px-3 py-2 font-medium text-warning-muted-foreground whitespace-nowrap">Details</th>
                                <th className="px-3 py-2 text-right font-medium text-warning-muted-foreground whitespace-nowrap">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {overageItems.map((item, index) => (
                                <tr key={`ov-${index}`} className="hover:bg-accent/50">
                                  <td className="px-3 py-2">
                                    <Badge variant="outline" className="border-warning/20 bg-warning-muted text-warning-muted-foreground h-5 text-[10px]">
                                      Excess
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <p className="font-medium truncate max-w-[150px]">{formatItemName(item)}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{getItemIdentifier(item)}</p>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <Button variant="ghost" size="icon" onClick={() => removeOverageItem(index)} className="h-6 w-6 text-red-500">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                              {unknownItems.map((item, index) => (
                                <tr key={`un-${index}`} className="hover:bg-accent/50">
                                  <td className="px-3 py-2">
                                    <Badge variant="destructive" className="h-5 text-[10px]">Unknown</Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <p className="italic text-muted-foreground">Unknown Product</p>
                                    <p className="font-mono text-xs">{item.scanned_barcode || item.barcode}</p>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <Button variant="ghost" size="icon" onClick={() => removeUnknownItem(index)} className="h-6 w-6 text-red-500">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                     </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Variance Reporting Form */}
              {hasVariance && (
                <div className="rounded-xl border border-warning/20 bg-warning-muted p-4">
                  <div className="flex items-center gap-2 mb-3 text-warning-muted-foreground">
                    <AlertOctagon className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">Discrepancy Details</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Reason</Label>
                      <Select value={discrepancyReason} onValueChange={setDiscrepancyReason}>
                        <SelectTrigger className="bg-background border-border h-9 text-sm">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAMAGED_IN_TRANSIT">Damaged in Transit</SelectItem>
                          <SelectItem value="LOST_IN_TRANSIT">Lost in Transit</SelectItem>
                          <SelectItem value="PACKING_ERROR">Packing Error</SelectItem>
                          <SelectItem value="SHORT_RECEIVED">Short Received</SelectItem>
                          <SelectItem value="WRONG_ITEM_SENT">Wrong Item Sent</SelectItem>
                          <SelectItem value="TO_BE_INVESTIGATED">To Be Investigated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                       <Label className="text-xs text-muted-foreground">
                        Remarks <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        value={branchRemarks}
                        onChange={(e) => setBranchRemarks(e.target.value)}
                        placeholder="Required..."
                        className="bg-background border-border resize-none h-16 text-sm"
                      />
                    </div>
                    
                    <div>
                       <Label className="text-xs text-muted-foreground">Proof (Optional)</Label>
                       <div className="flex items-center gap-2 mt-1">
                         <Input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="bg-background border-border h-9 text-xs" />
                         {photoUrl && (
                           <div className="relative group shrink-0">
                              <img src={photoUrl} className="h-9 w-9 rounded border object-cover" alt="Proof" />
                              <button onClick={() => setPhotoUrl("")} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                                <X className="w-2 h-2" />
                              </button>
                           </div>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Footer - Fixed at bottom */}
          <div className="bg-card border-t border-border p-3 sm:p-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end flex-shrink-0 safe-area-bottom">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10">
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={!canFinalize || isReceiving}
              className={`w-full sm:w-auto gap-2 h-10 ${
                hasVariance 
                  ? "bg-warning hover:bg-warning/90 text-warning-foreground" 
                  : "bg-success hover:bg-success/90 text-success-foreground"
              }`}
            >
              {isReceiving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : hasVariance ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isReceiving
                ? "Processing..."
                : hasVariance
                ? "Confirm with Variance"
                : "Complete Transfer"}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Unknown Barcode Confirmation Dialog */}
      <AlertDialog open={showUnknownConfirm} onOpenChange={setShowUnknownConfirm}>
        <AlertDialogContent className="w-[95vw] sm:max-w-lg rounded-lg bg-card text-card-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Unknown Barcode</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-2 p-2 bg-destructive-muted rounded-md text-sm border border-destructive/20 font-mono text-center">
                {pendingUnknownBarcode}
              </div>
              <p className="mt-2">Barcode not found in inventory. Record as <strong>Unknown</strong>?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-end">
            <AlertDialogCancel onClick={() => {
              setPendingUnknownBarcode("");
              if (inputRef.current) inputRef.current.focus();
            }} className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnknownBarcode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Record</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
