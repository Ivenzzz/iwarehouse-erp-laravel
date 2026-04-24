export const DEFAULT_FILTERS = {
  period: "monthly",
  referenceDate: "",
  warehouseId: "all",
  search: "",
  sort: "transaction_date",
  direction: "desc",
  perPage: 15,
};

export function normalizeFilters(filters = {}) {
  const next = {
    ...DEFAULT_FILTERS,
    ...filters,
  };

  return {
    ...next,
    perPage: Number(next.perPage || DEFAULT_FILTERS.perPage),
    referenceDate: next.referenceDate || new Date().toISOString().slice(0, 10),
  };
}

export function buildSalesProfitTrackerParams(filters, overrides = {}) {
  const next = { ...filters, ...overrides };

  return {
    period: next.period,
    reference_date: next.referenceDate,
    warehouse_id: next.warehouseId,
    search: next.search || undefined,
    sort: next.sort,
    direction: next.direction,
    per_page: next.perPage,
    page: overrides.page,
  };
}
