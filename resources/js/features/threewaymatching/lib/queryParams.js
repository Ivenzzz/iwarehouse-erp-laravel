export const normalizeQueryParams = (filters = {}) => ({
  status: filters?.status || "unpaid",
  page: Number(filters?.page) > 0 ? Number(filters.page) : 1,
  per_page: Number(filters?.per_page) > 0 ? Number(filters.per_page) : 20,
  selected_match_id: filters?.selected_match_id || null,
});

export const buildQueryParams = (filters, overrides = {}) => {
  const merged = {
    ...normalizeQueryParams(filters),
    ...overrides,
  };

  return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== null && value !== "" && value !== undefined));
};
