import { printQRStickers as printGlobalQRStickers } from "@/shared/services/qrStickerPrintService";

const getAttributeValue = (attributes = {}, keys = []) => {
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const joinParts = (...parts) => parts.filter(Boolean).join(" ").trim();

const STORAGE_KEYS = ["Storage", "storage", "ROM", "rom"];
const RAM_KEYS = ["RAM", "ram"];
const RAM_TYPE_KEYS = ["RAM Type", "Ram Type", "ram_type", "ram type"];
const ROM_TYPE_KEYS = ["ROM Type", "Rom Type", "rom_type", "rom type"];
const COLOR_KEYS = ["Color", "color"];
const CPU_KEYS = ["CPU", "cpu"];
const GPU_KEYS = ["GPU", "gpu"];
const OPERATING_SYSTEM_KEYS = ["Operating System", "operating_system", "operating system", "OS", "os"];
const SCREEN_KEYS = ["Screen", "screen", "Display", "display"];
const CONDITION_KEYS = ["Condition", "condition"];

const DISPLAY_ATTRIBUTE_LABELS = {
  model_code: "Model Code",
  ram: "RAM",
  rom: "ROM",
  color: "Color",
  cpu: "CPU",
  gpu: "GPU",
  ram_type: "RAM Type",
  rom_type: "ROM Type",
  operating_system: "Operating System",
  screen: "Screen",
};

const PRIORITY_ATTR_KEYS = new Set([
  ...RAM_KEYS,
  ...STORAGE_KEYS,
  ...COLOR_KEYS,
  ...CPU_KEYS,
  ...GPU_KEYS,
  ...CONDITION_KEYS,
  ...RAM_TYPE_KEYS,
  ...ROM_TYPE_KEYS,
  ...OPERATING_SYSTEM_KEYS,
  ...SCREEN_KEYS,
  "Model Code",
  "model_code",
]);

const formatAttributeLabel = (key) => {
  if (DISPLAY_ATTRIBUTE_LABELS[key]) return DISPLAY_ATTRIBUTE_LABELS[key];
  return String(key)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const truncateLine = (value, maxLength = 68) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
};

const combineCapacityAndType = (capacity, type) => [capacity, type].filter(Boolean).join(" ").trim();

const buildSpecsPayload = (grnItem, variantAttrs) => {
  const ram = getAttributeValue(variantAttrs, RAM_KEYS);
  const storage = getAttributeValue(variantAttrs, STORAGE_KEYS);
  const ramType = getAttributeValue(variantAttrs, RAM_TYPE_KEYS);
  const romType = getAttributeValue(variantAttrs, ROM_TYPE_KEYS);
  const color = grnItem.color || getAttributeValue(variantAttrs, COLOR_KEYS);
  const cpu = getAttributeValue(variantAttrs, CPU_KEYS);
  const gpu = getAttributeValue(variantAttrs, GPU_KEYS);
  const screen = getAttributeValue(variantAttrs, SCREEN_KEYS);
  const modelCode = getAttributeValue(variantAttrs, ["Model Code", "model_code"]);

  const ramWithType = combineCapacityAndType(ram, ramType);
  const romWithType = combineCapacityAndType(storage, romType);
  const memorySpec = [ramWithType, romWithType].filter(Boolean).join(" / ");
  const memoryAndColorLine = [memorySpec, color].filter(Boolean).join(" ").trim();
  const cpuGpuLine = cpu && gpu ? `${cpu} | ${gpu}` : cpu || gpu;
  const screenLine = screen || "";

  const overflowPairs = Object.entries(variantAttrs || {})
    .filter(([key, value]) => !PRIORITY_ATTR_KEYS.has(key) && value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${formatAttributeLabel(key)}: ${String(value).trim()}`);
  const overflowLine = overflowPairs.length > 0 ? truncateLine(overflowPairs.join(" | ")) : "";

  return {
    headerLine: joinParts(
      String(grnItem.brand_name || "").toUpperCase(),
      String(grnItem.model_name || grnItem.product_name || "").toUpperCase(),
      String(modelCode || "").toUpperCase(),
    ),
    specLines: [memoryAndColorLine, cpuGpuLine, screenLine, overflowLine].filter(Boolean),
  };
};

const resolveSerialRows = (grnItem) => {
  if (grnItem.identifiers) {
    return [
      {
        imei1: grnItem.identifiers?.imei1 || "",
        imei2: grnItem.identifiers?.imei2 || "",
        serial_number: grnItem.identifiers?.serial_number || "",
        warranty: grnItem.warranty || "",
        cash_price: grnItem.pricing?.cash_price || 0,
        srp: grnItem.pricing?.srp || 0,
      },
    ];
  }

  return grnItem.serials || grnItem.serial_numbers || [];
};

export const printQRStickers = async ({ grn }) => {
  if (!grn.items?.length) {
    alert("No items to print QR stickers for.");
    return;
  }

  const stickerItems = [];

  for (const grnItem of grn.items) {
    const serialNumbers = resolveSerialRows(grnItem);
    if (!serialNumbers.length) continue;

    const variantAttrs = grnItem.attributes || {};
    const { headerLine, specLines } = buildSpecsPayload(grnItem, variantAttrs);

    for (const sn of serialNumbers) {
      const identifier = sn.imei1 || sn.imei2 || sn.serial_number;
      if (!identifier) continue;

      const condition = grnItem.condition || getAttributeValue(variantAttrs, CONDITION_KEYS) || "Brand New";
      const warrantyLines = (sn.warranty || grnItem.warranty || "No Warranty")
        .split(",")
        .map((line) => line.trim())
        .filter(Boolean);

      stickerItems.push({
        brand: (grnItem.brand_name || "").toUpperCase(),
        model: (grnItem.model_name || grnItem.product_name || "").toUpperCase(),
        headerLine: headerLine || undefined,
        specLines: specLines.length ? specLines : undefined,
        condition,
        warrantyLines,
        cashPrice: sn.cash_price || grnItem.pricing?.cash_price || 0,
        srp: sn.srp || grnItem.pricing?.srp || 0,
        identifier,
      });
    }
  }

  await printGlobalQRStickers({
    items: stickerItems,
    title: `QR Batch ${grn.grn_number || grn.receipt_info?.grn_number || ""}`,
  });
};
