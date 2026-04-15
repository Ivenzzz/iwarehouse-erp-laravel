import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from "react";
import { Head } from "@inertiajs/react";
import AppShell from "@/shared/layouts/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { useDeliveryReceiptData } from "@/features/deliveryreceipts/useDeliveryReceiptData";
import { useDRForm } from "@/features/deliveryreceipts/hooks/useDRForm";
import { useDRCamera } from "@/features/deliveryreceipts/hooks/useDRCamera";
import { useDRHistory } from "@/features/deliveryreceipts/hooks/useDRHistory";

import POsReadyForDR from "@/features/deliveryreceipts/POsReadyForDR";
import DRTable from "@/features/deliveryreceipts/DRTable";

import { DRDetailsDialog, PhotoViewerDialog, HistoryDialog } from "@/features/deliveryreceipts/DRDialogs";

// Lazy-load heavy dialogs (only loaded when opened)
const CreateDRDialog = lazy(() => import("@/features/deliveryreceipts/form/CreateDRDialog"));
const CameraDialog = lazy(() => import("@/features/deliveryreceipts/form/CameraDialog"));

export default function DeliveryReceipts() {
  const {
    deliveryReceipts,
    deliveryReceiptsTotal,
    hasMoreDeliveryReceipts,
    drSearch,
    drStatusFilter,
    drPage,
    drPageSize,
    setDRSearch,
    setDRStatusFilter,
    setDRPage,

    purchaseOrders,
    purchaseOrdersTotal,
    incomingPOSearch,
    incomingPOTimeFilter,
    incomingPOWarehouseFilter,
    incomingPOPage,
    incomingPOPageSize,
    hasMoreIncomingPOs,
    isFetchingIncomingPOs,
    setIncomingPOSearch,
    setIncomingPOPage,
    setIncomingPOTimeFilter,
    setIncomingPOWarehouseFilter,

    warehouses,
    suppliers,
    productMasters,
    paymentTerms,
    currentUser,
    brands,
    refreshData,
    activeTab,
    incomingKpis,
    drKpis,
  } = useDeliveryReceiptData();

  const mainWarehouse = useMemo(() =>
    warehouses.find(w => w.warehouse_type === "main_warehouse") || warehouses[0],
    [warehouses]
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState("supplier");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPhotoViewerDialog, setShowPhotoViewerDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedDR, setSelectedDR] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState(activeTab || "confirmed_pos");
  const [historyChain, setHistoryChain] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setActiveMainTab(activeTab || "confirmed_pos");
  }, [activeTab]);

  const handleTabChange = useCallback((tab) => setActiveMainTab(tab), []);

  const formHook = useDRForm({
    mainWarehouse,
    productMasters,
    showCreateDialog,
    currentUser,
    purchaseOrders,
    suppliers,
  });

  const cameraHook = useDRCamera({
    onFileUpload: formHook.handleFileUpload,
    onError: useCallback((msg) => formHook.setAlertDialog({ open: true, title: "Camera Access Error", description: msg }), [formHook.setAlertDialog])
  });

  const historyHook = useDRHistory();

  // Stable handlers
  const handleReceiveFromPO = useCallback((poId) => {
    formHook.resetForm();
    formHook.handlePOSelect(poId);
    setCreateMode("po");
    setShowCreateDialog(true);
  }, [formHook.resetForm, formHook.handlePOSelect]);

  const handleManualCreate = useCallback(() => {
    formHook.resetForm();
    setCreateMode("supplier");
    setShowCreateDialog(true);
  }, [formHook.resetForm]);

  const handleViewDetails = useCallback((dr) => {
    setSelectedDR(dr);
    setShowDetailsDialog(true);
  }, []);

  const handleViewPhotos = useCallback((dr) => {
    const photos = historyHook.extractPhotosFromDR(dr);
    setSelectedPhotos(photos);
    setCurrentPhotoIndex(0);
    setShowPhotoViewerDialog(true);
  }, [historyHook.extractPhotosFromDR]);

  const handleOpenUploadsFromDetails = useCallback((files, startIndex = 0) => {
    if (!Array.isArray(files) || files.length === 0) return;
    const safeIndex = Math.max(0, Math.min(files.length - 1, startIndex));
    setSelectedPhotos(files);
    setCurrentPhotoIndex(safeIndex);
    setShowPhotoViewerDialog(true);
  }, []);

  const handleViewHistory = useCallback(async (dr) => {
    setSelectedDR(dr);
    setHistoryChain([]);
    setHistoryLoading(true);
    setShowHistoryDialog(true);
    try {
      const chain = await historyHook.getHistoryChain(dr);
      setHistoryChain(chain);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyHook]);

  const handleSubmitDR = useCallback(async () => {
    const success = await formHook.handleCreateDR();
    if (success) {
      setShowCreateDialog(false);
      formHook.resetForm();
      refreshData();
    }
  }, [formHook.handleCreateDR, formHook.resetForm, refreshData]);

  const handleCloseCreateDialog = useCallback((open) => {
    if (!open) formHook.resetForm();
    setShowCreateDialog(open);
  }, [formHook.resetForm]);

  const handleCancelCreate = useCallback(() => setShowCreateDialog(false), []);

  return (
    <AppShell title="Delivery Receipts">
      <Head title="Delivery Receipts" />
      <div className="space-y-6 text-foreground">
        <Tabs value={activeMainTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 grid w-[400px] grid-cols-2 border border-border bg-muted text-muted-foreground">
            <TabsTrigger
              value="confirmed_pos"
              className="border border-transparent text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Incoming POs
            </TabsTrigger>
            <TabsTrigger
              value="all_drs"
              className="border border-transparent text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Receipt History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="confirmed_pos">
            <POsReadyForDR
              purchaseOrders={purchaseOrders}
              purchaseOrdersTotal={purchaseOrdersTotal}
              currentPage={incomingPOPage}
              pageSize={incomingPOPageSize}
              hasMorePages={hasMoreIncomingPOs}
              isFetchingMore={isFetchingIncomingPOs}
              searchValue={incomingPOSearch}
              filterTime={incomingPOTimeFilter}
              filterWarehouse={incomingPOWarehouseFilter}
              onSearchChange={setIncomingPOSearch}
              onFilterTimeChange={setIncomingPOTimeFilter}
              onFilterWarehouseChange={setIncomingPOWarehouseFilter}
              onPageChange={setIncomingPOPage}
              productMasters={productMasters}
              warehouses={warehouses}
              onSelectPO={handleReceiveFromPO}
              onManualCreate={handleManualCreate}
              onRefresh={refreshData}
              metrics={incomingKpis}
            />
          </TabsContent>

          <TabsContent value="all_drs">
            <DRTable
              deliveryReceipts={deliveryReceipts}
              deliveryReceiptsTotal={deliveryReceiptsTotal}
              currentPage={drPage}
              pageSize={drPageSize}
              hasMorePages={hasMoreDeliveryReceipts}
              searchValue={drSearch}
              statusFilter={drStatusFilter}
              onSearchChange={setDRSearch}
              onStatusFilterChange={setDRStatusFilter}
              onPageChange={setDRPage}
              onViewDetails={handleViewDetails}
              onViewPhotos={handleViewPhotos}
              onViewHistory={handleViewHistory}
              metrics={drKpis}
            />
          </TabsContent>
        </Tabs>

        {/* Lazy dialogs - only load JS when opened */}
        {showCreateDialog && (
          <Suspense fallback={null}>
            <CreateDRDialog
              open={showCreateDialog}
              onOpenChange={handleCloseCreateDialog}
              mode={createMode}
              formData={formHook.formData}
              setFormData={formHook.setFormData}
              suppliers={suppliers}
              paymentTerms={paymentTerms}
              selectedPO={formHook.selectedPO}
              selectedSupplier={formHook.selectedSupplier}
              brands={brands}
              productMasters={productMasters}
              uploadProgress={formHook.uploadProgress}
              dragStates={formHook.dragStates}
              uploadedCount={formHook.uploadedCount}
              allRequiredUploaded={formHook.allRequiredUploaded}
              productSearchOpen={formHook.productSearchOpen}
              setProductSearchOpen={formHook.setProductSearchOpen}
              isSubmitting={formHook.isSubmitting}
              onSupplierSelect={formHook.handleSupplierSelect}
              onAddItem={formHook.handleAddItem}
              onItemChange={formHook.handleItemChange}
              onRemoveItem={formHook.handleRemoveItem}
              onDragEnter={formHook.handleDragEnter}
              onDragLeave={formHook.handleDragLeave}
              onDragOver={formHook.handleDragOver}
              onDrop={formHook.handleDrop}
              onFileUpload={formHook.handleFileUpload}
              onRemoveUpload={formHook.handleRemoveUpload}
              onStartCamera={cameraHook.handleStartCamera}
              onSubmit={handleSubmitDR}
              onCancel={handleCancelCreate}
            />
          </Suspense>
        )}

        {cameraHook.showCameraDialog && (
          <Suspense fallback={null}>
            <CameraDialog
              open={cameraHook.showCameraDialog}
              videoRef={cameraHook.videoRef}
              onCapture={cameraHook.handleCapturePhoto}
              onClose={cameraHook.handleStopCamera}
            />
          </Suspense>
        )}

        <PhotoViewerDialog
          open={showPhotoViewerDialog}
          onOpenChange={setShowPhotoViewerDialog}
          selectedPhotos={selectedPhotos}
          currentPhotoIndex={currentPhotoIndex}
          setCurrentPhotoIndex={setCurrentPhotoIndex}
        />

        <DRDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          selectedDR={selectedDR}
          productMasters={productMasters}
          onOpenUploadViewer={handleOpenUploadsFromDetails}
        />

        <HistoryDialog
          open={showHistoryDialog}
          onOpenChange={setShowHistoryDialog}
          selectedDR={selectedDR}
          historyChain={historyChain}
          isLoading={historyLoading}
        />

        <AlertDialog
          open={formHook.alertDialog.open}
          onOpenChange={(open) => formHook.setAlertDialog((prev) => ({ ...prev, open }))}
        >
          <AlertDialogContent className="border border-border bg-card text-card-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-card-foreground">{formHook.alertDialog.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {formHook.alertDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => formHook.setAlertDialog((prev) => ({ ...prev, open: false }))}
                className="border border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

