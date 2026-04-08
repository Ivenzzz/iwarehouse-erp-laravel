const CONDITION_MAP = {
  bn: "brand new",
  cpo: "certified pre-owned",
};

export const tokenizeInventorySearch = (query) =>
  query.toLowerCase().trim().split(/\s+/).filter(Boolean);

const norm = (value) => (value ? String(value).toLowerCase().trim() : "");

const extractNumber = (value) => {
  if (!value) return "";
  const match = String(value).match(/(\d+)/);
  return match ? match[1] : "";
};

export function buildSearchableRecord(item) {
  const attrs = item._variantAttributes || {};
  return {
    productName: norm(item.productName),
    imei1: norm(item.imei1),
    imei2: norm(item.imei2),
    serial_number: norm(item.serial_number),
    warehouseName: norm(item.warehouseName),
    status: norm(item.status),
    warranty: norm(item.warranty_description),
    cpu: norm(item.cpu),
    gpu: norm(item.gpu),
    grn: norm(item.grn_number),
    ram: extractNumber(attrs.RAM || attrs.ram || attrs.ram_capacity || attrs.ramCapacity || attrs.ram),
    rom: extractNumber(attrs.ROM || attrs.rom || attrs.Storage || attrs.storage || attrs.storage_capacity),
    color: norm(attrs.Color || attrs.color),
    condition: norm(item.variantCondition),
  };
}

export function matchesSearchTokens(searchRecord, tokens) {
  if (!tokens?.length) return true;

  return tokens.every((token) => {
    const conditionFull = CONDITION_MAP[token];
    if (conditionFull && searchRecord.condition === conditionFull) {
      return true;
    }

    if (/^\d+$/.test(token)) {
      if (searchRecord.ram === token || searchRecord.rom === token) {
        return true;
      }
    }

    if (searchRecord.color && searchRecord.color.includes(token)) {
      return true;
    }

    return (
      searchRecord.productName.includes(token) ||
      searchRecord.imei1.includes(token) ||
      searchRecord.imei2.includes(token) ||
      searchRecord.serial_number.includes(token) ||
      searchRecord.warehouseName.includes(token) ||
      searchRecord.status.includes(token) ||
      searchRecord.warranty.includes(token) ||
      searchRecord.cpu.includes(token) ||
      searchRecord.gpu.includes(token) ||
      searchRecord.grn.includes(token)
    );
  });
}
