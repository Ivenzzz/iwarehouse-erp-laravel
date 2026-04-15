import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, PackageCheck, RefreshCw, Plus } from "lucide-react";
import { Toast } from "@/components/shared/Toast";
import { Separator } from "@/components/ui/separator";
import AppShell from "@/shared/layouts/AppShell";
import AddPurchaseDialog from "@/features/goodsreceipt/dialogs/AddPurchaseDialog";
import GRNAlertDialog from "@/features/goodsreceipt/dialogs/AlertDialog";
import GRNDetailsDialog from "@/features/goodsreceipt/dialogs/GRNDetailsDialog";
import GRNLoadingModal from "@/features/goodsreceipt/dialogs/GRNLoadingModal";
import EncodingDialog from "@/features/goodsreceipt/dialogs/EncodingDialog";
import DRTable from "@/features/goodsreceipt/components/DRTable";
import GRNKPICards from "@/features/goodsreceipt/components/GRNKPICards";
import GRNTable from "@/features/goodsreceipt/components/GRNTable";
import { useGoodsReceiptPage } from "@/features/goodsreceipt/lib/hooks/useGoodsReceiptPage";

export default function GoodsReceipt() {
  const { data, addPurchase, encoding, actions, constants, dialogs } = useGoodsReceiptPage();
  const {
    deliveryReceipts,
    loadingDRs,
    fetchNextPendingPage,
    hasNextPendingPage,
    isFetchingNextPendingPage,
    productMasters,
    variants,
    suppliers,
    kpis,
    allGRNs,
    loadingGRNs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    activeTab,
    handleTabChange,
    createGRNMutation,
  } = data;

  return (
    <AppShell title="Goods Receipt">
      <div className="p-6 space-y-8 text-foreground">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Goods Receiving / Purchases
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage incoming purchases and create inventory records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={addPurchase.openDialog}
            className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" /> Add a Purchase
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={actions.refreshPage}
            className="
            h-10
            border-border bg-background text-foreground
            hover:bg-accent hover:text-accent-foreground
            focus-visible:ring-2 focus-visible:ring-ring
          "
          >
            <RefreshCw className="w-4 h-4 mr-2 text-primary" /> Refresh Data
          </Button>


        </div>
      </div>

      {/* KPI Section */}
      <GRNKPICards kpis={kpis} />

      <Separator className="bg-border" />

      {/* Main Operations Area */}
      <Card className="border border-border bg-card text-card-foreground shadow-sm">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="bg-muted/40 px-6 py-2 border-b border-border flex justify-between items-center">
              <TabsList className="bg-muted border border-border shadow-sm">
                <TabsTrigger
                  value="delivery-receipts"
                  className="
                  text-muted-foreground border border-transparent
                  data-[state=active]:bg-primary/10
                  data-[state=active]:text-primary
                  data-[state=active]:border-primary/20
                "
                >
                  <Package className="w-4 h-4 mr-2" />
                  Pending Purchases
                  {deliveryReceipts.length > 0 && (
                    <span
                      className="
                      ml-2
                      bg-primary/10 text-primary
                      border border-primary/20
                      text-[10px] px-1.5 py-0.5 rounded-full
                    "
                    >
                      {deliveryReceipts.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="goods-receipts"
                  className="
                  text-muted-foreground border border-transparent
                  data-[state=active]:bg-success/10
                  data-[state=active]:text-[hsl(var(--success))]
                  data-[state=active]:border-[hsl(var(--success))]/20
                "
                >
                  <PackageCheck className="w-4 h-4 mr-2" />
                  Completed Purchases List
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="delivery-receipts" className="p-6 m-0 animate-in fade-in-50 duration-300">
              <DRTable
                deliveryReceipts={deliveryReceipts}
                loadingDRs={loadingDRs}
                hasNextPage={hasNextPendingPage}
                isFetchingNextPage={isFetchingNextPendingPage}
                onLoadMore={fetchNextPendingPage}
                onSelectDR={actions.handleSelectDR}
              />
            </TabsContent>

            <TabsContent value="goods-receipts" className="p-6 m-0 animate-in fade-in-50 duration-300">
              <GRNTable
                allGRNs={allGRNs}
                loadingGRNs={loadingGRNs}
                onViewDetails={actions.handleViewDetails}
                onPrintGRN={actions.handlePrintGRN}
                onPrintBarcodes={actions.handlePrintBarcodes}
                onPrintQRStickers={actions.handlePrintQRStickers}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EncodingDialog
        open={dialogs.showEncodingDialog}
        onOpenChange={dialogs.setShowEncodingDialog}
        selectedDR={dialogs.selectedDR}
        declaredItemsList={encoding.declaredItemsList}
        selectedDeclaredItem={encoding.selectedDeclaredItem}
        onSelectDeclaredItem={encoding.handleSelectDeclaredItem}
        masterPattern={encoding.masterPattern}
        setMasterPattern={encoding.setMasterPattern}
        encodedItems={encoding.encodedItems}
        setEncodedItems={encoding.setEncodedItems}
        onSaveColorAllocation={encoding.saveColorAllocation}
        resolveDeclaredItemForVariant={encoding.resolveDeclaredItemForVariant}
        onSubmitGRN={actions.handleSubmitGRN}
        isSubmitting={createGRNMutation.isPending}
        productMasters={productMasters}
        variants={variants}
      />

      <GRNDetailsDialog
        open={dialogs.showDetailsDialog}
        onOpenChange={dialogs.setShowDetailsDialog}
        selectedGRN={dialogs.selectedGRN}
      />

      <GRNAlertDialog
        open={dialogs.alertDialog.open}
        onOpenChange={(open) => dialogs.setAlertDialog({ ...dialogs.alertDialog, open })}
        title={dialogs.alertDialog.title}
        description={dialogs.alertDialog.description}
      />

      <Toast
        open={dialogs.toast.open}
        onOpenChange={(open) => dialogs.setToast({ ...dialogs.toast, open })}
        title={dialogs.toast.title}
        description={dialogs.toast.description}
        variant={dialogs.toast.variant}
      />

      <GRNLoadingModal
        open={dialogs.loadingModal.open}
        currentStep={dialogs.loadingModal.currentStep}
        steps={constants.GRN_STEPS}
      />

      <AddPurchaseDialog
        open={addPurchase.open}
        onOpenChange={addPurchase.setOpen}
        step={addPurchase.step}
        STEPS={addPurchase.STEPS}
        formData={addPurchase.formData}
        updateFormData={addPurchase.updateFormData}
        suppliers={suppliers}
        validationErrors={addPurchase.validationErrors}
        duplicateErrors={addPurchase.duplicateErrors}
        brandConflicts={addPurchase.brandConflicts}
        setBrandConflicts={addPurchase.setBrandConflicts}
        validatedRows={addPurchase.validatedRows}
        importResult={addPurchase.importResult}
        onValidateCSV={addPurchase.handleValidateCSV}
        onUploadPurchaseFile={addPurchase.handleUploadPurchaseFile}
        onResolveConflicts={addPurchase.handleResolveConflicts}
        onImport={addPurchase.handleImport}
        onClose={addPurchase.closeDialog}
      />

      </div>
    </AppShell>
  );
}
