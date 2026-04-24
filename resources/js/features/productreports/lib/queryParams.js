export const DEFAULT_FILTERS = {
  startDate: "",
  endDate: "",
  warehouseId: "",
  brandFilter: "",
  productFilter: "",
  search: "",
  sortBy: "rawDate",
  sortDir: "desc",
  perPage: 25,
};

export function normalizeFilters(filters = {}) {
  return {
    ...DEFAULT_FILTERS,
    ...filters,
    perPage: Number(filters?.perPage ?? DEFAULT_FILTERS.perPage),
  };
}

export function buildProductReportParams(filters, overrides = {}) {
  const next = {
    ...filters,
    ...overrides,
  };

  return {
    search: next.search || undefined,
    start_date: next.startDate || undefined,
    end_date: next.endDate || undefined,
    warehouse_id: next.warehouseId || undefined,
    brand: next.brandFilter || undefined,
    product: next.productFilter || undefined,
    sort: next.sortBy,
    direction: next.sortDir,
    per_page: next.perPage,
    page: overrides.page,
  };
}
