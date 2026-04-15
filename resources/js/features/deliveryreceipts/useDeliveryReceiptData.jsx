import { useCallback, useMemo } from "react";
import { router, usePage } from "@inertiajs/react";

const DEFAULT_PAGE_SIZE = 10;

const toNumber = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function useDeliveryReceiptData() {
  const { props } = usePage();
  const incoming = props.incoming_pos || {};
  const dr = props.delivery_receipts || {};
  const lookups = props.lookups || {};
  const activeTab = props.active_tab || "confirmed_pos";

  const incomingPagination = incoming.pagination || {};
  const drPagination = dr.pagination || {};
  const incomingFilters = incoming.filters || {};
  const drFilters = dr.filters || {};

  const updateQuery = useCallback((patch) => {
    router.get(route("delivery-receipts.index"), {
      ...route().params,
      ...patch,
    }, {
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  }, []);

  const setIncomingPOSearch = useCallback((value) => {
    updateQuery({ incoming_search: value, incoming_page: 1, active_tab: "confirmed_pos" });
  }, [updateQuery]);

  const setIncomingPOPage = useCallback((page) => {
    updateQuery({ incoming_page: Math.max(1, page), active_tab: "confirmed_pos" });
  }, [updateQuery]);

  const setIncomingPOTimeFilter = useCallback((value) => {
    updateQuery({ incoming_time_filter: value, incoming_page: 1, active_tab: "confirmed_pos" });
  }, [updateQuery]);

  const setIncomingPOWarehouseFilter = useCallback((value) => {
    updateQuery({ incoming_warehouse_filter: value, incoming_page: 1, active_tab: "confirmed_pos" });
  }, [updateQuery]);

  const setDRSearch = useCallback((value) => {
    updateQuery({ dr_search: value, dr_page: 1, active_tab: "all_drs" });
  }, [updateQuery]);

  const setDRStatusFilter = useCallback((value) => {
    updateQuery({ dr_status: value, dr_page: 1, active_tab: "all_drs" });
  }, [updateQuery]);

  const setDRPage = useCallback((page) => {
    updateQuery({ dr_page: Math.max(1, page), active_tab: "all_drs" });
  }, [updateQuery]);

  const refreshData = useCallback(() => {
    router.reload({ only: ["incoming_pos", "delivery_receipts", "active_tab"], preserveScroll: true });
  }, []);

  const hasMoreIncomingPOs = useMemo(() => (
    toNumber(incomingPagination.page, 1) < toNumber(incomingPagination.last_page, 1)
  ), [incomingPagination.last_page, incomingPagination.page]);

  const hasMoreDeliveryReceipts = useMemo(() => (
    toNumber(drPagination.page, 1) < toNumber(drPagination.last_page, 1)
  ), [drPagination.last_page, drPagination.page]);

  return {
    deliveryReceipts: dr.data || [],
    deliveryReceiptsTotal: drPagination.total ?? 0,
    hasMoreDeliveryReceipts,
    drSearch: drFilters.search || "",
    drStatusFilter: drFilters.status || "all",
    drPage: toNumber(drPagination.page, 1),
    drPageSize: toNumber(drPagination.per_page, DEFAULT_PAGE_SIZE),
    setDRSearch,
    setDRStatusFilter,
    setDRPage,

    purchaseOrders: incoming.data || [],
    purchaseOrdersTotal: incomingPagination.total ?? 0,
    incomingPOSearch: incomingFilters.search || "",
    incomingPOTimeFilter: incomingFilters.time_filter || "all",
    incomingPOWarehouseFilter: incomingFilters.warehouse_filter || "all",
    incomingPOPage: toNumber(incomingPagination.page, 1),
    incomingPOPageSize: toNumber(incomingPagination.per_page, DEFAULT_PAGE_SIZE),
    hasMoreIncomingPOs,
    isFetchingIncomingPOs: false,
    setIncomingPOSearch,
    setIncomingPOPage,
    setIncomingPOTimeFilter,
    setIncomingPOWarehouseFilter,

    warehouses: lookups.warehouses || [],
    suppliers: lookups.suppliers || [],
    productMasters: lookups.product_masters || [],
    paymentTerms: lookups.payment_terms || [],
    currentUser: lookups.current_user || null,
    brands: lookups.brands || [],
    queryClient: null,
    refreshData,
    activeTab,
    incomingKpis: incoming.kpis || { count: 0, overdue: 0, value: 0 },
    drKpis: dr.kpis || { count: 0, pending: 0, value: 0 },
  };
}

