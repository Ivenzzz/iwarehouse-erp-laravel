import { useState, useMemo, useCallback } from "react";

const normalizeSpecValue = (value) => String(value || "").trim().toLowerCase();
const normalizeId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
};
const idEquals = (left, right) => normalizeId(left) !== "" && normalizeId(left) === normalizeId(right);

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

const getVariantRam = (variant) =>
  getVariantAttributeValue(variant, ["RAM", "ram"]) || variant?.ram || "";

const getVariantRom = (variant) =>
  getVariantAttributeValue(variant, ["ROM", "rom", "Storage", "storage"]) || variant?.rom || "";

const inferColorFromVariantName = (variantName) => {
  const parts = String(variantName || "")
    .split(/[/-]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";
  return parts[parts.length - 1];
};

const getVariantColor = (variant) =>
  (
    getVariantAttributeValue(variant, ["Color", "color"]) ||
    inferColorFromVariantName(variant?.variant_name)
  ).trim();

const buildDeclaredItemKey = (item) => [
  normalizeId(item.product_master_id),
  normalizeSpecValue(item.product_spec?.ram),
  normalizeSpecValue(item.product_spec?.rom),
  normalizeSpecValue(item.product_spec?.condition),
].join("::");

const buildRowKey = (declaredItemKey, variantId = "unallocated") =>
  `${declaredItemKey}::${variantId || "unallocated"}`;

const getMatchingVariantsForDeclaredItem = (item, variants = []) =>
  variants
    .filter((variant) => {
      if (!idEquals(variant.product_master_id, item.product_master_id)) return false;

      const requestedRam = normalizeSpecValue(item.product_spec?.ram);
      const requestedRom = normalizeSpecValue(item.product_spec?.rom);
      const requestedCondition = normalizeSpecValue(item.product_spec?.condition);

      const variantRam = normalizeSpecValue(getVariantRam(variant));
      const variantRom = normalizeSpecValue(getVariantRom(variant));
      const variantCondition = normalizeSpecValue(variant.condition);

      if (requestedRam && variantRam !== requestedRam) return false;
      if (requestedRom && variantRom !== requestedRom) return false;
      if (requestedCondition && variantCondition !== requestedCondition) return false;

      return true;
    })
    .sort((a, b) => {
      const colorCompare = getVariantColor(a).localeCompare(getVariantColor(b));
      if (colorCompare !== 0) return colorCompare;
      return String(a.variant_name || "").localeCompare(String(b.variant_name || ""));
    });

const buildSpecLabel = (item, productName) => {
  const spec = [
    item.product_spec?.ram,
    item.product_spec?.rom,
    item.product_spec?.condition,
  ].filter(Boolean).join(" / ");

  return spec || productName || "Unknown Variant";
};

const sanitizeAllocation = (allocation = {}, matchingVariants = []) => {
  const variantIds = new Set(matchingVariants.map((variant) => normalizeId(variant.id)));
  const nextAllocation = {};

  Object.entries(allocation).forEach(([variantId, quantity]) => {
    const normalizedVariantId = normalizeId(variantId);
    if (!variantIds.has(normalizedVariantId)) return;
    const parsed = Math.max(0, parseInt(quantity, 10) || 0);
    nextAllocation[normalizedVariantId] = parsed;
  });

  return nextAllocation;
};

export function useGRNEncoding({ selectedDR, showEncodingDialog, productMasters, variants }) {
  const [selectedDeclaredItemKey, setSelectedDeclaredItemKey] = useState(null);
  const [encodedItems, setEncodedItems] = useState([]);
  const [colorAllocations, setColorAllocations] = useState({});
  const [masterPattern, setMasterPatternState] = useState({
    package: "",
    warranty: "",
    cost_price: 0,
    srp: 0,
    cash_price: 0,
    "12_months_cc": 0,
    "3_months_cc": 0,
    dp_30: 0,
    trackingMode: "IMEI",
  });
  const [masterPatternsByDeclaredKey, setMasterPatternsByDeclaredKey] = useState({});

  const encodedCountsByDeclaredKey = useMemo(() => {
    const counts = new Map();

    encodedItems.forEach((item) => {
      const declaredKey = item._declared_item_key || buildDeclaredItemKey(item);
      const variantId = normalizeId(item.variant_id);
      const mapKey = `${declaredKey}::${variantId}`;
      counts.set(mapKey, (counts.get(mapKey) || 0) + 1);
    });

    return counts;
  }, [encodedItems]);

  const declaredItemsList = useMemo(() => {
    if (!selectedDR) return [];

    const rawDeclaredItems = selectedDR.declared_items_json?.items || [];
    const aggregated = new Map();

    rawDeclaredItems.forEach((item) => {
      const declaredItemKey = buildDeclaredItemKey(item);
      const quantity = item.expected_quantity || item.actual_quantity || 0;

      if (!aggregated.has(declaredItemKey)) {
        const productMaster = productMasters.find((entry) => idEquals(entry.id, item.product_master_id));
        aggregated.set(declaredItemKey, {
          ...item,
          product_master_id: normalizeId(item.product_master_id),
          declared_item_key: declaredItemKey,
          product_name: productMaster?.name || item.product_name || "Unknown Product",
          declared_quantity: quantity,
          condition: item.product_spec?.condition || "",
        });
      } else {
        const existing = aggregated.get(declaredItemKey);
        existing.declared_quantity += quantity;
      }
    });

    const rows = [];

    aggregated.forEach((item) => {
      const matchingVariants = getMatchingVariantsForDeclaredItem(item, variants);
      const savedAllocation = sanitizeAllocation(colorAllocations[item.declared_item_key], matchingVariants);
      const allocationLocked = encodedItems.some(
        (encoded) => (encoded._declared_item_key || buildDeclaredItemKey(encoded)) === item.declared_item_key
      );

      if (matchingVariants.length === 1) {
        const variant = matchingVariants[0];
        const rowKey = buildRowKey(item.declared_item_key, variant.id);
        rows.push({
          ...item,
          row_key: rowKey,
          variant_id: normalizeId(variant.id),
          variant_name: variant.variant_name || buildSpecLabel(item, item.product_name),
          variant_sku: variant.variant_sku || "",
          resolved_color: getVariantColor(variant),
          encoded_count: encodedCountsByDeclaredKey.get(`${item.declared_item_key}::${normalizeId(variant.id)}`) || 0,
          matching_variants: matchingVariants,
          saved_allocation: savedAllocation,
          allocation_required: false,
          allocation_locked: allocationLocked,
          is_partitioned: false,
          can_edit_allocation: false,
        });
        return;
      }

      if (matchingVariants.length > 1 && Object.keys(savedAllocation).length > 0) {
        matchingVariants.forEach((variant) => {
          const allocatedQty = savedAllocation[variant.id] || 0;
          if (allocatedQty <= 0) return;

          const rowKey = buildRowKey(item.declared_item_key, variant.id);
          const normalizedVariantId = normalizeId(variant.id);
          rows.push({
            ...item,
            row_key: rowKey,
            variant_id: normalizedVariantId,
            variant_name: variant.variant_name || buildSpecLabel(item, item.product_name),
            variant_sku: variant.variant_sku || "",
            resolved_color: getVariantColor(variant),
            declared_quantity: allocatedQty,
            encoded_count: encodedCountsByDeclaredKey.get(`${item.declared_item_key}::${normalizedVariantId}`) || 0,
            matching_variants: matchingVariants,
            saved_allocation: savedAllocation,
            allocation_required: false,
            allocation_locked: allocationLocked,
            is_partitioned: true,
            can_edit_allocation: !allocationLocked,
          });
        });
        return;
      }

      rows.push({
        ...item,
        row_key: buildRowKey(item.declared_item_key),
        variant_id: "",
        variant_name: buildSpecLabel(item, item.product_name),
        variant_sku: "",
        resolved_color: "",
        encoded_count: 0,
        matching_variants: matchingVariants,
        saved_allocation: savedAllocation,
        allocation_required: matchingVariants.length > 1,
        allocation_locked: allocationLocked,
        is_partitioned: false,
        can_edit_allocation: false,
      });
    });

    return rows;
  }, [selectedDR, productMasters, variants, colorAllocations, encodedItems, encodedCountsByDeclaredKey]);

  const selectedDeclaredItem = useMemo(
    () => declaredItemsList.find((item) => item.row_key === selectedDeclaredItemKey) || null,
    [declaredItemsList, selectedDeclaredItemKey]
  );

  const initializeMasterPattern = useCallback((item) => {
    const defaultPattern = {
      package: "Unit",
      warranty: "7 Days Replacement & 1 Year Warranty",
      cost_price: item.unit_cost || 0,
      srp: item.srp_price || "",
      cash_price: item.cash_price || "",
      "12_months_cc": "",
      "3_months_cc": "",
      dp_30: Math.round((item.unit_cost || 0) * 0.3),
      trackingMode: "IMEI",
      cpu: "",
      gpu: "",
    };

    const persistedPattern = masterPatternsByDeclaredKey[item.declared_item_key];
    setMasterPatternState(persistedPattern ? { ...defaultPattern, ...persistedPattern } : defaultPattern);
  }, [masterPatternsByDeclaredKey]);

  const setMasterPattern = useCallback((valueOrUpdater) => {
    setMasterPatternState((prev) => {
      const nextPattern = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      const selectedItem = declaredItemsList.find((item) => item.row_key === selectedDeclaredItemKey);
      const declaredItemKey = selectedItem?.declared_item_key;

      if (declaredItemKey) {
        setMasterPatternsByDeclaredKey((prevPatterns) => ({
          ...prevPatterns,
          [declaredItemKey]: nextPattern,
        }));
      }

      return nextPattern;
    });
  }, [declaredItemsList, selectedDeclaredItemKey]);

  const handleSelectDeclaredItem = useCallback((item) => {
    setSelectedDeclaredItemKey(item.row_key);
    initializeMasterPattern(item);
  }, [initializeMasterPattern]);

  const saveColorAllocation = useCallback((item, allocation) => {
    const declaredItemKey = item.declared_item_key;
    const matchingVariants = item.matching_variants || [];
    const nextAllocation = sanitizeAllocation(allocation, matchingVariants);
    const firstVariant = matchingVariants.find((variant) => (nextAllocation[normalizeId(variant.id)] || 0) > 0);

    setColorAllocations((prev) => ({
      ...prev,
      [declaredItemKey]: nextAllocation,
    }));

    if (firstVariant) {
      setSelectedDeclaredItemKey(buildRowKey(declaredItemKey, firstVariant.id));
    }

    initializeMasterPattern(item);
  }, [initializeMasterPattern]);

  const resolveDeclaredItemForVariant = useCallback((variantId, productMasterId) => {
    if (!variantId) return null;
    const normalizedVariantId = normalizeId(variantId);
    const normalizedProductMasterId = normalizeId(productMasterId);

    const exactMatch = declaredItemsList.find(
      (item) => idEquals(item.variant_id, normalizedVariantId) && idEquals(item.product_master_id, normalizedProductMasterId)
    );

    if (exactMatch) return exactMatch;

    return declaredItemsList.find(
      (item) =>
        idEquals(item.product_master_id, normalizedProductMasterId) &&
        (item.matching_variants || []).some((variant) => idEquals(variant.id, normalizedVariantId))
    ) || null;
  }, [declaredItemsList]);

  const resetEncodingState = useCallback(() => {
    setSelectedDeclaredItemKey(null);
    setEncodedItems([]);
    setColorAllocations({});
    setMasterPatternsByDeclaredKey({});
  }, []);

  return {
    selectedDeclaredItem,
    masterPattern,
    setMasterPattern,
    encodedItems,
    setEncodedItems,
    declaredItemsList,
    handleSelectDeclaredItem,
    resetEncodingState,
    saveColorAllocation,
    resolveDeclaredItemForVariant,
  };
}
