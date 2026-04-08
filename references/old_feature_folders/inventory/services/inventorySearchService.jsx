/**
 * Smart inventory search service.
 *
 * Accepts queries like:
 *   "iPhone 13 4 256 grey bn"
 *   "iPhone 13 256 grey bn"
 *   "TECNO POVA 7 8 256 cpo"
 *   "Samsung"                          (model-only)
 *
 * Strategy: every search token is matched against ALL searchable fields of an item.
 * An item passes only if EVERY token matches at least one field.
 *
 * Special tokens:
 *   "bn"  → matches condition "Brand New"
 *   "cpo" → matches condition "Certified Pre-Owned"
 *
 * Numeric tokens (e.g. "4", "256") are matched against RAM / ROM numbers
 * as well as general text fields so "13" still matches "iPhone 13".
 */

const CONDITION_MAP = {
  bn: "brand new",
  cpo: "certified pre-owned",
};

export const tokenizeInventorySearch = (query) =>
  query.toLowerCase().trim().split(/\s+/).filter(Boolean);

/**
 * Normalise a string for comparison: lowercase, trim.
 */
const norm = (v) => (v ? String(v).toLowerCase().trim() : "");

/**
 * Extract the numeric portion from a RAM/ROM string like "8GB" → "8".
 */
const extractNumber = (v) => {
  if (!v) return "";
  const m = String(v).match(/(\d+)/);
  return m ? m[1] : "";
};

/**
 * Build a flat searchable record from an enriched inventory item.
 * Called once per item (memoised in the component).
 */
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
    // Variant attributes for structured search
    ram: extractNumber(attrs.RAM || attrs.ram),
    rom: extractNumber(attrs.ROM || attrs.rom || attrs.Storage || attrs.storage),
    color: norm(attrs.Color || attrs.color),
    condition: norm(item.variantCondition),
  };
}

/**
 * Returns true if the item matches ALL tokens in the search query.
 */
export function matchesSearch(searchRecord, query) {
  if (!query) return true;

  const tokens = tokenizeInventorySearch(query);
  if (tokens.length === 0) return true;

  return tokens.every((token) => {
    // 1. Check condition shorthand
    const conditionFull = CONDITION_MAP[token];
    if (conditionFull && searchRecord.condition === conditionFull) {
      return true;
    }

    // 2. Check RAM / ROM numeric match (token is purely digits)
    if (/^\d+$/.test(token)) {
      if (searchRecord.ram === token || searchRecord.rom === token) {
        return true;
      }
    }

    // 3. Check color
    if (searchRecord.color && searchRecord.color.includes(token)) {
      return true;
    }

    // 4. General text fields (product name, barcodes, location, etc.)
    if (
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
    ) {
      return true;
    }

    return false;
  });
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

    if (
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
    ) {
      return true;
    }

    return false;
  });
}
