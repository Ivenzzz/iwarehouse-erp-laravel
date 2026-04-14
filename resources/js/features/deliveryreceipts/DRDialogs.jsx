import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  FileText,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  Gavel,
  User,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Printer,
  Hash,
  Calendar,
  MapPin,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const getDeclaredItemProductLabel = (item, productMasters = []) => {
  const productMaster = productMasters.find((entry) => entry.id === item?.product_master_id);
  const spec = [
    item?.product_spec?.ram,
    item?.product_spec?.rom,
    item?.product_spec?.condition,
  ].filter(Boolean).join(" / ");

  return {
    name: productMaster?.name || productMaster?.model || "Unknown Product",
    spec,
  };
};

export function DRDetailsDialog({ open, onOpenChange, selectedDR, productMasters = [] }) {
  if (!selectedDR) return null;

  // Extract data with fallbacks
  const logistics = selectedDR.logistics_json || {};
  const declaredItemsData = selectedDR.declared_items_json || {};
  const metadata = selectedDR.metadata_json || {};
  const declaredItems = declaredItemsData.items || selectedDR.declared_items || [];
  const drStatus = selectedDR.status || "received";
  const receivedDate = selectedDR.date_received || selectedDR.receipt_date || selectedDR.created_date;
  // Calculate dr_value on the fly instead of using stored value
  const drValue = declaredItems.reduce((sum, item) => {
    const qty = item.actual_quantity || item.declared_quantity || 0;
    const unitCost = item.unit_cost || 0;
    return sum + (qty * unitCost);
  }, 0);
  const freightCost = logistics.freight_cost || selectedDR.freight_cost || 0;
  // Calculate total landed cost on the fly
  const totalLandedCost = drValue + freightCost;

  // Helper for Status Badge Colors (dark palette)
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-400/15 text-emerald-300 border-emerald-400/25";
      case "with_variance":
        return "bg-indigo-500/12 text-indigo-300 border-indigo-500/25";
      case "ready_for_warehouse":
        return "bg-cyan-400/12 text-cyan-300 border-cyan-400/25";
      case "warehouse_encoding":
        return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
      default:
        return "bg-slate-950 text-slate-300 border-slate-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0
          bg-slate-900 border border-slate-800 text-slate-100
        "
      >
        {/* 1. Header Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/15 border border-indigo-500/25 p-2 rounded-lg shadow-[0_0_18px_rgba(99,102,241,0.12)]">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-100">Delivery Receipt Details</DialogTitle>
              <p className="text-xs text-slate-400 font-mono">{selectedDR.dr_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getStatusColor(drStatus)} px-3 py-1 capitalize`}>
              {drStatus.replace(/_/g, " ")}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              className="
                gap-2 hidden sm:flex
                bg-slate-950 border-slate-800 text-slate-100
                hover:bg-indigo-500/10 hover:border-indigo-500/25
                focus-visible:ring-2 focus-visible:ring-cyan-400/60
              "
            >
              <Printer className="w-4 h-4 text-slate-300" /> Print
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* 2. Top Info Grid (General & Logistics) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: General Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reference Details</h4>

              <div className="grid grid-cols-2 gap-y-5 gap-x-2">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-xs">PO Number</span>
                  </div>
                  <p className="font-semibold text-cyan-300">
                    {selectedDR.po_number || "N/A"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-xs">Vendor DR#</span>
                  </div>
                  <p className="font-medium text-slate-100">{selectedDR.dr_number || selectedDR.vendor_dr_number || "-"}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs">Receipt Date</span>
                  </div>
                  <p className="font-medium text-slate-100">
                    {receivedDate ? format(new Date(receivedDate), "MMM dd, yyyy") : "-"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {receivedDate ? format(new Date(receivedDate), "hh:mm a") : ""}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-xs">Reference #</span>
                  </div>
                  <p className="font-medium text-slate-100">{selectedDR.reference_number || "-"}</p>
                </div>
              </div>
            </div>

            {/* Right: Logistics Info & Route Visualization */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Logistics &amp; Route</h4>

              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 mb-0.5">Courier</span>
                    <span className="font-medium text-slate-100">{logistics.logistics_company || "N/A"}</span>
                  </div>

                  <div className="h-8 w-px bg-slate-800"></div>

                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 mb-0.5">Waybill / Tracking</span>
                    <span className="font-mono font-medium text-slate-100">{logistics.waybill_number || "N/A"}</span>
                  </div>
                </div>

                {/* Route Visual */}
                <div className="relative pt-2 px-2">
                  <div className="absolute top-3 left-2 right-2 h-0.5 bg-slate-800"></div>

                  <div className="flex justify-between relative">
                    {/* Origin */}
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-500 ring-4 ring-slate-950 z-10"></div>
                      <div className="mt-2 flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[10px] font-medium max-w-[100px] text-center truncate">
                          {logistics.origin || "Supplier Origin"}
                        </span>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-950 z-10 shadow-[0_0_18px_rgba(99,102,241,0.18)]"></div>
                      <div className="mt-2 flex items-center gap-1 text-indigo-300">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[10px] font-bold max-w-[100px] text-center truncate">
                          {logistics.destination || "Main Warehouse"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          {/* 3. Items Table */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-cyan-300" />
              <h4 className="font-bold text-slate-100">Declared Items</h4>
            </div>

            <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Product Details
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Unit Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Total Value
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {declaredItems.map((item, idx) => {
                    const productDisplay = getDeclaredItemProductLabel(item, productMasters);

                    return (
                    <tr
                      key={idx}
                      className={[
                        "transition-colors hover:bg-indigo-500/5",
                        item.variance_flag ? "bg-indigo-500/8" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{productDisplay.name}</div>
                        {productDisplay.spec && (
                          <div className="mt-0.5 text-xs text-slate-400">{productDisplay.spec}</div>
                        )}
                        {item.is_extra_item && (
                          <Badge
                            variant="secondary"
                            className="mt-1 bg-emerald-400/15 text-emerald-300 text-[10px] px-1.5 h-5 border border-emerald-400/25"
                          >
                            Extra Item
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center font-medium text-slate-200">
                        {item.actual_quantity || item.declared_quantity || 0}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-300 font-mono">
                        ₱{(item.unit_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-slate-100 font-mono">
                        ₱{(((item.actual_quantity || item.declared_quantity || 0)) * (item.unit_cost || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Financial Summary & Notes */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left: Notes & Box Counts */}
            <div className="flex-1 space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 h-full flex flex-col">
                <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Remarks / Notes</h5>

                <p className="text-sm text-slate-300 whitespace-pre-line flex-1">
                  {metadata.notes || selectedDR.notes || (
                    <span className="text-slate-400 italic">No notes provided.</span>
                  )}
                </p>

                {/* Box Count Info */}
                {(declaredItemsData.box_count_declared > 0 || declaredItemsData.box_count_received > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                      <Package className="w-3 h-3 text-slate-400" /> Handling Units
                    </h5>

                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-slate-400">Declared:</span>
                        <span className="ml-1 font-medium text-slate-100">{declaredItemsData.box_count_declared || "-"}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">Received:</span>
                        <span
                          className={[
                            "ml-1 font-medium",
                            declaredItemsData.box_count_declared !== declaredItemsData.box_count_received ? "text-indigo-300" : "text-slate-100",
                          ].join(" ")}
                        >
                          {declaredItemsData.box_count_received || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Invoice Totals */}
            <div className="w-full md:w-1/3 space-y-3 pt-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span className="text-slate-400">Subtotal (Items)</span>
                <span className="font-medium font-mono text-slate-100">
                  ₱{drValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-sm text-slate-300">
                <span className="text-slate-400">Freight / Shipping</span>
                <span className="font-medium font-mono text-slate-100">
                  ₱{freightCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="my-2 h-px bg-slate-800" />

              <div className="flex justify-between items-center bg-emerald-400/10 p-4 rounded-lg border border-emerald-400/20">
                <span className="font-bold text-emerald-300">Total Landed Cost</span>
                <span className="text-xl font-bold text-emerald-300 font-mono">
                  ₱{totalLandedCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-950/60">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="
              bg-slate-900 border-slate-800 text-slate-100
              hover:bg-slate-800
              focus-visible:ring-2 focus-visible:ring-cyan-400/60
            "
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PhotoViewerDialog({ open, onOpenChange, selectedPhotos, currentPhotoIndex, setCurrentPhotoIndex }) {
  // ... (Keep existing implementation) ...
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-900 border border-slate-800 text-slate-100">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-slate-100">View Documents &amp; Photos</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {selectedPhotos.length > 0 ? (
            <>
              <div className="text-center mb-2">
                <Badge variant="outline" className="text-sm bg-slate-950 border-slate-800 text-slate-100">
                  {selectedPhotos[currentPhotoIndex]?.label || "Document"}
                </Badge>
              </div>

              <div
                className="relative bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800"
                style={{ minHeight: "300px", maxHeight: "50vh" }}
              >
                {selectedPhotos[currentPhotoIndex]?.type === "pdf" ? (
                  <iframe
                    src={selectedPhotos[currentPhotoIndex]?.url}
                    className="w-full h-[400px] border-0"
                    title="PDF Viewer"
                  />
                ) : (
                  <img
                    src={selectedPhotos[currentPhotoIndex]?.url}
                    alt={selectedPhotos[currentPhotoIndex]?.label || "Photo"}
                    className="max-w-full max-h-[50vh] object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23111827" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">Failed to load</text></svg>';
                    }}
                  />
                )}
              </div>

              {selectedPhotos.length > 1 && (
                <>
                  <div className="flex items-center justify-between px-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                      disabled={currentPhotoIndex === 0}
                      className="bg-slate-950 border-slate-800 text-slate-100 hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>

                    <span className="text-sm text-slate-400">
                      {currentPhotoIndex + 1} / {selectedPhotos.length}
                    </span>

                    <Button
                      variant="outline"
                      onClick={() => setCurrentPhotoIndex(Math.min(selectedPhotos.length - 1, currentPhotoIndex + 1))}
                      disabled={currentPhotoIndex === selectedPhotos.length - 1}
                      className="bg-slate-950 border-slate-800 text-slate-100 hover:bg-slate-800"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <div className="flex gap-2 justify-center flex-wrap max-h-24 overflow-y-auto py-2">
                    {selectedPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={[
                          "w-14 h-14 flex-shrink-0 border-2 rounded overflow-hidden flex items-center justify-center",
                          "bg-slate-950 border-slate-800",
                          idx === currentPhotoIndex ? "border-cyan-400/50" : "hover:border-slate-700",
                        ].join(" ")}
                      >
                        {photo.type === "pdf" ? (
                          <FileText className="w-6 h-6 text-slate-500" />
                        ) : (
                          <img
                            src={photo.url}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-400">No photos available</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HistoryDialog({ open, onOpenChange, selectedDR, historyChain, isLoading = false }) {
  if (!selectedDR) return null;

  // Dark palette stage config
  const getStageConfig = (stage) => {
    const s = stage.toLowerCase();

    if (s.includes("stock request"))
      return { icon: FileText, color: "text-indigo-300", bg: "bg-indigo-500/12", border: "border-indigo-500/25" };

    if (s.includes("admin"))
      return { icon: ClipboardCheck, color: "text-cyan-300", bg: "bg-cyan-400/10", border: "border-cyan-400/25" };

    if (s.includes("rfq") || s.includes("quotation") || s.includes("supplier"))
      return { icon: Gavel, color: "text-cyan-300", bg: "bg-cyan-400/10", border: "border-cyan-400/25" };

    if (s.includes("purchase order"))
      return { icon: ShoppingCart, color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/25" };

    if (s.includes("transit"))
      return { icon: Truck, color: "text-cyan-300", bg: "bg-cyan-400/10", border: "border-cyan-400/25" };

    if (s.includes("delivery receipt"))
      return { icon: CheckCircle2, color: "text-slate-200", bg: "bg-slate-800/40", border: "border-slate-800" };

    return { icon: Activity, color: "text-slate-400", bg: "bg-slate-800/30", border: "border-slate-800" };
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("completed") || s.includes("approved") || s.includes("awarded"))
      return "bg-emerald-400/15 text-emerald-300 border-emerald-400/25";
    if (s.includes("rejected") || s.includes("cancelled"))
      return "bg-indigo-500/12 text-indigo-300 border-indigo-500/25";
    if (s.includes("transit"))
      return "bg-cyan-400/12 text-cyan-300 border-cyan-400/25";
    return "bg-slate-950 text-slate-300 border-slate-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 bg-slate-900 border border-slate-800 text-slate-100">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg shadow-sm">
              <Activity className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Procurement Timeline</h3>
              <p className="text-xs font-normal text-slate-400 font-mono mt-0.5">{selectedDR.dr_number}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading procurement timeline...
            </div>
          ) : (
          <div className="relative pl-4 space-y-8">
            {/* Continuous Vertical Line */}
            <div className="absolute left-[27px] top-2 bottom-2 w-0.5 bg-slate-800" />

            {historyChain.map((stage, idx) => {
              const { icon: Icon, color, bg, border } = getStageConfig(stage.stage);

              return (
                <div key={idx} className="relative pl-12 group">
                  {/* Timeline Icon Node */}
                  <div
                    className={[
                      "absolute left-0 top-0 w-14 h-14 rounded-full border-4",
                      "border-slate-900 flex items-center justify-center z-10 transition-transform group-hover:scale-105",
                      bg,
                      border,
                    ].join(" ")}
                  >
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>

                  {/* Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-sm hover:shadow-[0_0_28px_rgba(99,102,241,0.08)] transition-shadow overflow-hidden">
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800 bg-slate-900/40">
                      <div>
                        <h4 className={`text-sm font-bold ${color}`}>{stage.stage}</h4>
                        <p className="text-xs font-mono text-slate-400 mt-1 font-medium bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 w-fit">
                          {stage.number || "N/A"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {stage.date && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>{format(new Date(stage.date), "MMM dd, yyyy")}</span>
                            <span className="text-slate-700">|</span>
                            <span className="font-medium text-slate-200">{format(new Date(stage.date), "hh:mm a")}</span>
                          </div>
                        )}
                        <Badge variant="outline" className={`${getStatusBadge(stage.status)} capitalize px-2 py-0.5 h-5 text-[10px]`}>
                          {(stage.status || "Pending").replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-xs text-slate-400">
                          Action by: <span className="font-semibold text-slate-100">{stage.user || "System"}</span>
                        </span>
                      </div>

                      {stage.details && (
                        <div className="text-sm text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800 leading-relaxed relative">
                          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-slate-900/40 border-t border-l border-slate-800 transform rotate-45"></div>
                          {stage.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* End Dot */}
            <div className="absolute left-[22px] bottom-0 w-3 h-3 bg-slate-600 rounded-full ring-4 ring-slate-900" />
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
