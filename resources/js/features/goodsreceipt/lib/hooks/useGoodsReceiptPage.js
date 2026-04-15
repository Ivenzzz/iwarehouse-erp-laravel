import { useMemo, useState } from "react";
import { GRN_STEPS } from "../constants/grnSteps";
import { useAddPurchase } from "./useAddPurchase";
import { useGRNData } from "./useGRNData";
import { useGRNEncoding } from "./useGRNEncoding";
import { buildGRNData, buildSubmitDeclaredItemsList, getGRNWarehouse } from "../utils/grnTransforms";
import { printBarcodes, printGRN } from "@/features/goodsreceipt/lib/services/grnPrintService";
import { printQRStickers } from "@/features/goodsreceipt/lib/services/grnQRPrintService";
import { fetchGoodsReceiptDetail } from "../services/goodsReceiptService";
import { markDeliveryReceiptComplete, validateDuplicates } from "../services/goodsReceiptService";

export function useGoodsReceiptPage() {
  const data = useGRNData();
  const [showEncodingDialog, setShowEncodingDialog] = useState(false);
  const [selectedDR, setSelectedDR] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [alertDialog, setAlertDialog] = useState({ open: false, title: "", description: "" });
  const [toast, setToast] = useState({ open: false, title: "", description: "", variant: "success" });
  const [loadingModal, setLoadingModal] = useState({ open: false, currentStep: 0 });

  const addPurchase = useAddPurchase({
    mainWarehouse: data.mainWarehouse,
    currentUser: data.currentUser,
    refreshPage: data.refreshPage,
  });

  const encoding = useGRNEncoding({
    selectedDR,
    showEncodingDialog,
    variants: data.variants,
  });

  const [isPreparingEncoding, setIsPreparingEncoding] = useState(false);
  const [isLoadingGrnDetail, setIsLoadingGrnDetail] = useState(false);

  const handleSelectDR = async (dr) => {
    if (!dr?.id) return;

    try {
      setIsPreparingEncoding(true);
      await data.loadCatalogForDR(dr.id);
      setSelectedDR(dr);
      encoding.resetEncodingState();
      setShowEncodingDialog(true);
    } catch (error) {
      setAlertDialog({
        open: true,
        title: "Catalog Load Error",
        description: `Failed to load product catalog for encoding: ${error?.response?.data?.message || error.message}`,
      });
    } finally {
      setIsPreparingEncoding(false);
    }
  };

  const fetchGrnDetailOrThrow = async (grn) => {
    if (!grn?.id) throw new Error("Invalid goods receipt record.");
    setIsLoadingGrnDetail(true);
    try {
      const detail = await fetchGoodsReceiptDetail(grn.id);
      if (!detail) throw new Error("No goods receipt detail returned by server.");
      return detail;
    } finally {
      setIsLoadingGrnDetail(false);
    }
  };

  const handleSubmitGRN = async () => {
    if (encoding.encodedItems.length === 0) {
      setAlertDialog({
        open: true,
        title: "Validation Error",
        description: "Please encode at least one unit before submitting the GRN.",
      });
      return;
    }

    setLoadingModal({ open: true, currentStep: 0 });

    try {
      const duplicates = await validateDuplicates(
        encoding.encodedItems.map((item) => ({
          identifiers: {
            imei1: item.imei1 || "",
            imei2: item.imei2 || "",
            serial_number: item.serial_number || "",
          },
        }))
      );

      if (duplicates.length > 0) {
        setLoadingModal({ open: false, currentStep: 0 });
        setAlertDialog({
          open: true,
          title: "Duplicate Items Found in Inventory",
          description: `Cannot submit GRN:\n${duplicates
            .map((duplicate) => `Row ${duplicate.rowIndex}: ${duplicate.type} "${duplicate.value}" exists (GRN: ${duplicate.existingGRN})`)
            .join("\n")}`,
        });
        return;
      }

      setLoadingModal({ open: true, currentStep: 1 });
      const grnNumber = `GRN-${Date.now().toString().slice(-8)}`;
      const grnDate = new Date().toISOString().split("T")[0];
      const submitDR = selectedDR;
      const submitDeclaredItemsList = buildSubmitDeclaredItemsList(submitDR, encoding.declaredItemsList);
      const assignedWarehouseId = getGRNWarehouse(submitDR.destination_warehouse_id, data.warehouses, data.mainWarehouse);
      const assignedWarehouse = data.warehouses.find((warehouse) => warehouse.id === assignedWarehouseId);

      if (!assignedWarehouseId) {
        setLoadingModal({ open: false, currentStep: 0 });
        setAlertDialog({
          open: true,
          title: "Warehouse Error",
          description: "No main warehouse found in the system.",
        });
        return;
      }

      await data.createGRNMutation.mutateAsync(
        buildGRNData({
          selectedDR: submitDR,
          encodedItems: encoding.encodedItems,
          declaredItemsList: submitDeclaredItemsList,
          currentUser: data.currentUser,
          grnNumber,
          grnDate,
          assignedWarehouse,
          variants: data.variants,
          productMasters: data.productMasters,
        })
      );

      setLoadingModal({ open: true, currentStep: 2 });
      await markDeliveryReceiptComplete(submitDR.id);
      setLoadingModal({ open: true, currentStep: 3 });
      data.refreshPage();

      setLoadingModal({ open: false, currentStep: 0 });
      setToast({
        open: true,
        title: "GRN Created Successfully",
        description: `GRN ${grnNumber} created with ${encoding.encodedItems.length} units.`,
        variant: "success",
      });
      setShowEncodingDialog(false);
      setSelectedDR(null);
      encoding.resetEncodingState();
      data.clearCatalog();
    } catch (error) {
      setLoadingModal({ open: false, currentStep: 0 });
      setAlertDialog({
        open: true,
        title: "Submission Error",
        description: `Failed to submit GRN: ${error?.response?.data?.message || error.message}`,
      });
    }
  };

  const actions = useMemo(
    () => ({
      handleSelectDR,
      handleSubmitGRN,
      refreshPage: data.refreshPage,
      handleViewDetails: async (grn) => {
        try {
          const detail = await fetchGrnDetailOrThrow(grn);
          setSelectedGRN(detail);
          setShowDetailsDialog(true);
        } catch (error) {
          setAlertDialog({
            open: true,
            title: "Details Error",
            description: error?.response?.data?.message || error.message || "Failed to load goods receipt details.",
          });
        }
      },
      handlePrintGRN: async (grn) => {
        try {
          const detail = await fetchGrnDetailOrThrow(grn);
          printGRN({
            grn: detail,
            companyInfo: data.companyInfo,
          });
        } catch (error) {
          setAlertDialog({
            open: true,
            title: "Print Error",
            description: error?.response?.data?.message || error.message || "Failed to load goods receipt for printing.",
          });
        }
      },
      handlePrintBarcodes: async (grn) => {
        try {
          const detail = await fetchGrnDetailOrThrow(grn);
          printBarcodes({ grn: detail });
        } catch (error) {
          setAlertDialog({
            open: true,
            title: "Print Error",
            description: error?.response?.data?.message || error.message || "Failed to load goods receipt for barcode printing.",
          });
        }
      },
      handlePrintQRStickers: async (grn) => {
        try {
          const detail = await fetchGrnDetailOrThrow(grn);
          await printQRStickers({ grn: detail });
        } catch (error) {
          setAlertDialog({
            open: true,
            title: "Print Error",
            description: error?.response?.data?.message || error.message || "Failed to load goods receipt for QR sticker printing.",
          });
        }
      },
    }),
    [data, encoding.declaredItemsList, encoding.encodedItems]
  );

  const handleEncodingDialogOpenChange = (open) => {
    setShowEncodingDialog(open);
    if (!open) {
      setSelectedDR(null);
      data.clearCatalog();
      encoding.resetEncodingState();
    }
  };

  return {
    data,
    addPurchase,
    encoding,
    actions,
    constants: { GRN_STEPS },
    dialogs: {
      showEncodingDialog,
      setShowEncodingDialog: handleEncodingDialogOpenChange,
      selectedDR,
      showDetailsDialog,
      setShowDetailsDialog,
      selectedGRN,
      isPreparingEncoding,
      isLoadingGrnDetail,
      alertDialog,
      setAlertDialog,
      toast,
      setToast,
      loadingModal,
    },
  };
}
