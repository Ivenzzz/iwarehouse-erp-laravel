import { useMemo, useState } from "react";
import { GRN_STEPS } from "../constants/grnSteps";
import { useAddPurchase } from "./useAddPurchase";
import { useGRNData } from "./useGRNData";
import { useGRNEncoding } from "./useGRNEncoding";
import { buildGRNData, buildSubmitDeclaredItemsList, getGRNWarehouse } from "../utils/grnTransforms";
import { printBarcodes, printGRN } from "@/features/goodsreceipt/lib/services/grnPrintService";
import { printQRStickers } from "@/features/goodsreceipt/lib/services/grnQRPrintService";
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
    productMasters: data.productMasters,
    variants: data.variants,
  });

  const handleSelectDR = (dr) => {
    setSelectedDR(dr);
    encoding.resetEncodingState();
    setShowEncodingDialog(true);
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
          categories: data.categories,
          subcategories: data.subcategories,
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
      handleViewDetails: (grn) => {
        setSelectedGRN(grn);
        setShowDetailsDialog(true);
      },
      handlePrintGRN: (grn, dr, supplier, warehouse, po) =>
        printGRN({
          grn,
          dr,
          supplier,
          warehouse,
          po,
          companyInfo: data.companyInfo,
          productMasters: data.productMasters,
          variants: data.variants,
          brands: data.brands,
        }),
      handlePrintBarcodes: (grn) =>
        printBarcodes({
          grn,
          variants: data.variants,
          productMasters: data.productMasters,
          brands: data.brands,
          categories: data.categories,
        }),
      handlePrintQRStickers: (grn) =>
        printQRStickers({
          grn,
          variants: data.variants,
          productMasters: data.productMasters,
          brands: data.brands,
          categories: data.categories,
          subcategories: data.subcategories,
        }),
    }),
    [data, encoding.declaredItemsList, encoding.encodedItems]
  );

  return {
    data,
    addPurchase,
    encoding,
    actions,
    constants: { GRN_STEPS },
    dialogs: {
      showEncodingDialog,
      setShowEncodingDialog,
      selectedDR,
      showDetailsDialog,
      setShowDetailsDialog,
      selectedGRN,
      alertDialog,
      setAlertDialog,
      toast,
      setToast,
      loadingModal,
    },
  };
}

