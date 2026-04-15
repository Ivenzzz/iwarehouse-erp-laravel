import { useState, useMemo, useCallback, useEffect } from "react";
import axios from "axios";
import {
  createInitialFormData,
  checkAllRequiredUploaded,
  getUploadedCount,
} from "../deliveryReceiptService";

const getVariantAttributeValue = (variant, keys) => {
  const attributes = variant?.attributes || {};
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const getLineActualQuantity = (item) => parseInt(item.actual_quantity || 0, 10) || 0;
const getLineTotalValue = (item) => {
  const qty = getLineActualQuantity(item);
  const cost = parseFloat(item.unit_cost || 0) || 0;
  return qty * cost;
};

export function useDRForm({
  mainWarehouse,
  productMasters,
  showCreateDialog,
  currentUser,
  purchaseOrders,
  suppliers,
}) {
  const [formData, setFormData] = useState(() => createInitialFormData(mainWarehouse?.id || ""));
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragStates, setDragStates] = useState({});
  const [productSearchOpen, setProductSearchOpen] = useState({});
  const [blindMode, setBlindMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [alertDialog, setAlertDialog] = useState({ open: false, title: "", description: "" });

  const formatWarehouseAddress = useCallback((warehouse) => {
    if (!warehouse?.address) return warehouse?.name || "";
    const address = warehouse.address;
    if (typeof address === "string") return address;
    const { street, city, province } = address || {};
    return [street, city, province].filter(Boolean).join(", ");
  }, []);

  const productMasterById = useMemo(
    () => new Map(productMasters.map((pm) => [pm.id, pm])),
    [productMasters]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => String(s.id) === String(formData.supplier_id)) || null,
    [formData.supplier_id, suppliers]
  );

  useEffect(() => {
    if (mainWarehouse && !formData.destination_warehouse_id && showCreateDialog) {
      setFormData((prev) => ({
        ...prev,
        destination_warehouse_id: mainWarehouse.id,
        destination: formatWarehouseAddress(mainWarehouse)
      }));
    }
  }, [mainWarehouse, showCreateDialog, formData.destination_warehouse_id, formatWarehouseAddress]);

  const allRequiredUploaded = checkAllRequiredUploaded(formData.uploads);
  const uploadedCount = getUploadedCount(formData.uploads);

  const resetForm = useCallback(() => {
    setFormData(createInitialFormData(mainWarehouse?.id || ""));
    setUploadProgress({});
    setProductSearchOpen({});
    setBlindMode(true);
    setSelectedPO(null);
  }, [mainWarehouse]);

  const handlePOSelect = useCallback(async (poId) => {
    const po = purchaseOrders.find((row) => String(row.id) === String(poId)) || null;
    setSelectedPO(po);
    const destAddress = formatWarehouseAddress(mainWarehouse);

    if (!po) {
      setFormData((prev) => ({
        ...prev,
        po_id: "",
        payment_term_id: "",
        supplier_id: "",
        declared_items: [],
        route_origin: "",
        destination: destAddress
      }));
      return;
    }

    const items = (po.items_json?.items || po.items || []).map((item) => {
      const requestedSpec = item.product_spec || {};
      const pm = productMasterById.get(item.product_master_id);
      return {
        product_master_id: item.product_master_id || pm?.id || "",
        master_sku: item.master_sku || pm?.master_sku || "",
        product_name: item.product_name || pm?.name || "",
        product_model: item.model || pm?.model || "",
        brand_name: item.brand || pm?.brand_name || "",
        category_name: item.category_name || pm?.category_name || "",
        subcategory_name: item.subcategory_name || pm?.subcategory_name || "",
        requested_ram: requestedSpec.ram || "",
        requested_rom: requestedSpec.rom || "",
        requested_condition: requestedSpec.condition || "",
        other_specs: requestedSpec.other_specs || {},
        declared_quantity: item.quantity || 0,
        actual_quantity: "",
        unit_cost: item.unit_price || 0,
        cash_price: item.cash_price ?? "",
        srp_price: item.srp_price ?? "",
        total_value: 0,
        variance_flag: false,
        variance_notes: "",
        is_extra: false,
      };
    });

    setFormData((prev) => ({
      ...prev,
      po_id: po.id,
      payment_term_id: po.payment_term_id
        ? String(po.payment_term_id)
        : (po.financials_json?.payment_term_id ? String(po.financials_json.payment_term_id) : ""),
      supplier_id: po.supplier_id || "",
      declared_items: items,
      route_origin: po.supplier?.legal_tax_compliance?.registered_address || "",
      destination: destAddress,
    }));
  }, [purchaseOrders, formatWarehouseAddress, mainWarehouse, productMasterById]);

  const handleSupplierSelect = useCallback(async (supplierId) => {
    const supplier = suppliers.find((s) => String(s.id) === String(supplierId));
    const originAddress = supplier?.legal_tax_compliance?.registered_address || "";
    setFormData((prev) => ({ ...prev, supplier_id: supplierId, route_origin: originAddress }));
  }, [suppliers]);

  const handleAddItem = useCallback((selectedVariant) => {
    const productMasterId = selectedVariant?.product_master_id || "";
    if (!productMasterId) {
      setAlertDialog({ open: true, title: "Validation Error", description: "Please select a product variant." });
      return;
    }
    const productMaster = productMasterById.get(productMasterId);
    const newItem = {
      product_master_id: productMasterId,
      master_sku: productMaster?.master_sku || "",
      product_name: selectedVariant?.product_name || productMaster?.name || "",
      product_model: selectedVariant?.product_model || productMaster?.model || "",
      brand_name: selectedVariant?.brand_name || productMaster?.brand_name || "",
      category_name: productMaster?.category_name || "",
      subcategory_name: productMaster?.subcategory_name || "",
      model_code: selectedVariant?.model_code || getVariantAttributeValue(selectedVariant, ["model_code", "Model Code", "modelCode"]),
      requested_ram: selectedVariant?.requested_ram || getVariantAttributeValue(selectedVariant, ["RAM", "ram"]),
      requested_rom: selectedVariant?.requested_rom || getVariantAttributeValue(selectedVariant, ["ROM", "rom", "Storage", "storage"]),
      requested_condition: selectedVariant?.requested_condition || selectedVariant?.condition || "",
      other_specs: {},
      declared_quantity: 0,
      actual_quantity: 0,
      unit_cost: 0,
      cash_price: "",
      srp_price: "",
      total_value: 0,
      variance_flag: false,
      variance_notes: formData.po_id ? "Additional item" : "",
      is_extra: Boolean(formData.po_id),
    };
    setFormData((prev) => ({ ...prev, declared_items: [...prev.declared_items, newItem] }));
  }, [formData.po_id, productMasterById]);

  const handleItemChange = useCallback((index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.declared_items];
      const updatedItem = { ...newItems[index], [field]: value };
      if (field === "product_master_id") {
        updatedItem.product_name = productMasterById.get(value)?.name || "";
      }
      updatedItem.total_value = getLineTotalValue(updatedItem);
      updatedItem.variance_flag = (updatedItem.declared_quantity || 0) !== getLineActualQuantity(updatedItem);
      newItems[index] = updatedItem;
      return { ...prev, declared_items: newItems };
    });
  }, [productMasterById]);

  const handleRemoveItem = useCallback((index) => {
    setFormData((prev) => ({ ...prev, declared_items: prev.declared_items.filter((_, i) => i !== index) }));
  }, []);

  const handleFileUpload = useCallback(async (uploadType, file) => {
    if (!file) return;
    try {
      setUploadProgress((prev) => ({ ...prev, [uploadType]: 0 }));
      const fileRecord = {
        file,
        preview_url: URL.createObjectURL(file),
        file_name: file.name || null,
      };
      setUploadProgress((prev) => ({ ...prev, [uploadType]: 100 }));

      if (uploadType === "box_photos") {
        setFormData((prev) => ({
          ...prev,
          uploads: {
            ...prev.uploads,
            box_photos: [...(prev.uploads.box_photos || []), fileRecord],
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          uploads: {
            ...prev.uploads,
            [uploadType]: fileRecord,
          },
        }));
      }
    } catch {
      setAlertDialog({ open: true, title: "Upload Error", description: "File upload failed." });
    } finally {
      setTimeout(() => {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[uploadType];
          return next;
        });
      }, 1000);
    }
  }, []);

  const handleDragEnter = useCallback((e, uploadType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragStates((prev) => ({ ...prev, [uploadType]: true }));
  }, []);

  const handleDragLeave = useCallback((e, uploadType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragStates((prev) => ({ ...prev, [uploadType]: false }));
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e, uploadType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragStates((prev) => ({ ...prev, [uploadType]: false }));
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (uploadType === "box_photos") {
        for (const file of files) await handleFileUpload(uploadType, file);
      } else {
        await handleFileUpload(uploadType, files[0]);
      }
    }
  }, [handleFileUpload]);

  const handleRemoveUpload = useCallback((uploadType, index = null) => {
    if (uploadType === "box_photos" && index !== null) {
      setFormData((prev) => ({ ...prev, uploads: { ...prev.uploads, box_photos: prev.uploads.box_photos.filter((_, i) => i !== index) } }));
    } else {
      setFormData((prev) => ({ ...prev, uploads: { ...prev.uploads, [uploadType]: null } }));
    }
  }, []);

  const handleCreateDR = useCallback(async () => {
    if (!formData.supplier_id) {
      setAlertDialog({ open: true, title: "Validation Error", description: "Please select a Supplier." });
      return false;
    }
    if (!formData.vendor_dr_number) {
      setAlertDialog({ open: true, title: "Validation Error", description: "Please enter Vendor DR Number." });
      return false;
    }
    if (formData.declared_items.length === 0) {
      setAlertDialog({ open: true, title: "Validation Error", description: "Please add at least one item." });
      return false;
    }

    const payload = new FormData();
    if (formData.po_id) {
      payload.append("po_id", String(formData.po_id));
    }
    payload.append("supplier_id", String(Number(formData.supplier_id)));
    if (formData.payment_term_id) {
      payload.append("payment_term_id", String(Number(formData.payment_term_id)));
    }
    payload.append("dr_number", formData.vendor_dr_number);
    payload.append("reference_number", [formData.reference_number_1, formData.reference_number_2].filter(Boolean).join(" / ") || "");
    payload.append("date_received", formData.receipt_date);
    payload.append("logistics[logistics_company]", formData.logistics_company || "");
    payload.append("logistics[waybill_number]", formData.waybill_number || "");
    payload.append("logistics[driver_name]", formData.driver_name || "");
    payload.append("logistics[driver_contact]", formData.driver_contact || "");
    payload.append("logistics[origin]", formData.route_origin || "");
    payload.append("logistics[destination]", formData.destination || "");
    payload.append("logistics[freight_cost]", String(parseFloat(formData.freight_cost || 0) || 0));
    payload.append("summary[box_count_declared]", String(parseInt(formData.box_count_declared || 0, 10) || 0));
    payload.append("summary[box_count_received]", String(parseInt(formData.box_count_received || 0, 10) || 0));
    payload.append("summary[variance_notes]", formData.variance_notes || "");
    payload.append("uploads[uploads_complete]", allRequiredUploaded ? "1" : "0");
    payload.append("uploads[purchase_file_url]", "");

    if (formData.uploads?.vendor_dr_url?.file) payload.append("uploads[vendor_dr_file]", formData.uploads.vendor_dr_url.file);
    if (formData.uploads?.waybill_url?.file) payload.append("uploads[waybill_file]", formData.uploads.waybill_url.file);
    if (formData.uploads?.freight_invoice_url?.file) payload.append("uploads[freight_invoice_file]", formData.uploads.freight_invoice_url.file);
    if (formData.uploads?.driver_id_url?.file) payload.append("uploads[driver_id_file]", formData.uploads.driver_id_url.file);

    (formData.uploads?.box_photos || []).forEach((entry) => {
      if (entry?.file) {
        payload.append("uploads[box_photos][]", entry.file);
      }
    });

    formData.declared_items.forEach((item, index) => {
      payload.append(`declared_items[${index}][product_master_id]`, String(Number(item.product_master_id)));
      payload.append(`declared_items[${index}][expected_quantity]`, String(parseInt(item.declared_quantity || 0, 10) || 0));
      payload.append(`declared_items[${index}][actual_quantity]`, String(parseInt(item.actual_quantity || 0, 10) || 0));
      payload.append(`declared_items[${index}][unit_cost]`, String(parseFloat(item.unit_cost || 0) || 0));
      payload.append(`declared_items[${index}][cash_price]`, String(parseFloat(item.cash_price || 0) || 0));
      payload.append(`declared_items[${index}][srp_price]`, String(parseFloat(item.srp_price || 0) || 0));
      payload.append(`declared_items[${index}][variance_notes]`, item.variance_notes || "");
      payload.append(`declared_items[${index}][product_spec][model_code]`, item.model_code || "");
      payload.append(`declared_items[${index}][product_spec][ram]`, item.requested_ram || "");
      payload.append(`declared_items[${index}][product_spec][rom]`, item.requested_rom || "");
      payload.append(`declared_items[${index}][product_spec][condition]`, item.requested_condition || "");
    });

    setIsSubmitting(true);
    try {
      await axios.post(route("delivery-receipts.store"), payload, {
        headers: { "Content-Type": "multipart/form-data", Accept: "application/json" },
      });
      setAlertDialog({ open: true, title: "Success", description: `Delivery Receipt ${formData.vendor_dr_number} created successfully.` });
      return true;
    } catch (error) {
      const firstError = error?.response?.data?.errors
        ? Object.values(error.response.data.errors || {})[0]
        : null;
      const message = Array.isArray(firstError) ? firstError[0] : firstError;
      setAlertDialog({ open: true, title: "Error", description: message || "Failed to create Delivery Receipt." });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [allRequiredUploaded, formData]);

  return {
    formData,
    setFormData,
    uploadProgress,
    dragStates,
    productSearchOpen,
    setProductSearchOpen,
    blindMode,
    setBlindMode,
    alertDialog,
    setAlertDialog,
    selectedPO,
    allRequiredUploaded,
    uploadedCount,
    productMasterById,
    selectedSupplier,
    resetForm,
    handlePOSelect,
    handleSupplierSelect,
    handleAddItem,
    handleItemChange,
    handleRemoveItem,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleRemoveUpload,
    handleCreateDR,
    isSubmitting,
  };
}
