import { printQRStickers } from "@/shared/services/qrStickerPrintService";

const pickFirstValue = (item, keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const pickFromAttributeMaps = (item, keys) => {
  const maps = [item?._variantAttributes, item?.attributes, item?.variant_attributes];

  for (const map of maps) {
    if (!map || typeof map !== "object") continue;

    for (const key of keys) {
      const value = map[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
  }

  return "";
};

const pickValue = (item, keys, attributeKeys = []) =>
  pickFirstValue(item, keys) || pickFromAttributeMaps(item, attributeKeys.length ? attributeKeys : keys);

const combineCapacityAndType = (capacity, type) => [capacity, type].filter(Boolean).join(" ").trim();

const getSpecsText = (inventoryItem) => {
  const ram = pickValue(inventoryItem, ["attrRAM", "ram", "variant_ram"], ["ram", "RAM"]);
  const ramType = pickValue(
    inventoryItem,
    ["attrRAMType", "ram_type", "variant_ram_type", "ramType"],
    ["ram_type", "RAM Type", "Ram Type", "ram type"],
  );
  const rom = pickValue(inventoryItem, ["attrROM", "rom", "variant_rom"], ["rom", "ROM"]);
  const romType = pickValue(
    inventoryItem,
    ["attrROMType", "rom_type", "variant_rom_type", "romType"],
    ["rom_type", "ROM Type", "Rom Type", "rom type"],
  );
  const color = pickValue(inventoryItem, ["attrColor", "color", "variant_color"], ["color", "Color"]);

  const ramWithType = combineCapacityAndType(ram, ramType);
  const romWithType = combineCapacityAndType(rom, romType);
  const memorySpec = [ramWithType, romWithType].filter(Boolean).join(" / ");
  const memoryLine = [memorySpec, color].filter(Boolean).join(" ").trim();

  const cpu = pickValue(inventoryItem, ["variant_cpu", "cpu", "platform_cpu"], ["cpu", "CPU"]);
  const gpu = pickValue(inventoryItem, ["variant_gpu", "gpu", "platform_gpu"], ["gpu", "GPU"]);
  const cpuGpuLine = cpu && gpu ? `${cpu} | ${gpu}` : cpu || gpu || "";

  const screen = pickValue(
    inventoryItem,
    ["variant_screen", "screen", "display", "attrScreen"],
    ["screen", "Screen", "display", "Display"],
  );
  const screenLine = screen || "";

  return [memoryLine, cpuGpuLine, screenLine].filter(Boolean);
};

const mapInventoryToStickerItems = (items) =>
  items.map((item) => {
    const identifier = item.imei1 || item.imei2 || item.serial_number;
    if (!identifier) return null;

    const specLines = getSpecsText(item);

    return {
      brand: item.brandName?.toUpperCase() || "",
      model: item.masterModel?.toUpperCase() || "",
      specLines: specLines.length ? specLines : undefined,
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
