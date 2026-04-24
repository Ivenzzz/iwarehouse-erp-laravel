import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router, usePage } from "@inertiajs/react";
import { ChevronDown, Download, Layers3, Plus, Printer } from "lucide-react";

import PicklistScanDialog from "@/components/transferpicklist/dialogs/PicklistScanDialog";
import { AlertMessage } from "@/components/shared/AlertMessage";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import AppShell from "@/shared/layouts/AppShell";

import TransferFiltersCard from "./TransferFiltersCard";
import TransferTable from "./TransferTable";
import { getConsolidationSummary, consolidateTransfers, validateTransferConsolidation } from "./services/consolidationService";
import { printBatchManifests, printTransferManifest } from "./services/transferManifestPrintService";
import { printBatchParcelLabels, printParcelLabel } from "./services/parcelLabelPrintService";
import { printBatchPicklists, printStockTransferPicklist } from "./services/picklistPrintService";
import { uploadPhoto } from "./services/transferService";
import { useTransferFilters } from "./hooks/useTransferFilters";
import ConsolidateTransfersDialog from "./dialogs/ConsolidateTransfersDialog";
import CreateEditDialog from "./dialogs/CreateEditDialog";
import CreateOldMethodDialog from "./dialogs/CreateOldMethodDialog";
import DetailsDialog from "./dialogs/DetailsDialog";
import ReceiveDialog from "./dialogs/ReceiveDialog";
import ShipDialog from "./dialogs/ShipDialog";

const INITIAL_FORM = {
  source_location_id: "",
  destination_location_id: "",
  reference: "",
  notes: "",
  product_lines: [],
};

const INITIAL_OLD_METHOD_FORM = {
  source_location_id: "",
  destination_location_id: "",
  notes: "",
  scanned_items: [],
  product_lines: [],
};

const RELOAD_PROPS = ["transfers", "warehouses", "companyInfo"];

export default function StockTransferPage({
  transfers = [],
  warehouses = [],
  companyInfo = null,
}) {
  const { auth } = usePage().props;
  const currentUser = auth?.user ?? null;
  const mainWarehouseId = warehouses.find((warehouse) => warehouse.warehouse_type === "main_warehouse")?.id || "";

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    operationTypeFilter,
    setOperationTypeFilter,
    fromLocationFilter,
    setFromLocationFilter,
    toLocationFilter,
    setToLocationFilter,
    dateRangeFilter,
    setDateRangeFilter,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    sortBy,
    sortOrder,
    filteredTransfers,
    tabCounts,
    resetKey,
    handleSort,
  } = useTransferFilters(transfers, transfers);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOldMethodDialog, setShowOldMethodDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPicklistDialog, setShowPicklistDialog] = useState(false);
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showConsolidateDialog, setShowConsolidateDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [picklistTransfer, setPicklistTransfer] = useState(null);
  const [shippingTransfer, setShippingTransfer] = useState(null);
  const [receivingTransfer, setReceivingTransfer] = useState(null);
  const [deletingTransfer, setDeletingTransfer] = useState(null);
  const [editingTransfer, setEditingTransfer] = useState(false);
  const [selectedTransfers, setSelectedTransfers] = useState([]);
  const [transferForm, setTransferForm] = useState(INITIAL_FORM);
  const [oldMethodForm, setOldMethodForm] = useState(INITIAL_OLD_METHOD_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: "", description: "" });

  const selectedTransferObjects = useMemo(
    () => transfers.filter((transfer) => selectedTransfers.includes(transfer.id)),
    [selectedTransfers, transfers]
  );
  const consolidationValidation = useMemo(
    () => validateTransferConsolidation(selectedTransferObjects),
    [selectedTransferObjects]
  );
  const consolidationSummary = useMemo(
    () => consolidationValidation.summary || getConsolidationSummary(selectedTransferObjects),
    [consolidationValidation.summary, selectedTransferObjects]
  );

  useEffect(() => {
    setSelectedTransfers([]);
  }, [resetKey]);

  useEffect(() => {
    if (!mainWarehouseId) {
      return;
    }

    setTransferForm((current) => (
      current.source_location_id ? current : { ...current, source_location_id: mainWarehouseId }
    ));
    setOldMethodForm((current) => (
      current.source_location_id ? current : { ...current, source_location_id: mainWarehouseId }
    ));
  }, [mainWarehouseId]);

  useEffect(() => {
    const batchItemsStr = sessionStorage.getItem("batchTransferItems");
    if (!batchItemsStr) {
      return;
    }

    const batchItems = JSON.parse(batchItemsStr);
    setTransferForm((current) => ({
      ...current,
      product_lines: batchItems.map((item) => ({
        variant_id: item.variant_id,
        product_name: item.product?.product_name || item.product?.name,
        variant_name: item.variant?.variant_name,
        quantity_demanded: 1,
        quantity_reserved: 0,
        quantity_done: 0,
        serial_numbers: [],
      })),
    }));
    setShowCreateDialog(true);
    sessionStorage.removeItem("batchTransferItems");
  }, []);

  useEffect(() => {
    const prefillDataStr = sessionStorage.getItem("prefillStockTransfer");
    if (!prefillDataStr) {
      return;
    }

    const prefillData = JSON.parse(prefillDataStr);
    setTransferForm({
      ...INITIAL_FORM,
      source_location_id: prefillData.source_location_id || mainWarehouseId,
      destination_location_id: prefillData.destination_location_id || "",
      reference: prefillData.reference || "",
      notes: prefillData.requested_warehouse_name ? `Transfer to ${prefillData.requested_warehouse_name} as per SR ${prefillData.reference}` : "",
      product_lines: (prefillData.product_lines || []).map((item) => ({
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        quantity_demanded: item.quantity || 1,
        quantity_reserved: 0,
        quantity_done: 0,
        serial_numbers: [],
      })),
    });
    setShowCreateDialog(true);
    sessionStorage.removeItem("prefillStockTransfer");
  }, [mainWarehouseId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const id = Number(params.get("id"));

    if (action === "receive" && id) {
      const transfer = transfers.find((entry) => entry.id === id);
      if (transfer) {
        setReceivingTransfer(transfer);
        setShowReceiveDialog(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [transfers]);

  const refreshData = () => {
    router.reload({
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
    });
  };

  const showError = (description, title = "Error") => {
    setAlertMessage({ title, description });
    setShowAlert(true);
  };

  const resetForm = () => {
    setTransferForm({ ...INITIAL_FORM, source_location_id: mainWarehouseId });
    setSelectedTransfer(null);
    setEditingTransfer(false);
  };

  const resetOldMethodForm = () => {
    setOldMethodForm({ ...INITIAL_OLD_METHOD_FORM, source_location_id: mainWarehouseId });
  };

  const searchTransferProducts = async ({ sourceLocationId, query }) => {
    const response = await axios.get(route("stock-transfers.search-products"), {
      params: { sourceLocationId, query },
    });

    return response.data;
  };

  const fetchTransferProductInventory = async ({ sourceLocationId, variantId }) => {
    const response = await axios.get(route("stock-transfers.variant-inventory"), {
      params: { sourceLocationId, variantId },
    });

    return response.data;
  };

  const lookupInventoryItemByBarcode = async (barcode) => {
    const response = await axios.get(route("stock-transfers.lookup-inventory-item"), {
      params: { barcode },
    });

    return response.data;
  };

  const handleCreateOldMethodTransfer = async () => {
    if (!oldMethodForm.source_location_id || !oldMethodForm.destination_location_id) {
      showError("Please fill in all required fields.", "Validation Error");
      return;
    }

    if ((oldMethodForm.scanned_items || []).length === 0) {
      showError("Please scan at least one product.", "No Products");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(route("stock-transfers.store-old-method"), {
        source_location_id: oldMethodForm.source_location_id,
        destination_location_id: oldMethodForm.destination_location_id,
        notes: oldMethodForm.notes,
        product_lines: (oldMethodForm.product_lines || []).map((line) => ({
          inventory_id: line.inventory_id,
        })),
      });
      setShowOldMethodDialog(false);
      resetOldMethodForm();
      refreshData();
      setAlertMessage({ title: "Success", description: "Transfer created in picked status." });
      setShowAlert(true);
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to create transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.source_location_id || !transferForm.destination_location_id) {
      showError("Please fill in all required fields.", "Validation Error");
      return;
    }

    if (transferForm.product_lines.length === 0) {
      showError("Please add at least one product.", "No Products");
      return;
    }

    if (editingTransfer) {
      showError("Editing existing transfers is temporarily disabled while the transfer schema is being migrated.", "Edit Unavailable");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(route("stock-transfers.store"), {
        ...transferForm,
        product_lines: (transferForm.product_lines || []).flatMap((line) =>
          (line.serial_numbers || []).map((serial) => ({
            inventory_id: serial.inventory_id,
            is_picked: false,
            is_shipped: false,
            is_received: false,
          }))
        ),
      });
      setShowCreateDialog(false);
      resetForm();
      refreshData();
      setAlertMessage({ title: "Success", description: "Transfer created and items reserved." });
      setShowAlert(true);
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to create transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPickup = async (scannedItems) => {
    if (!picklistTransfer) {
      showError("No transfer selected for pickup.");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(route("stock-transfers.pick", picklistTransfer.id), { scannedItems });
      setShowPicklistDialog(false);
      setPicklistTransfer(null);
      refreshData();
      setAlertMessage({ title: "Pickup Confirmed", description: `All ${scannedItems.length} items scanned and picked.` });
      setShowAlert(true);
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to confirm pickup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShipPhotoUpload = async (file) => uploadPhoto(file);

  const handleConfirmShip = async (logisticsData) => {
    if (!shippingTransfer) {
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(route("stock-transfers.ship", shippingTransfer.id), logisticsData);
      setShowShipDialog(false);
      setShippingTransfer(null);
      refreshData();
      setAlertMessage({ title: "Transfer Shipped", description: `${shippingTransfer.transfer_number} marked as shipped.` });
      setShowAlert(true);
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to ship transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeReceive = async (finalizeData) => {
    if (!receivingTransfer) {
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(route("stock-transfers.receive", receivingTransfer.id), finalizeData);
      setShowReceiveDialog(false);
      setReceivingTransfer(null);
      refreshData();
      setAlertMessage({
        title: "Receiving Finalized",
        description: `Transfer ${receivingTransfer.transfer_number} receiving has been saved.`,
      });
      setShowAlert(true);
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to finalize receiving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTransfer) {
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.delete(route("stock-transfers.destroy", deletingTransfer.id));
      setShowDeleteConfirm(false);
      setDeletingTransfer(null);
      refreshData();
      setAlertMessage({ title: "Success", description: "Transfer deleted and inventory items released." });
      setShowAlert(true);
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to delete transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmConsolidation = async () => {
    if (!consolidationValidation.isEligible) {
      showError(consolidationValidation.reason || "Selected transfers cannot be consolidated.", "Consolidation Unavailable");
      return;
    }

    setIsConsolidating(true);
    try {
      const result = await consolidateTransfers({ transfers: selectedTransferObjects, currentUser });
      refreshData();
      setShowConsolidateDialog(false);
      setSelectedTransfers([]);
      setAlertMessage({
        title: "Consolidation Complete",
        description: `Created consolidated transfer ${result.masterTransfer.transfer_number} from ${result.sourceTransferNumbers.length} source transfer(s).`,
      });
      setShowAlert(true);
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to consolidate selected transfers.", "Consolidation Failed");
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleSelectAll = () => {
    setSelectedTransfers((current) =>
      current.length === filteredTransfers.length ? [] : filteredTransfers.map((transfer) => transfer.id)
    );
  };

  return (
    <AppShell title="Stock Transfers">
      <Head title="Stock Transfers" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Stock Transfer Management</h2>
            <p className="mt-1 text-muted-foreground">Manage all stock movements and transfers</p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              {selectedTransfers.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="text-sm">
                      <Printer className="mr-2 h-4 w-4" />
                      Print ({selectedTransfers.length})
                      <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-1">
                    <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => printBatchPicklists(selectedTransferObjects, companyInfo)}>
                      Print Picklists
                    </button>
                    <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => printBatchManifests(selectedTransferObjects, companyInfo)}>
                      Print Manifests
                    </button>
                    <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => printBatchParcelLabels(selectedTransferObjects, companyInfo)}>
                      Print Parcel Labels
                    </button>
                  </PopoverContent>
                </Popover>
              ) : null}

              {selectedTransfers.length > 0 ? (
                <Button
                  variant="outline"
                  className="text-sm"
                  onClick={() => setShowConsolidateDialog(true)}
                  disabled={!consolidationValidation.isEligible || isConsolidating}
                  title={consolidationValidation.reason || "Consolidate selected transfers"}
                >
                  <Layers3 className="mr-2 h-4 w-4" />
                  Consolidate ({selectedTransfers.length})
                </Button>
              ) : null}

              <Button variant="outline" className="text-sm" disabled>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Transfer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetOldMethodForm();
                  setShowOldMethodDialog(true);
                }}
              >
                Create Transfer(old method)
              </Button>
            </div>

            {selectedTransfers.length > 0 && !consolidationValidation.isEligible ? (
              <p className="max-w-sm text-right text-xs text-muted-foreground">{consolidationValidation.reason}</p>
            ) : null}
          </div>
        </div>

        <TransferFiltersCard
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          operationTypeFilter={operationTypeFilter}
          setOperationTypeFilter={setOperationTypeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateRangeFilter={dateRangeFilter}
          setDateRangeFilter={setDateRangeFilter}
          fromLocationFilter={fromLocationFilter}
          setFromLocationFilter={setFromLocationFilter}
          toLocationFilter={toLocationFilter}
          setToLocationFilter={setToLocationFilter}
          customDateFrom={customDateFrom}
          setCustomDateFrom={setCustomDateFrom}
          customDateTo={customDateTo}
          setCustomDateTo={setCustomDateTo}
          warehouses={warehouses}
          counts={tabCounts}
        />

        <TransferTable
          transfers={filteredTransfers}
          isLoading={false}
          selectedTransfers={selectedTransfers}
          onSelectAll={handleSelectAll}
          onSelectTransfer={(transferId) =>
            setSelectedTransfers((current) =>
              current.includes(transferId) ? current.filter((id) => id !== transferId) : [...current, transferId]
            )
          }
          onView={(transfer) => {
            setSelectedTransfer(transfer);
            setShowDetailsDialog(true);
          }}
          onEdit={() => showError("Editing existing transfers is temporarily disabled while the transfer schema is being migrated.", "Edit Unavailable")}
          onDelete={(transfer) => {
            setDeletingTransfer(transfer);
            setShowDeleteConfirm(true);
          }}
          onPickItems={(transfer) => {
            setPicklistTransfer(transfer);
            setShowPicklistDialog(true);
          }}
          onMarkTransit={(transfer) => {
            setShippingTransfer(transfer);
            setShowShipDialog(true);
          }}
          onReceive={(transfer) => {
            setReceivingTransfer(transfer);
            setShowReceiveDialog(true);
          }}
          onPrintPicklist={(transfer) => printStockTransferPicklist(transfer, companyInfo)}
          onPrintManifest={(transfer) => printTransferManifest(transfer, companyInfo)}
          onPrintParcelLabel={(transfer) => printParcelLabel(transfer, companyInfo)}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </div>

      <CreateEditDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            resetForm();
          }
        }}
        editingTransfer={editingTransfer}
        transferForm={transferForm}
        setTransferForm={setTransferForm}
        onSubmit={handleCreateTransfer}
        warehouses={warehouses}
        searchTransferProducts={searchTransferProducts}
        fetchTransferProductInventory={fetchTransferProductInventory}
      />

      <CreateOldMethodDialog
        open={showOldMethodDialog}
        onOpenChange={(open) => {
          setShowOldMethodDialog(open);
          if (!open) {
            resetOldMethodForm();
          }
        }}
        warehouses={warehouses}
        form={oldMethodForm}
        setForm={setOldMethodForm}
        onScan={lookupInventoryItemByBarcode}
        onSubmit={handleCreateOldMethodTransfer}
        isSubmitting={isSubmitting}
      />

      <DetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        selectedTransfer={selectedTransfer}
      />

      <PicklistScanDialog
        open={showPicklistDialog}
        onOpenChange={(open) => {
          setShowPicklistDialog(open);
          if (!open) {
            setPicklistTransfer(null);
          }
        }}
        selectedTransfer={picklistTransfer}
        onConfirmPickup={handleConfirmPickup}
        isProcessing={isSubmitting}
      />

      <ShipDialog
        open={showShipDialog}
        onOpenChange={(open) => {
          setShowShipDialog(open);
          if (!open) {
            setShippingTransfer(null);
          }
        }}
        shippingTransfer={shippingTransfer}
        onConfirmShip={handleConfirmShip}
        isShipping={isSubmitting}
        onPhotoUpload={handleShipPhotoUpload}
        uploadingPhoto={isSubmitting}
      />

      <ConsolidateTransfersDialog
        open={showConsolidateDialog}
        onOpenChange={setShowConsolidateDialog}
        onConfirm={handleConfirmConsolidation}
        isSubmitting={isConsolidating}
        summary={consolidationSummary}
        warehouses={warehouses}
      />

      <ReceiveDialog
        open={showReceiveDialog}
        onOpenChange={(open) => {
          setShowReceiveDialog(open);
          if (!open) {
            setReceivingTransfer(null);
          }
        }}
        receivingTransfer={receivingTransfer}
        currentUser={currentUser}
        onFinalizeReceive={handleFinalizeReceive}
        isReceiving={isSubmitting}
        onPhotoUpload={handleShipPhotoUpload}
        lookupInventoryItemByBarcode={lookupInventoryItemByBarcode}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Transfer"
        description={`Are you sure you want to delete transfer ${deletingTransfer?.transfer_number}? This will return all associated items to 'available' status.`}
        confirmLabel="Delete & Release Items"
        onConfirm={confirmDelete}
      />

      <AlertMessage
        open={showAlert}
        onOpenChange={setShowAlert}
        title={alertMessage.title}
        description={alertMessage.description}
      />
    </AppShell>
  );
}
