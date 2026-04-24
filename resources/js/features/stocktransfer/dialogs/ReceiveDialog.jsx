import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Camera, Keyboard, Package, ScanLine,
  ArrowRight, Circle
} from "lucide-react";
import { useDeviceDetection } from "../hooks/useDeviceDetection";
import QRCodeScanner from "@/components/shared/QRCodeScanner";

const formatItemName = (item) =>
  [item?.product_name || item?.productName, item?.variant_name || item?.variantName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unknown Product";

const getItemIdentifier = (item) =>
  item?.identifier || item?.imei1 || item?.imei2 || item?.serial_number || item?.inventory_id || item?.inventoryId || "—";

// ── Status pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ type }) => {
  const config = {
    received: { label: "Received", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    pending: { label: "Pending", cls: "bg-zinc-500/10  text-zinc-500  dark:text-zinc-400  border-zinc-400/20" },
    excess: { label: "Excess", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
    unknown: { label: "Unknown", cls: "bg-rose-500/15  text-rose-600  dark:text-rose-400  border-rose-500/30" },
  };
  const c = config[type] || config.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${c.cls}`}>
      {c.label}
    </span>
  );
};

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accent, onClick, active }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-150
      ${active
        ? `${accent.activeBg} ${accent.border} shadow-lg shadow-black/10 dark:shadow-black/30`
        : "bg-zinc-100/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      }`}
  >
    <span className={`text-2xl font-black tabular-nums tracking-tight ${active ? accent.text : "text-zinc-700 dark:text-zinc-200"}`}>
      {value}
    </span>
    <span className={`text-[10px] uppercase tracking-widest font-semibold mt-0.5 ${active ? accent.label : "text-zinc-400 dark:text-zinc-500"}`}>
      {label}
    </span>
  </button>
);

// ── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ id, icon: Icon, label, count, accent }) => (
  <div id={id} className={`flex items-center gap-2 px-4 py-2 border-b ${accent.sectionBorder} ${accent.sectionBg} scroll-mt-4`}>
    <Icon className={`w-3.5 h-3.5 ${accent.icon}`} />
    <span className={`text-xs font-bold uppercase tracking-widest ${accent.text}`}>{label}</span>
    <span className={`ml-auto text-xs font-mono font-bold ${accent.text}`}>{count}</span>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
export default function ReceiveDialog({
  open,
  onOpenChange,
  receivingTransfer,
  onFinalizeReceive,
  isReceiving,
  onPhotoUpload,
  lookupInventoryItemByBarcode,
}) {
  const { isMobileDevice } = useDeviceDetection();

  const [barcodeInput, setBarcodeInput] = useState("");
  const [receivedItems, setReceivedItems] = useState([]);
  const [overageItems, setOverageItems] = useState([]);
  const [unknownItems, setUnknownItems] = useState([]);
  const [branchRemarks, setBranchRemarks] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [scanMode, setScanMode] = useState(() => isMobileDevice ? "qr_code" : "barcode");
  const [lastScanResult, setLastScanResult] = useState(null);
  const [activeSection, setActiveSection] = useState("pending");

  const [showUnknownConfirm, setShowUnknownConfirm] = useState(false);
  const [pendingUnknownBarcode, setPendingUnknownBarcode] = useState("");

  const inputRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const listRef = useRef(null);

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

  useEffect(() => {
    if (open && receivingTransfer) {
      setReceivedItems(expectedItems.filter((i) => i.received));
      setOverageItems(receivingTransfer.overage_items_json || []);
      setUnknownItems(receivingTransfer.unknown_items_json || []);
      setBranchRemarks(receivingTransfer.receiving_json?.branch_remarks || "");
      setDiscrepancyReason(receivingTransfer.receiving_json?.discrepancy_reason || "");
      setPhotoUrl(receivingTransfer.receiving_json?.photo_proof_url || "");
      setLastScanResult(null);
      setActiveSection("pending");
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

  useEffect(() => {
    if (open && inputRef.current && scanMode === "barcode") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, scanMode]);

  useEffect(() => {
    if (isMobileDevice) setScanMode("qr_code");
  }, [isMobileDevice]);

  const showFeedback = useCallback((type, message) => {
    setLastScanResult({ type, message });
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setLastScanResult(null), type === "success" ? 2500 : 4500);
  }, []);

  const allScannedBarcodes = useMemo(() => {
    const barcodes = new Set();
    receivedItems.forEach((item) => {
      [item.imei1, item.imei2, item.serialNumber, item.identifier].filter(Boolean).forEach((b) => barcodes.add(b));
    });
    overageItems.forEach((item) => {
      [item.imei1, item.imei2, item.serial_number, item.identifier].filter(Boolean).forEach((b) => barcodes.add(b));
    });
    unknownItems.forEach((item) => barcodes.add(item.scanned_barcode || item.barcode));
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
      totalExpected, previouslyReceived, newlyReceived,
      totalReceived, stillPending,
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

  const scrollToSection = useCallback((section) => {
    setActiveSection(section);
    const el = document.getElementById(`section-${section}`);
    if (el && listRef.current) {
      const container = listRef.current;
      const top = el.offsetTop - container.offsetTop - 8;
      container.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  const processScan = useCallback(async (barcode) => {
    if (!barcode) return;
    if (allScannedBarcodes.has(barcode)) {
      showFeedback("warning", "Already scanned in this session");
      setBarcodeInput("");
      inputRef.current?.focus();
      return;
    }
    const expectedItem = expectedItems.find(
      (item) => [item.imei1, item.imei2, item.serialNumber, item.identifier].filter(Boolean).includes(barcode)
    );
    if (expectedItem && !expectedItem.received) {
      setReceivedItems((prev) => [...prev, { ...expectedItem, scanned_barcode: barcode }]);
      showFeedback("success", `✓ ${formatItemName(expectedItem)}`);
      setBarcodeInput("");
      inputRef.current?.focus();
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
    showFeedback("warning", `Overage: ${formatItemName(overageEntry)}`);
    scrollToSection("exceptions");
    setBarcodeInput("");
    inputRef.current?.focus();
  }, [allScannedBarcodes, expectedItems, lookupInventoryItemByBarcode, showFeedback, scrollToSection]);

  const handleScan = useCallback(() => void processScan(barcodeInput.trim()), [barcodeInput, processScan]);
  const handleQRScan = useCallback((code) => void processScan(code), [processScan]);

  const confirmUnknownBarcode = useCallback(() => {
    if (!pendingUnknownBarcode) return;
    setUnknownItems((prev) => [...prev, { barcode: pendingUnknownBarcode, scanned_barcode: pendingUnknownBarcode, scanned_date: new Date().toISOString() }]);
    showFeedback("error", "Recorded as Unknown");
    scrollToSection("exceptions");
    setPendingUnknownBarcode("");
    setShowUnknownConfirm(false);
    inputRef.current?.focus();
  }, [pendingUnknownBarcode, showFeedback, scrollToSection]);

  const handlePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const uploaded = await onPhotoUpload(file);
      setPhotoUrl(uploaded?.file_url || "");
    } catch { alert("Failed to upload photo."); }
    finally { setUploadingPhoto(false); }
  }, [onPhotoUpload]);

  const handleFinalize = useCallback(() => {
    if (!receivingTransfer) return;
    const missingItems = expectedItems
      .filter((e) => !e.received && !receivedItems.some((r) => r.inventoryId === e.inventoryId))
      .map((e) => ({ inventory_id: e.inventoryId, product_master_id: e.productMasterId, variant_id: e.variantId, product_name: e.productName, variant_name: e.variantName, imei1: e.imei1, imei2: e.imei2, serial_number: e.serialNumber, identifier: e.identifier, reported_date: new Date().toISOString() }));
    const newlyReceivedIds = receivedItems
      .filter((item) => !expectedItems.find((e) => e.inventoryId === item.inventoryId && e.received))
      .map((item) => item.inventoryId);
    const isFullyReceived = progress.stillPending === 0;
    onFinalizeReceive({
      transfer: receivingTransfer,
      newlyReceivedInventoryIds: newlyReceivedIds,
      overageItems,
      unknownItems: unknownItems.map((i) => ({ barcode: i.barcode || i.scanned_barcode })),
      missingItems,
      finalStatus: isFullyReceived ? "fully_received" : "partially_received",
      destinationWarehouseId: receivingTransfer.destination_location_id,
      receivingJson: { branch_remarks: branchRemarks, discrepancy_reason: discrepancyReason, photo_proof_url: photoUrl },
    });
  }, [receivingTransfer, expectedItems, receivedItems, overageItems, unknownItems, progress, branchRemarks, discrepancyReason, photoUrl, onFinalizeReceive]);

  const pendingByVariant = useMemo(() => {
    const map = {};
    expectedItems.forEach((item) => {
      const key = `${item.productMasterId}-${item.variantId}`;
      if (!map[key]) map[key] = { productName: item.productName, variantName: item.variantName, total: 0, received: 0 };
      map[key].total += 1;
      if (item.received || receivedItems.some((r) => r.inventoryId === item.inventoryId)) map[key].received += 1;
    });
    return Object.entries(map).filter(([, d]) => d.received < d.total);
  }, [expectedItems, receivedItems]);

  const newlyReceivedItems = receivedItems.filter(
    (item) => !expectedItems.find((e) => e.inventoryId === item.inventoryId && e.received)
  );

  const pct = progress.totalExpected > 0 ? Math.round((progress.totalReceived / progress.totalExpected) * 100) : 0;
  const isComplete = progress.stillPending === 0 && progress.totalExpected > 0;

  if (!receivingTransfer) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .receive-dialog * { font-family: 'DM Sans', sans-serif; }
        .receive-dialog .mono { font-family: 'IBM Plex Mono', monospace; }
        .scan-pulse { animation: scanPulse 2s ease-in-out infinite; }
        @keyframes scanPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
          50% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.10); }
        }
        .feedback-in { animation: feedbackIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes feedbackIn {
          from { transform: translateY(-6px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0)   scale(1);    opacity: 1; }
        }
        .item-row { transition: background 0.1s ease; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 99px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: #3f3f46; }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="receive-dialog w-full h-[100dvh] sm:h-auto sm:max-w-3xl sm:max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-2xl border-0 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-2xl">

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80 px-4 sm:px-6 pt-4 pb-3">
            <DialogHeader className="mb-3 text-left">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center">
                    <Package className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">Receive Transfer</div>
                    <div className="mono text-[11px] text-zinc-400 dark:text-zinc-500 tracking-wider">{receivingTransfer.transfer_number}</div>
                  </div>
                </div>
                <div className={`mono text-2xl font-black tracking-tight ${isComplete ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-300"}`}>
                  {pct}<span className="text-sm font-normal text-zinc-400 dark:text-zinc-500">%</span>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${isComplete ? "bg-emerald-500" : "bg-indigo-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 mono">{progress.totalReceived} received</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 mono">{progress.totalExpected} expected</span>
            </div>
          </div>

          {/* ── SCAN ZONE ──────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/60 px-4 sm:px-6 py-3 space-y-2.5">

            {/* Mode toggle (desktop only) */}
            {!isMobileDevice && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setScanMode("barcode")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all
                    ${scanMode === "barcode"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                >
                  <Keyboard className="w-3 h-3" /> Keyboard
                </button>
                <button
                  onClick={() => setScanMode("qr_code")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all
                    ${scanMode === "qr_code"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                >
                  <Camera className="w-3 h-3" /> Camera
                </button>
              </div>
            )}

            {/* Barcode input */}
            {scanMode === "barcode" && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <Input
                    ref={inputRef}
                    className="mono h-11 pl-10 pr-4 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus-visible:border-indigo-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-xl scan-pulse text-sm"
                    placeholder="Scan or type barcode / IMEI…"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleScan}
                  disabled={!barcodeInput.trim()}
                  className="h-11 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm disabled:opacity-30 shrink-0"
                >
                  Enter <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}

            {/* QR camera */}
            {scanMode === "qr_code" && (
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <QRCodeScanner
                  onScan={handleQRScan}
                  onClose={!isMobileDevice ? () => setScanMode("barcode") : undefined}
                  paused={showUnknownConfirm}
                  className="h-48 sm:h-56 w-full"
                />
                {isMobileDevice && (
                  <button
                    onClick={() => setScanMode("barcode")}
                    className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1.5"
                  >
                    <Keyboard className="w-3 h-3" /> Type instead
                  </button>
                )}
              </div>
            )}

            {/* Scan feedback */}
            {lastScanResult && (
              <div className={`feedback-in flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                ${lastScanResult.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : lastScanResult.type === "warning"
                    ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300"
                    : "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300"}`}
              >
                {lastScanResult.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> :
                  lastScanResult.type === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0" /> :
                    <AlertCircle className="w-4 h-4 shrink-0" />}
                <span className="truncate">{lastScanResult.message}</span>
              </div>
            )}
          </div>

          {/* ── STAT STRIP ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex gap-2 px-4 sm:px-6 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/60">
            <StatCard
              label="Pending"
              value={progress.stillPending}
              active={activeSection === "pending"}
              onClick={() => scrollToSection("pending")}
              accent={{
                activeBg: "bg-zinc-100 dark:bg-zinc-800",
                border: "border-zinc-400 dark:border-zinc-600",
                text: "text-zinc-800 dark:text-zinc-100",
                label: "text-zinc-500 dark:text-zinc-400",
              }}
            />
            <StatCard
              label="Received"
              value={progress.newlyReceived}
              active={activeSection === "received"}
              onClick={() => scrollToSection("received")}
              accent={{
                activeBg: "bg-emerald-50 dark:bg-emerald-950",
                border: "border-emerald-400 dark:border-emerald-700/50",
                text: "text-emerald-600 dark:text-emerald-400",
                label: "text-emerald-500 dark:text-emerald-600",
              }}
            />
            <StatCard
              label="Exceptions"
              value={progress.overageCount + progress.unknownCount}
              active={activeSection === "exceptions"}
              onClick={() => scrollToSection("exceptions")}
              accent={{
                activeBg: "bg-rose-50 dark:bg-rose-950",
                border: "border-rose-400 dark:border-rose-700/50",
                text: "text-rose-600 dark:text-rose-400",
                label: "text-rose-500 dark:text-rose-600",
              }}
            />
          </div>

          {/* ── SCROLLABLE LIST ─────────────────────────────────────────────── */}
          <div ref={listRef} className="flex-1 overflow-y-auto custom-scroll bg-white dark:bg-zinc-950">

            {/* PENDING */}
            <SectionHeader
              id="section-pending"
              icon={Circle}
              label="Pending"
              count={pendingByVariant.length}
              accent={{
                sectionBg: "bg-zinc-50 dark:bg-zinc-900/40",
                sectionBorder: "border-zinc-200 dark:border-zinc-800",
                icon: "text-zinc-400 dark:text-zinc-500",
                text: "text-zinc-500 dark:text-zinc-400",
              }}
            />
            {pendingByVariant.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All items received</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {pendingByVariant.map(([key, data]) => (
                  <div key={key} className="item-row flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.variantName || data.productName}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">{data.productName !== data.variantName ? data.productName : ""}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="mono text-right">
                        <span className="text-indigo-500 dark:text-indigo-400 font-bold">{data.received}</span>
                        <span className="text-zinc-400 dark:text-zinc-600 text-sm">/{data.total}</span>
                      </div>
                      <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(data.received / data.total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RECEIVED */}
            <SectionHeader
              id="section-received"
              icon={CheckCircle}
              label="Received"
              count={newlyReceivedItems.length}
              accent={{
                sectionBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
                sectionBorder: "border-emerald-100 dark:border-emerald-900/50",
                icon: "text-emerald-500",
                text: "text-emerald-600 dark:text-emerald-400",
              }}
            />
            {newlyReceivedItems.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-600 text-sm">Nothing received yet.</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {newlyReceivedItems.map((item) => (
                  <div key={item.inventoryId} className="item-row flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-8 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{formatItemName(item)}</p>
                        <p className="mono text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{getItemIdentifier(item)}</p>
                      </div>
                    </div>
                    <StatusPill type="received" />
                  </div>
                ))}
              </div>
            )}

            {/* EXCEPTIONS */}
            <SectionHeader
              id="section-exceptions"
              icon={AlertTriangle}
              label="Exceptions"
              count={overageItems.length + unknownItems.length}
              accent={{
                sectionBg: "bg-rose-50/50 dark:bg-rose-950/30",
                sectionBorder: "border-rose-100 dark:border-rose-900/50",
                icon: "text-amber-500",
                text: "text-amber-600 dark:text-amber-400",
              }}
            />
            {overageItems.length === 0 && unknownItems.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-600 text-sm">No exceptions.</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {overageItems.map((item, i) => (
                  <div key={`ov-${i}`} className="item-row flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-8 rounded-full bg-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{formatItemName(item)}</p>
                        <p className="mono text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{getItemIdentifier(item)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill type="excess" />
                      <button
                        onClick={() => setOverageItems((p) => p.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 dark:text-zinc-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {unknownItems.map((item, i) => (
                  <div key={`un-${i}`} className="item-row flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-8 rounded-full bg-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 italic">Unknown Product</p>
                        <p className="mono text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{item.scanned_barcode || item.barcode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill type="unknown" />
                      <button
                        onClick={() => setUnknownItems((p) => p.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 dark:text-zinc-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANCE FORM */}
            {hasVariance && (
              <div className="m-4 sm:m-6 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300">Discrepancy Report</h4>
                </div>
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">Reason</Label>
                  <Select value={discrepancyReason} onValueChange={setDiscrepancyReason}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 h-9 text-sm rounded-lg focus:ring-0">
                      <SelectValue placeholder="Select reason…" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
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
                  <Label className="text-xs text-zinc-500 mb-1 block">
                    Remarks <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    value={branchRemarks}
                    onChange={(e) => setBranchRemarks(e.target.value)}
                    placeholder="Describe the discrepancy…"
                    className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none h-16 text-sm rounded-lg focus-visible:ring-0 focus-visible:border-indigo-500"
                  />
                </div>
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">
                    Photo Proof <span className="text-zinc-400 dark:text-zinc-600">(optional)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 h-9 text-xs rounded-lg"
                    />
                    {photoUrl && (
                      <div className="relative shrink-0">
                        <img src={photoUrl} className="h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover" alt="Proof" />
                        <button onClick={() => setPhotoUrl("")} className="absolute -top-1.5 -right-1.5 bg-rose-600 rounded-full p-0.5">
                          <X className="w-2 h-2 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="h-4" />
          </div>

          {/* ── FOOTER ─────────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800/80 px-4 sm:px-6 py-3 flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={!canFinalize || isReceiving}
              className={`w-full sm:w-auto h-10 px-6 rounded-xl font-semibold text-sm gap-2 disabled:opacity-30 transition-all
                ${hasVariance
                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-900"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
            >
              {isReceiving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : hasVariance ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isReceiving ? "Processing…" : hasVariance ? "Confirm with Variance" : "Complete Transfer"}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* ── Unknown Barcode Confirmation ──────────────────────────────────── */}
      <AlertDialog open={showUnknownConfirm} onOpenChange={setShowUnknownConfirm}>
        <AlertDialogContent className="receive-dialog w-[92vw] sm:max-w-md rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Unknown Barcode</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div className="mono mt-2 px-3 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 text-center tracking-wider break-all">
                {pendingUnknownBarcode}
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                This barcode wasn't found in inventory. Record it as <strong className="text-rose-500 dark:text-rose-400">Unknown</strong>?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-end mt-2">
            <AlertDialogCancel
              onClick={() => { setPendingUnknownBarcode(""); inputRef.current?.focus(); }}
              className="h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnknownBarcode}
              className="h-9 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
            >
              Record as Unknown
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
