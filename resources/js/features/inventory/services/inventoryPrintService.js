import { printQRStickers } from "@/shared/services/qrStickerPrintService";

const formatCurrency = (amount) =>
  (amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const getSpecsText = (inventoryItem) => {
  const modelName = String(inventoryItem?.masterModel || "").toLowerCase();
  const categoryName = String(inventoryItem?.categoryName || "").toLowerCase();
  const isIphone = modelName.includes("iphone") || categoryName.includes("iphone");

  const ram = inventoryItem?.attrRAM || "";
  const storage = inventoryItem?.attrROM || "";
  const color = inventoryItem?.attrColor || "";

  let mainSpecs = "";
  if (isIphone) {
    mainSpecs = [storage, color].filter(Boolean).join(" ");
  } else {
    const specsBase = ram && storage ? `${ram}/${storage}` : storage || ram;
    mainSpecs = [specsBase, color].filter(Boolean).join(" ");
  }

  const cpu = inventoryItem?.cpu || inventoryItem?.platform_cpu || "";
  const gpu = inventoryItem?.gpu || inventoryItem?.platform_gpu || "";
  const subSpecs = cpu && gpu ? `${cpu} | ${gpu}` : cpu || gpu || "";

  return { mainSpecs, subSpecs };
};

const mapInventoryToStickerItems = (items) =>
  items.map((item) => {
    const identifier = item.imei1 || item.imei2 || item.serial_number;
    if (!identifier) return null;

    const { mainSpecs, subSpecs } = getSpecsText(item);

    return {
      brand: item.brandName?.toUpperCase() || "",
      model: item.masterModel?.toUpperCase() || "",
      specLine: mainSpecs,
      subSpecLine: subSpecs,
      condition: item.variantCondition || "Brand New",
      warrantyLines: (item.warranty_description || "No Warranty")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      cashPrice: item.cash_price || 0,
      srp: item.srp || 0,
      identifier,
    };
  }).filter(Boolean);

export const printInventoryQRStickers = async ({ items }) => {
  const stickerItems = mapInventoryToStickerItems(items);
  await printQRStickers({ items: stickerItems, title: "QR Stickers - Inventory" });
};
