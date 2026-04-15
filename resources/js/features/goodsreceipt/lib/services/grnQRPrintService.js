import { printQRStickers as printGlobalQRStickers } from "@/shared/services/qrStickerPrintService";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getAttributeValue = (attributes = {}, keys = []) => {
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const COMPUTER_KEYWORDS = [
  "computer",
  "computers",
  "laptop",
  "laptops",
  "desktop",
  "desktop pcs",
  "mini pc",
  "mini pcs",
  "notebook",
  "pc",
];

const isComputerStickerProduct = (category, subcategory) => {
  const categoryName = normalizeText(category?.name);
  const subcategoryName = normalizeText(subcategory?.name);

  const matchesComputerKeyword = (value = "") =>
    COMPUTER_KEYWORDS.some((keyword) => value.includes(keyword));

  return matchesComputerKeyword(categoryName) || matchesComputerKeyword(subcategoryName);
};

const joinParts = (...parts) => parts.filter(Boolean).join(" ").trim();

const getSpecsText = (pm, category, subcategory, variantAttrs) => {
  const modelName = String(pm?.model || "").toLowerCase();
  const catName = String(category?.name || "").toLowerCase();
  const isIphone = modelName.includes("iphone") || catName.includes("iphone");
  const isComputerSticker = isComputerStickerProduct(category, subcategory);

  const ram = getAttributeValue(variantAttrs, ["RAM", "ram"]);
  const storage = getAttributeValue(variantAttrs, ["Storage", "storage", "ROM", "rom"]);

  if (isComputerSticker) {
    const fixed = pm?.fixed_specifications || {};
    const modelCode = getAttributeValue(variantAttrs, ["Model Code", "model_code", "Model code"]);
    const ramType = getAttributeValue(variantAttrs, ["RAM Type", "ram_type", "Ram Type"]);
    const romType = getAttributeValue(variantAttrs, ["ROM Type", "rom_type", "Rom Type"]);
    const cpu = getAttributeValue(variantAttrs, ["CPU", "cpu"]) || fixed.platform_cpu || fixed.cpu || "";
    const gpu = getAttributeValue(variantAttrs, ["GPU", "gpu"]) || fixed.platform_gpu || fixed.gpu || "";
    const screen = getAttributeValue(variantAttrs, ["Screen", "screen"]);

    const ramText = joinParts(ram, ramType);
    const romText = joinParts(storage, romType);
    const memoryLine = [ramText, romText].filter(Boolean).join(" / ");

    return {
      headerLine: joinParts(
        String(pm?.brand_name || "").toUpperCase(),
        String(pm?.model || "").toUpperCase(),
        modelCode.toUpperCase()
      ),
      specLines: [
        memoryLine,
        cpu && gpu ? `${cpu} | ${gpu}` : cpu || gpu,
        screen,
      ].filter(Boolean),
      mainSpecs: "",
      subSpecs: "",
    };
  }

  let mainSpecs = "";

  if (isIphone) {
    mainSpecs = storage;
  } else {
    if (ram && storage) mainSpecs = `${ram} / ${storage}`;
    else mainSpecs = storage || ram;
  }

  let subSpecs = "";
  if (catName.includes("laptop") || catName.includes("desktop")) {
    const fixed = pm?.fixed_specifications || {};
    const cpu = getAttributeValue(variantAttrs, ["CPU", "cpu"]) || fixed.platform_cpu || fixed.cpu || "";
    const gpu = getAttributeValue(variantAttrs, ["GPU", "gpu"]) || fixed.platform_gpu || fixed.gpu || "";
    if (cpu && gpu) subSpecs = `${cpu} | ${gpu}`;
    else subSpecs = cpu || gpu;
  }

  return { mainSpecs, subSpecs, headerLine: "", specLines: [] };
};

// ==========================================
// MAIN ORCHESTRATION (delegates to global service)
// ==========================================

export const printQRStickers = async ({ grn, variants, productMasters, brands, categories, subcategories = [] }) => {
  if (!grn.items?.length) {
    alert("No items to print QR stickers for.");
    return;
  }

  const stickerItems = [];

  for (const grnItem of grn.items) {
    const serialNumbers = grnItem.identifiers
      ? [{
          imei1: grnItem.identifiers?.imei1 || "",
          imei2: grnItem.identifiers?.imei2 || "",
          serial_number: grnItem.identifiers?.serial_number || "",
          warranty: grnItem.warranty || "",
          cash_price: grnItem.pricing?.cash_price || 0,
          srp: grnItem.pricing?.srp || 0,
        }]
      : grnItem.serials || grnItem.serial_numbers || [];
    if (!serialNumbers.length) continue;

    const variant = variants.find((v) => v.id === grnItem.variant_id);
    const pm = productMasters.find((p) => p.id === grnItem.product_master_id || p.id === variant?.product_master_id);
    const brand = pm ? brands.find((b) => b.id === pm.brand_id) : null;
    const category = pm ? categories.find((c) => c.id === pm.category_id) : null;
    const subcategory = pm ? subcategories.find((entry) => entry.id === pm.subcategory_id) : null;

    for (const sn of serialNumbers) {
      const identifier = sn.imei1 || sn.imei2 || sn.serial_number;
      if (!identifier) continue;

      const variantAttrs = variant?.attributes || {};
      const enrichedProductMaster = {
        ...pm,
        brand_name: brand?.name || "",
      };
      const { mainSpecs, subSpecs, headerLine, specLines } = getSpecsText(
        enrichedProductMaster,
        category,
        subcategory,
        variantAttrs
      );
      const color = getAttributeValue(variantAttrs, ["Color", "color"]);
      const combinedSpecLine = [mainSpecs, color].filter(Boolean).join(" ");

      stickerItems.push({
        brand: brand?.name?.toUpperCase() || "",
        model: pm?.model?.toUpperCase() || "",
        headerLine: headerLine || undefined,
        specLines: specLines?.length ? specLines : undefined,
        specLine: combinedSpecLine,
        subSpecLine: subSpecs,
        condition: variant?.condition || "Brand New",
        warrantyLines: (sn.warranty || pm?.warranty_description || "No Warranty").split(",").map(w => w.trim()).filter(Boolean),
        cashPrice: sn.cash_price || grnItem.costing?.cash_price || 0,
        srp: sn.srp || grnItem.costing?.srp || 0,
        identifier,
      });
    }
  }

  await printGlobalQRStickers({
    items: stickerItems,
    title: `QR Batch ${grn.grn_number || grn.receipt_info?.grn_number || ""}`,
  });
};
