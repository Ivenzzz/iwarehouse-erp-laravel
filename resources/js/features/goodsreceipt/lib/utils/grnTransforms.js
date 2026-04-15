const normalizeSpecValue = (value) => String(value || "").trim().toLowerCase();

const EXTRA_ATTRIBUTE_FIELDS = [
  "os",
  "screen",
  "model_code",
  "12_months_cc",
  "3_months_cc",
  "dp_30",
  "imei3",
  "sim_slot",
  "network_1",
  "network_2",
  "network_type",
  "software",
  "code",
  "intro",
  "details",
  "product_details",
];

const isPresent = (value) => value !== undefined && value !== null && value !== "";

export const getEncodedItemIdentifiers = (item) => ({
  imei1: item.identifiers?.imei1 || item.imei1 || "",
  imei2: item.identifiers?.imei2 || item.imei2 || "",
  serial_number: item.identifiers?.serial_number || item.serial_number || "",
});

export const getEncodedItemPricing = (item) => ({
  cost_price: Number(item.pricing?.cost_price ?? item.cost_price ?? 0),
  cash_price: Number(item.pricing?.cash_price ?? item.cash_price ?? 0),
  srp: Number(item.pricing?.srp ?? item.srp ?? 0),
});

export const getEncodedItemSpec = (item) => ({
  cpu: item.spec?.cpu || item.cpu || "",
  gpu: item.spec?.gpu || item.gpu || "",
  submodel: item.spec?.submodel || item.submodel || "",
  ram_type: item.spec?.ram_type || item.ram_type || "",
  rom_type: item.spec?.rom_type || item.rom_type || "",
  ram_slots: item.spec?.ram_slots || item.ram_slots || "",
  product_type: item.spec?.product_type || item.product_type || "",
  country_model: item.spec?.country_model || item.country_model || "",
  with_charger: Boolean(item.spec?.with_charger ?? item.with_charger),
  resolution: item.spec?.resolution || item.resolution || "",
});

const findCategoryById = (categoryId, categories = []) => {
  if (!categoryId) return null;
  return categories.find(
    (category) => category.id === categoryId || category.product_category_id === categoryId
  ) || null;
};

const findSubcategoryById = (subcategoryId, subcategories = []) => {
  if (!subcategoryId) return null;
  return subcategories.find(
    (subcategory) => subcategory.id === subcategoryId || subcategory.product_subcategory_id === subcategoryId
  ) || null;
};

export const getProductReferenceData = (
  item,
  variant = {},
  productMaster = {},
  declaredItem = {},
  { categories = [], subcategories = [] } = {}
) => {
  const category = findCategoryById(productMaster.category_id, categories);
  const subcategory = findSubcategoryById(productMaster.subcategory_id, subcategories);

  return {
    product_master_id: variant.product_master_id || item.product_master_id || "",
    variant_id: item.variant_id || "",
    variant_sku: variant.variant_sku || declaredItem.variant_sku || item.variant_sku || "",
    variant_name: variant.variant_name || declaredItem.variant_name || item.variant_name || "",
    condition: variant.condition || item.condition || declaredItem.condition || item.product_spec?.condition || declaredItem.product_spec?.condition || "",
    master_sku: variant.master_sku || productMaster.master_sku || declaredItem.master_sku || item.master_sku || "",
    category_name: productMaster.category_name || category?.name || variant.category_name || declaredItem.category_name || item.category_name || "",
    subcategory_name: productMaster.subcategory_name || subcategory?.name || variant.subcategory_name || declaredItem.subcategory_name || item.subcategory_name || "",
    brand: productMaster.brand_name || variant.brand_name || declaredItem.brand || declaredItem.brand_name || item.brand || item.brand_name || "",
    model: productMaster.model || variant.model || declaredItem.model || item.model || productMaster.name || declaredItem.product_name || "",
  };
};

export const getEncodedItemAttributes = (item, variant = {}, declaredItem = {}) => {
  const attributes = {
    ...(variant.attributes || {}),
    ...(declaredItem.attributes || {}),
    ...(item.attributes || {}),
  };

  const productSpec = item.product_spec || declaredItem.product_spec;
  if (productSpec) {
    attributes.product_spec = productSpec;
  }

  EXTRA_ATTRIBUTE_FIELDS.forEach((field) => {
    const value = item._purchaseFileData?.[field] ?? item[field];
    if (isPresent(value)) {
      attributes[field] = value;
    }
  });

  return attributes;
};

export const findDeclaredItemForEncodedItem = (item, declaredItemsList = []) => {
  if (!item || !Array.isArray(declaredItemsList)) return {};

  const declaredKey = item._declared_item_key || buildDeclaredItemKey(item);
  const exactMatch = declaredItemsList.find(
    (declaredItem) =>
      declaredItem.declared_item_key === declaredKey &&
      declaredItem.product_master_id === item.product_master_id &&
      (!item.variant_id || !declaredItem.variant_id || declaredItem.variant_id === item.variant_id)
  );

  if (exactMatch) return exactMatch;

  return (
    declaredItemsList.find(
      (declaredItem) =>
        declaredItem.declared_item_key === declaredKey ||
        (declaredItem.product_master_id === item.product_master_id &&
          (!item.variant_id || !declaredItem.variant_id || declaredItem.variant_id === item.variant_id))
    ) || {}
  );
};

export const buildDeclaredItemsFromDeliveryReceipt = (deliveryReceipt) =>
  (deliveryReceipt?.declared_items_json?.items || []).map((item) => ({
    ...item,
    declared_item_key: item.declared_item_key || buildDeclaredItemKey(item),
    declared_quantity: item.declared_quantity || item.expected_quantity || item.actual_quantity || 0,
    condition: item.condition || item.product_spec?.condition || "",
  }));

export const buildSubmitDeclaredItemsList = (deliveryReceipt, declaredItemsList = []) => {
  const hydratedItems = buildDeclaredItemsFromDeliveryReceipt(deliveryReceipt);
  if (!declaredItemsList.length) return hydratedItems;

  const mergedItems = declaredItemsList.map((declaredItem) => {
    const declaredKey = declaredItem.declared_item_key || buildDeclaredItemKey(declaredItem);
    const hydratedItem =
      hydratedItems.find(
        (item) =>
          item.declared_item_key === declaredKey &&
          item.product_master_id === declaredItem.product_master_id
      ) || {};

    return {
      ...hydratedItem,
      ...declaredItem,
      declared_item_key: declaredKey,
      master_sku: declaredItem.master_sku || hydratedItem.master_sku || "",
      category_name: declaredItem.category_name || hydratedItem.category_name || "",
      subcategory_name: declaredItem.subcategory_name || hydratedItem.subcategory_name || "",
      brand: declaredItem.brand || declaredItem.brand_name || hydratedItem.brand || hydratedItem.brand_name || "",
      model: declaredItem.model || hydratedItem.model || "",
      product_spec: declaredItem.product_spec || hydratedItem.product_spec,
      condition: declaredItem.condition || hydratedItem.condition || hydratedItem.product_spec?.condition || "",
    };
  });

  hydratedItems.forEach((hydratedItem) => {
    const alreadyIncluded = mergedItems.some(
      (item) =>
        item.declared_item_key === hydratedItem.declared_item_key &&
        item.product_master_id === hydratedItem.product_master_id
    );

    if (!alreadyIncluded) {
      mergedItems.push(hydratedItem);
    }
  });

  return mergedItems;
};

export const getGRNWarehouse = (destinationWarehouseId, warehouses, mainWarehouse) => {
  if (!destinationWarehouseId) return mainWarehouse?.id || "";

  const destinationWH = warehouses.find((warehouse) => warehouse.id === destinationWarehouseId);
  if (destinationWH?.warehouse_type === "main_warehouse") {
    return destinationWarehouseId;
  }

  if (destinationWH?.parent_warehouse_id) {
    const parentWH = warehouses.find((warehouse) => warehouse.id === destinationWH.parent_warehouse_id);
    if (parentWH?.warehouse_type === "main_warehouse") {
      return parentWH.id;
    }
  }

  return mainWarehouse?.id || destinationWarehouseId;
};

export const buildGRNData = ({
  selectedDR,
  encodedItems,
  declaredItemsList,
  currentUser,
  grnNumber,
  grnDate,
  assignedWarehouse,
  variants = [],
  productMasters = [],
  categories = [],
  subcategories = [],
}) => {
  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const pmMap = new Map(productMasters.map((pm) => [pm.id, pm]));

  const now = new Date().toISOString();
  const schemaItems = encodedItems.map((item) => {
    const variant = variantMap.get(item.variant_id) || {};
    const pm = pmMap.get(item.product_master_id || variant.product_master_id) || {};
    const declaredItem = findDeclaredItemForEncodedItem(item, declaredItemsList);
    const referenceData = getProductReferenceData(item, variant, pm, declaredItem, {
      categories,
      subcategories,
    });

    return {
      variant_id: referenceData.variant_id,
      variant_name: referenceData.variant_name,
      condition: referenceData.condition,
      attributes: getEncodedItemAttributes(item, variant, declaredItem),
      master_sku: referenceData.master_sku,
      category_name: referenceData.category_name,
      subcategory_name: referenceData.subcategory_name,
      brand: referenceData.brand,
      model: referenceData.model,
      identifiers: getEncodedItemIdentifiers(item),
      package: item.package || "",
      warranty: item.warranty || "",
      pricing: getEncodedItemPricing(item),
      spec: getEncodedItemSpec(item),
      item_notes: item.item_notes || "",
    };
  });

  const hasDiscrepancy = declaredItemsList.some(
    (declared) =>
      declared.declared_quantity !==
      encodedItems.filter(
        (encoded) =>
          encoded.product_master_id === declared.product_master_id &&
          encoded.variant_id === declared.variant_id
      ).length
  );

  return {
    grn_number: grnNumber,
    dr_id: selectedDR.id || "",
    dr_number: selectedDR.dr_number || selectedDR.vendor_dr_number || "",
    supplier_name: selectedDR.supplier_name || "",
    status: "completed",
    total_amount: schemaItems.reduce((sum, unit) => sum + (unit.pricing?.cost_price || 0), 0),
    discrepancy_info: {
      has_discrepancy: hasDiscrepancy,
      discrepancy_summary: "",
    },
    notes: `Warehouse encoding completed by ${currentUser?.full_name || "Unknown"} on ${grnDate}. Auto-assigned to ${assignedWarehouse?.name || "Main Warehouse"}.`,
    items: schemaItems,
    created_at: now,
    updated_at: now,
  };
};

export const buildDeclaredItemKey = (item) =>
  [
    item.product_master_id || "",
    normalizeSpecValue(item.product_spec?.ram),
    normalizeSpecValue(item.product_spec?.rom),
    normalizeSpecValue(item.product_spec?.condition),
  ].join("::");
