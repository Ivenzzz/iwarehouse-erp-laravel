import { buildSearchableRecord, matchesSearchTokens, tokenizeInventorySearch } from "@/features/inventory/services/inventorySearchService";

const INVENTORY_TIME_ZONE = "Asia/Manila";
const HAS_TIME_ZONE_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/i;
const INVENTORY_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: INVENTORY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const STOCK_AGE_OPTIONS = [
  { value: "all", label: "All Stock Age" },
  { value: "today", label: "Today" },
  { value: "1-7", label: "1-7 days" },
  { value: "8-30", label: "8-30 days" },
  { value: "31-60", label: "31-60 days" },
  { value: "61-90", label: "61-90 days" },
  { value: "90+", label: "90+ days" },
];

const parseInventoryDate = (dateString) => {
  if (!dateString) return null;
  const normalized = String(dateString).trim();
  if (!normalized) return null;
  const safeDateString = HAS_TIME_ZONE_SUFFIX.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(safeDateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getZonedTimestamp = (dateString) => {
  const date = dateString instanceof Date ? dateString : parseInventoryDate(dateString);
  if (!date) return null;

  const parts = INVENTORY_DATE_FORMATTER.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value;

  return Date.UTC(
    Number(getPart("year")),
    Number(getPart("month")) - 1,
    Number(getPart("day")),
    Number(getPart("hour")),
    Number(getPart("minute")),
    Number(getPart("second")),
  );
};

export const calculateDetailedStockAge = (encodedDate) => {
  if (!encodedDate) return { display: "N/A", days: 0 };

  const encodedTs = getZonedTimestamp(encodedDate);
  const nowTs = getZonedTimestamp(new Date());
  if (encodedTs === null || nowTs === null) return { display: "N/A", days: 0 };

  const diffMs = nowTs - encodedTs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) return { display: `${diffHours}h ${diffMinutes}m`, days: 0 };
    return { display: `${diffMinutes}m`, days: 0 };
  }

  if (diffDays === 1) return { display: "Yesterday", days: 1 };
  return { display: `${diffDays} days`, days: diffDays };
};

const matchesStockAgeFilter = (days, stockAgeFilter) => {
  if (stockAgeFilter === "all") return true;

  switch (stockAgeFilter) {
    case "today":
      return days === 0;
    case "1-7":
      return days >= 1 && days <= 7;
    case "8-30":
      return days >= 8 && days <= 30;
    case "31-60":
      return days >= 31 && days <= 60;
    case "61-90":
      return days >= 61 && days <= 90;
    case "90+":
      return days >= 90;
    default:
      return true;
  }
};

export const createDefaultInventoryFilters = () => ({
  search: "",
  location: "all",
  status: "all",
  category: "all",
  brand: "all",
  model: "all",
  condition: "all",
  stockAge: "all",
});

export const isExactInventoryIdSearch = (query) => {
  const trimmed = String(query || "").trim();
  if (!trimmed || trimmed.includes(" ")) return false;
  if (trimmed.length < 8) return false;
  return /^[A-Za-z0-9-]+$/.test(trimmed);
};

export const enrichInventoryItems = ({
  items = [],
  productMasters = [],
  variants = [],
  warehouses = [],
  brands = [],
}) => {
  const pmMap = new Map(productMasters.map((item) => [item.id, item]));
  const variantMap = new Map(variants.map((item) => [item.id, item]));
  const warehouseMap = new Map(warehouses.map((item) => [item.id, item]));
  const brandMap = new Map(brands.map((item) => [item.id, item]));

  return items.map((item) => {
    const pm = pmMap.get(item.product_master_id);
    const variant = variantMap.get(item.variant_id);
    const warehouse = warehouseMap.get(item.warehouse_id);
    const stockAgeData = calculateDetailedStockAge(item.encoded_date || item.created_date);
    const brand = pm ? brandMap.get(pm.brand_id) : null;

    const enrichedItem = {
      ...item,
      productName: variant?.variant_name || item.productName || "",
      brandName: brand?.name || item.brandName || "",
      masterModel: pm?.model || item.masterModel || "",
      warehouseName: warehouse?.name || item.warehouseName || "N/A",
      barcode: [item.imei1, item.imei2, item.serial_number].filter(Boolean).join(" "),
      stockAgeDisplay: stockAgeData.display,
      stockAgeDays: stockAgeData.days,
      brandId: pm?.brand_id || item.brandId || null,
      modelId: pm?.model_id || item.modelId || null,
      categoryName: pm?.category_name || item.categoryName || "",
      categoryId: pm?.category_id || item.categoryId || null,
      variantCondition: variant?.condition || item.variantCondition || null,
      cpu: item.variant_cpu || item.cpu || pm?.fixed_specifications?.platform_cpu || "",
      gpu: item.variant_gpu || item.gpu || pm?.fixed_specifications?.platform_gpu || "",
      attrRAM: variant?.attributes?.ram || variant?.attributes?.RAM || item.attrRAM || "",
      attrROM: variant?.attributes?.rom || item.attrROM || "",
      attrColor: variant?.attributes?.color || variant?.attributes?.Color || item.attrColor || "",
      _variantAttributes: variant?.attributes || item._variantAttributes || {},
    };

    return {
      ...enrichedItem,
      _searchRecord: buildSearchableRecord(enrichedItem),
    };
  });
};

export const applyClientInventoryFilters = ({ items = [], filters }) => {
  const search = filters.search?.trim() || "";
  const searchTokens = search ? tokenizeInventorySearch(search) : [];

  return items.filter((item) => {
    if (searchTokens.length > 0) {
      const record = item._searchRecord || buildSearchableRecord(item);
      if (!matchesSearchTokens(record, searchTokens)) return false;
    }

    if (filters.location !== "all" && String(item.warehouse_id) !== String(filters.location)) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.category !== "all" && String(item.categoryId) !== String(filters.category)) return false;
    if (filters.brand !== "all" && String(item.brandId) !== String(filters.brand)) return false;
    if (filters.model !== "all" && String(item.modelId) !== String(filters.model)) return false;
    if (filters.condition !== "all" && item.variantCondition !== filters.condition) return false;
    if (!matchesStockAgeFilter(item.stockAgeDays, filters.stockAge)) return false;

    return true;
  });
};

export const matchesBrowseFiltersWithoutSearch = (item, filters) => {
  if (filters.location !== "all" && String(item.warehouse_id) !== String(filters.location)) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.category !== "all" && String(item.categoryId) !== String(filters.category)) return false;
  if (filters.brand !== "all" && String(item.brandId) !== String(filters.brand)) return false;
  if (filters.model !== "all" && String(item.modelId) !== String(filters.model)) return false;
  if (filters.condition !== "all" && item.variantCondition !== filters.condition) return false;
  if (!matchesStockAgeFilter(item.stockAgeDays, filters.stockAge)) return false;

  return true;
};
