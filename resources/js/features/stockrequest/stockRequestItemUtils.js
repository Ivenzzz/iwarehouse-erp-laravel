const RAM_KEYS = ["RAM", "ram"];
const ROM_KEYS = ["ROM", "rom", "Storage", "storage"];
const MODEL_CODE_KEYS = ["Model Code", "model_code", "Model code"];

function normalizeSpecValue(value) {
  return `${value || ""}`.trim().toLowerCase();
}

export function getVariantAttributeValue(attributes = {}, keys = []) {
  for (const key of keys) {
    const value = attributes?.[key];
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      return `${value}`.trim();
    }
  }

  return "";
}

export function getVariantRam(variant) {
  return getVariantAttributeValue(variant?.attributes, RAM_KEYS);
}

export function getVariantRom(variant) {
  return getVariantAttributeValue(variant?.attributes, ROM_KEYS);
}

export function getVariantCondition(variant) {
  return variant?.condition || "Brand New";
}

export function getVariantModelCode(variant) {
  return getVariantAttributeValue(variant?.attributes, MODEL_CODE_KEYS);
}

export function buildRequestedSpecFromVariant(variant) {
  return {
    ram: getVariantRam(variant),
    rom: getVariantRom(variant),
    color: getVariantAttributeValue(variant?.attributes, ["Color", "color"]),
    condition: getVariantCondition(variant),
  };
}

export function buildRequestItemKey(productMasterId, requestedSpec = {}) {
  return [
    productMasterId || "",
    normalizeSpecValue(requestedSpec.ram),
    normalizeSpecValue(requestedSpec.rom),
    normalizeSpecValue(requestedSpec.condition),
  ].join("::");
}

export function formatRequestedSpec(requestedSpec = {}) {
  const parts = [requestedSpec.ram, requestedSpec.rom, requestedSpec.condition].filter(Boolean);
  return parts.join(" / ");
}

export function getRequestedSpecBadges(requestedSpec = {}) {
  return [requestedSpec.ram, requestedSpec.rom, getRequestedSpecColor(requestedSpec)].filter(Boolean);
}

export function getRequestedSpecColor(requestedSpec = {}) {
  return requestedSpec?.color || requestedSpec?.Color || "";
}

export function getRequestedSpecCpu(requestedSpec = {}) {
  return requestedSpec?.cpu || requestedSpec?.CPU || "";
}

export function getRequestedSpecGpu(requestedSpec = {}) {
  return requestedSpec?.gpu || requestedSpec?.GPU || "";
}

export function getRequestedSpecConditionDisplay(requestedSpec = {}) {
  const condition = requestedSpec?.condition || "Brand New";
  return condition === "Certified Pre-Owned" ? "CPO" : "Brand New";
}

export function getProductMasterDisplayName(productMaster, brand) {
  const brandName = brand?.name || "";
  const modelName = productMaster?.model || "";
  const fallbackName = productMaster?.name || "";
  const productName = modelName || fallbackName;

  return `${brandName} ${productName}`.trim() || "Unknown Product";
}

export function getVariantById(variantId, productVariants = []) {
  return productVariants.find((variant) => variant.id === variantId) || null;
}

export function getRequestItemVariants(item, productVariants = []) {
  const variant = getVariantById(item?.variant_id, productVariants);
  return variant ? [variant] : [];
}

export function getProductMasterForVariant(variant, productMasters = []) {
  return productMasters.find((entry) => entry.id === variant?.product_master_id) || null;
}

export function getBrandForProductMaster(productMaster, brands = []) {
  return brands.find((entry) => entry.id === productMaster?.brand_id) || null;
}

export function getRequestItemSecondaryText(item, productVariants = []) {
  const variant = getVariantById(item?.variant_id, productVariants);
  const requestedSpecText = formatRequestedSpec(buildRequestedSpecFromVariant(variant));

  return requestedSpecText || variant?.variant_sku || variant?.variant_name || "";
}

export function getRequestItemDisplayName(item, productMasters = [], productVariants = [], brands = []) {
  const variant = getVariantById(item?.variant_id, productVariants);
  const productMaster = getProductMasterForVariant(variant, productMasters);
  const brand = getBrandForProductMaster(productMaster, brands);
  const title =
    variant?.variant_name ||
    formatRequestedSpec(buildRequestedSpecFromVariant(variant)) ||
    productMaster?.name ||
    "Unknown Product";

  return `${getProductMasterDisplayName(productMaster, brand)} ${title}`.trim();
}

export function getRequestItemDisplayDetails(item, productMasters = [], productVariants = [], brands = []) {
  const variant = getVariantById(item?.variant_id, productVariants);
  const productMaster = getProductMasterForVariant(variant, productMasters);
  const brand = getBrandForProductMaster(productMaster, brands);
  const requestedSpec = buildRequestedSpecFromVariant(variant);
  const condition = requestedSpec.condition || "Brand New";
  const ram = requestedSpec.ram;
  const rom = requestedSpec.rom;
  const modelCode = getVariantModelCode(variant);
  const color = getVariantAttributeValue(variant?.attributes, ["Color", "color"]);
  const cpu =
    productMaster?.fixed_specifications?.platform_cpu ||
    item?.cpu ||
    "";
  const gpu =
    productMaster?.fixed_specifications?.platform_gpu ||
    item?.gpu ||
    "";

  return {
    title: getProductMasterDisplayName(productMaster, brand),
    modelCode,
    condition,
    ram,
    rom,
    color,
    cpu,
    gpu,
  };
}

export function resolveVariantForApproval(item, productVariants = []) {
  return getVariantById(item?.variant_id, productVariants);
}

export function resolveStockRequestActor(actorId, userProfiles = [], users = []) {
  if (!actorId) {
    return {
      id: "",
      full_name: "",
      displayName: "",
      source: "unknown",
    };
  }

  if (actorId === "System" || actorId === "system") {
    return {
      id: actorId,
      full_name: "System",
      displayName: "System",
      source: "system",
    };
  }

  const matchingProfile = userProfiles.find((profile) => profile.user_id === actorId);
  if (matchingProfile) {
    const fullName = matchingProfile.full_name || actorId;
    return {
      ...matchingProfile,
      id: matchingProfile.user_id || actorId,
      full_name: fullName,
      displayName: fullName,
      source: "userProfile",
    };
  }

  const matchingUser = users.find((user) => user.id === actorId);
  if (matchingUser) {
    const fullName = matchingUser.full_name || actorId;
    return {
      ...matchingUser,
      id: matchingUser.id || actorId,
      full_name: fullName,
      displayName: fullName,
      source: "user",
    };
  }

  return {
    id: actorId,
    full_name: actorId,
    displayName: actorId,
    source: "fallback",
  };
}
