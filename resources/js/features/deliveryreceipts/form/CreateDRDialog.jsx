import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";

import DRBasicInfoSection from "./DRBasicInfoSection";
import DRLogisticsSection from "./DRLogisticsSection";
import DRDeliveryDetailsSection from "./DRDeliveryDetailsSection";
const DRItemsSection = lazy(() => import("./DRItemsSection"));
const DRUploadsSection = lazy(() => import("./DRUploadsSection"));
const DRNotesSection = lazy(() => import("./DRNotesSection"));

export default function CreateDRDialog({
  open,
  onOpenChange,
  mode = "supplier",
  formData,
  setFormData,
  suppliers,
  paymentTerms = [],
  selectedPO,
  selectedSupplier,
  brands,
  productMasters,
  uploadProgress,
  dragStates,
  uploadedCount,
  allRequiredUploaded,
  productSearchOpen,
  setProductSearchOpen,
  isSubmitting,
  onSupplierSelect,
  onAddItem,
  onItemChange,
  onRemoveItem,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileUpload,
  onRemoveUpload,
  onStartCamera,
  onSubmit,
  onCancel,
}) {
  const [renderDeferredSections, setRenderDeferredSections] = useState(false);
  const isReceiveDR = mode === "po";
  const dialogTitle = isReceiveDR ? "Receive Delivery Receipt" : "Log Manual Delivery Receipt";
  const dialogDescription = isReceiveDR
    ? "Use this flow to receive items against an existing purchase order and confirm the delivered documents and quantities."
    : "Use this flow to log a delivery receipt without a linked purchase order and manually enter the supplier, items, and documents.";

  useEffect(() => {
    if (!open) {
      setRenderDeferredSections(false);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setRenderDeferredSections(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, [open]);

  const estimatedValue = useMemo(() => {
    const itemsTotal = (formData?.declared_items || []).reduce((sum, item) => {
      const qty = parseInt(item?.actual_quantity || 0, 10) || 0;
      const unitCost = parseFloat(item?.unit_cost || 0) || 0;
      return sum + (qty * unitCost);
    }, 0);
    const freightCost = parseFloat(formData?.freight_cost || 0) || 0;
    return itemsTotal + freightCost;
  }, [formData?.declared_items, formData?.freight_cost]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-h-[90vh] max-w-6xl overflow-y-auto
          border border-border bg-card text-card-foreground
          shadow-lg
        "
      >
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-card-foreground">
              <Truck className="h-5 w-5 text-primary" />
              {dialogTitle}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {dialogDescription}
            </p>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <DRBasicInfoSection
            mode={mode}
            formData={formData}
            setFormData={setFormData}
            suppliers={suppliers}
            paymentTerms={paymentTerms}
            selectedPO={selectedPO}
            selectedSupplier={selectedSupplier}
            onSupplierSelect={onSupplierSelect}
          />

          <DRLogisticsSection formData={formData} setFormData={setFormData} />

          <DRDeliveryDetailsSection formData={formData} setFormData={setFormData} />

          {renderDeferredSections ? (
            <Suspense fallback={null}>
              <DRItemsSection
                formData={formData}
                brands={brands}
                productMasters={productMasters}
                selectedPOId={selectedPO?.id || null}
                productSearchOpen={productSearchOpen}
                setProductSearchOpen={setProductSearchOpen}
                onAddItem={onAddItem}
                onItemChange={onItemChange}
                onRemoveItem={onRemoveItem}
                isManualDR={mode === "supplier"}
              />

              <DRUploadsSection
                formData={formData}
                uploadProgress={uploadProgress}
                dragStates={dragStates}
                uploadedCount={uploadedCount}
                allRequiredUploaded={allRequiredUploaded}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onFileUpload={onFileUpload}
                onRemoveUpload={onRemoveUpload}
                onStartCamera={onStartCamera}
              />

              <DRNotesSection formData={formData} setFormData={setFormData} />
            </Suspense>
          ) : (
            <div className="space-y-4">
              <div className="h-48 rounded-lg border border-border bg-muted/30" />
              <div className="h-64 rounded-lg border border-border bg-muted/30" />
              <div className="h-24 rounded-lg border border-border bg-muted/30" />
            </div>
          )}

          <div
            className="
              flex justify-end gap-3 border-t border-border
              bg-card p-4 pt-4
            "
          >
            <div className="flex-1 content-center text-sm text-muted-foreground">
              Est. Value:{" "}
              <span className="font-bold text-card-foreground">
                PHP {estimatedValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="
                border-border bg-background text-foreground
                hover:bg-accent hover:text-accent-foreground
                focus-visible:ring-2 focus-visible:ring-ring
              "
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="
                border border-success/20 bg-success text-success-foreground
                hover:bg-success/90
                focus-visible:ring-2 focus-visible:ring-ring
              "
            >
              {isSubmitting ? "Submitting..." : "Submit Delivery Receipt"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

