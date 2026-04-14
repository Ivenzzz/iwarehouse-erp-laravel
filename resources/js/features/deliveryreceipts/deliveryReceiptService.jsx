export const getLocalDatetime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const createInitialFormData = (mainWarehouseId = '') => ({
  po_id: '',
  vendor_dr_number: '',
  payment_terms: '',
  reference_number_1: '', 
  reference_number_2: '', 
  receipt_date: getLocalDatetime(),
  logistics_company: '',
  waybill_number: '',
  driver_name: '',
  driver_contact: '',
  route_origin: '', 
  destination_warehouse_id: mainWarehouseId,
  freight_cost: '',
  dr_value: '',
  box_count_declared: '',
  box_count_received: '',
  declared_items: [],
  uploads: {
    vendor_dr_url: '',
    waybill_url: '',
    freight_invoice_url: '',
    box_photos: [],
    driver_id_url: ''
  },
  variance_notes: '',
  notes: ''
});

export const requiredUploads = [
  { key: 'vendor_dr_url', label: 'Vendor DR/Invoice PDF', accept: '.pdf,image/*', icon: 'FileText' },
  { key: 'waybill_url', label: 'Waybill/POD PDF', accept: '.pdf,image/*', icon: 'Truck' },
  { key: 'freight_invoice_url', label: 'Freight Invoice PDF', accept: '.pdf,image/*', icon: 'FileText' },
  { key: 'box_photos', label: 'Box Photos', accept: 'image/*', multiple: true, icon: 'ImageIcon' }
];

export const optionalUploads = [
  { key: 'driver_id_url', label: "Driver's ID (Optional)", accept: '.pdf,image/*', icon: 'ImageIcon' }
];

export const checkAllRequiredUploaded = (uploads) => {
  return requiredUploads.every(upload => {
    if (upload.key === 'box_photos') {
      return uploads[upload.key]?.length > 0;
    }
    return uploads[upload.key];
  });
};

export const getUploadedCount = (uploads) => {
  return requiredUploads.filter(upload => {
    if (upload.key === 'box_photos') {
      return uploads[upload.key]?.length > 0;
    }
    return uploads[upload.key];
  }).length;
};

export const buildDRPayload = (formData, selectedPO, currentUser, selectedSupplier) => {
  const supplierName =
    selectedSupplier?.master_profile?.trade_name ||
    selectedSupplier?.master_profile?.legal_business_name ||
    selectedSupplier?.supplier_code ||
    "";

  const declaredItems = formData.declared_items.map((item) => {
    const expectedQuantity = parseInt(item.declared_quantity || 0, 10) || 0;
    const actualQuantity = parseInt(item.actual_quantity || 0, 10) || 0;
    const unitCost = parseFloat(item.unit_cost || 0) || 0;
    const cashPrice = parseFloat(item.cash_price || 0) || 0;
    const srpPrice = parseFloat(item.srp_price || 0) || 0;
    const totalValue = actualQuantity * unitCost;

    return {
      product_master_id: item.product_master_id || "",
      master_sku: item.master_sku || "",
      category_name: item.category_name || "",
      subcategory_name: item.subcategory_name || "",
      brand: item.brand_name || "",
      model: item.product_model || item.product_name || "",
      product_spec: {
        ram: item.requested_ram || "",
        rom: item.requested_rom || "",
        condition: item.requested_condition || "",
        other_specs: item.other_specs || {},
      },
      expected_quantity: expectedQuantity,
      actual_quantity: actualQuantity,
      unit_cost: unitCost,
      cash_price: cashPrice,
      srp_price: srpPrice,
      total_value: totalValue,
      variance_flag: item.variance_flag || expectedQuantity !== actualQuantity,
      variance_notes: item.variance_notes || "",
    };
  });

  const calculatedValue = declaredItems.reduce((sum, item) => sum + (item.total_value || 0), 0);
  const calculatedFreightCost = parseFloat(formData.freight_cost) || 0;
  const calculatedLandedCost = calculatedValue + calculatedFreightCost;
  const hasVariance = declaredItems.some(item => item.variance_flag);
  const now = new Date().toISOString();
  const receivedDate = formData.receipt_date ? new Date(formData.receipt_date).toISOString() : now;

  const refNum = formData.reference_number_1
    ? (formData.reference_number_2 ? `${formData.reference_number_1} / ${formData.reference_number_2}` : formData.reference_number_1)
    : formData.reference_number_2;

  return {
    dr_number: formData.vendor_dr_number,
    po_id: formData.po_id || "",
    po_number: selectedPO?.po_number || "",
    has_goods_receipt: false,
    payment_terms: formData.payment_terms || selectedPO?.financials_json?.payment_terms || "",
    reference_number: refNum || "",
    supplier_id: selectedPO?.supplier_id || formData.supplier_id,
    supplier_name: selectedPO?.supplier_name || supplierName,
    date_received: receivedDate,
    date_encoded: now,
    received_by: currentUser?.full_name || currentUser?.email || "Unknown",
    encoded_by: currentUser?.full_name || currentUser?.email || "Unknown",
    created_at: now,
    updated_at: now,

    logistics_json: {
      logistics_company: formData.logistics_company || "",
      waybill_number: formData.waybill_number || "",
      driver_name: formData.driver_name || "",
      driver_contact: formData.driver_contact || "",
      origin: formData.route_origin || "",
      destination: formData.destination || "",
      freight_cost: calculatedFreightCost,
    },

    declared_items_json: {
      items: declaredItems,
      box_count_declared: parseInt(formData.box_count_declared) || 0,
      box_count_received: parseInt(formData.box_count_received) || 0,
      dr_value: calculatedValue,
      total_landed_cost: calculatedLandedCost,
      has_variance: hasVariance,
      variance_notes: formData.variance_notes || "",
    },

    uploads_json: {
      vendor_dr_url: formData.uploads?.vendor_dr_url || "",
      waybill_url: formData.uploads?.waybill_url || "",
      freight_invoice_url: formData.uploads?.freight_invoice_url || "",
      box_photos: formData.uploads?.box_photos || [],
      driver_id_url: formData.uploads?.driver_id_url || "",
      uploads_complete: true,
      purchase_file_url: "",
    },
  };
};
