import { useCallback, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { createGoodsReceipt, fetchGoodsReceiptCatalog } from "../services/goodsReceiptService";

function getSearchParams() {
  return new URLSearchParams(window.location.search);
}

function buildQueryObject(params) {
  const next = {};
  params.forEach((value, key) => {
    if (value !== "") next[key] = value;
  });
  return next;
}

export function useGRNData() {
  const { goods_receipt_page: pageData = {} } = usePage().props;
  const [createPending, setCreatePending] = useState(false);
  const [isFetchingPending, setIsFetchingPending] = useState(false);
  const [isFetchingGrn, setIsFetchingGrn] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalog, setCatalog] = useState({ drId: null, productMasters: [], variants: [] });

  const pending = pageData.pending_delivery_receipts || {};
  const grns = pageData.goods_receipts || {};
  const lookups = pageData.lookups || {};

  const deliveryReceipts = pending.data || [];
  const allGRNs = grns.data || [];
  const pendingPagination = pending.pagination || {};
  const pendingFilters = pending.filters || {};
  const grnPagination = grns.pagination || {};
  const grnFilters = grns.filters || {};
  const activeTab = pageData.active_tab || "delivery-receipts";
  const mainWarehouse = (lookups.warehouses || []).find((warehouse) => warehouse.warehouse_type === "main_warehouse") || null;

  const refreshPage = useCallback(() => {
    router.get(route("goods-receipts.index"), buildQueryObject(getSearchParams()), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      only: ["goods_receipt_page"],
    });
  }, []);

  const pushQuery = useCallback((changes, setLoading) => {
    const params = getSearchParams();
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    if (setLoading) setLoading(true);
    router.get(route("goods-receipts.index"), buildQueryObject(params), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      only: ["goods_receipt_page"],
      onFinish: () => setLoading?.(false),
    });
  }, []);

  const fetchNextPendingPage = useCallback(() => {
    if ((pendingPagination.page || 1) >= (pendingPagination.last_page || 1)) return;
    pushQuery({ dr_page: (pendingPagination.page || 1) + 1, active_tab: "delivery-receipts" }, setIsFetchingPending);
  }, [pendingPagination.last_page, pendingPagination.page, pushQuery]);

  const setPendingQuery = useCallback(
    (changes) => {
      pushQuery({ ...changes, active_tab: "delivery-receipts" }, setIsFetchingPending);
    },
    [pushQuery]
  );

  const setPendingPage = useCallback(
    (page) => {
      setPendingQuery({ dr_page: page });
    },
    [setPendingQuery]
  );

  const setPendingFilters = useCallback(
    (changes) => {
      setPendingQuery({ ...changes, dr_page: 1 });
    },
    [setPendingQuery]
  );

  const setGrnQuery = useCallback(
    (changes) => {
      pushQuery({ ...changes, active_tab: "goods-receipts" }, setIsFetchingGrn);
    },
    [pushQuery]
  );

  const setGrnPage = useCallback(
    (page) => {
      setGrnQuery({ grn_page: page });
    },
    [setGrnQuery]
  );

  const setGrnFilters = useCallback(
    (changes) => {
      setGrnQuery({ ...changes, grn_page: 1 });
    },
    [setGrnQuery]
  );

  const handleTabChange = useCallback(
    (tab) => {
      pushQuery({ active_tab: tab });
    },
    [pushQuery]
  );

  const createGRNMutation = useMemo(
    () => ({
      isPending: createPending,
      mutateAsync: async (payload) => {
        try {
          setCreatePending(true);
          const result = await createGoodsReceipt(payload);
          refreshPage();
          return result;
        } finally {
          setCreatePending(false);
        }
      },
    }),
    [createPending, refreshPage]
  );

  const kpis = useMemo(
    () => ({
      readyForEncoding: deliveryReceipts.length,
      encodingInProgress: deliveryReceipts.filter((dr) => dr.status === "warehouse_encoding").length,
      completedToday: 0,
      accuracy: "100%",
    }),
    [deliveryReceipts]
  );

  const loadCatalogForDR = useCallback(async (drId) => {
    if (!drId) return { productMasters: [], variants: [] };
    if (catalog.drId === drId && (catalog.productMasters.length > 0 || catalog.variants.length > 0)) {
      return { productMasters: catalog.productMasters, variants: catalog.variants };
    }

    try {
      setCatalogLoading(true);
      setCatalogError("");
      const nextCatalog = await fetchGoodsReceiptCatalog(drId);
      setCatalog({ drId, productMasters: nextCatalog.productMasters, variants: nextCatalog.variants });
      return nextCatalog;
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Failed to load catalog data.";
      setCatalogError(message);
      throw error;
    } finally {
      setCatalogLoading(false);
    }
  }, [catalog.drId, catalog.productMasters, catalog.variants]);

  const clearCatalog = useCallback(() => {
    setCatalog({ drId: null, productMasters: [], variants: [] });
    setCatalogError("");
  }, []);

  return {
    currentUser: lookups.current_user || null,
    deliveryReceipts,
    allDeliveryReceipts: deliveryReceipts,
    loadingDRs: false,
    fetchNextPendingPage,
    pendingPagination,
    pendingFilters,
    setPendingPage,
    setPendingFilters,
    hasNextPendingPage: (pendingPagination.page || 1) < (pendingPagination.last_page || 1),
    isFetchingNextPendingPage: isFetchingPending,
    isFetchingPendingList: isFetchingPending,
    loadingGRNs: false,
    productMasters: catalog.productMasters,
    variants: catalog.variants,
    catalogLoading,
    catalogError,
    loadCatalogForDR,
    clearCatalog,
    suppliers: lookups.suppliers || [],
    warehouses: lookups.warehouses || [],
    companyInfo: lookups.company_info || null,
    createGRNMutation,
    mainWarehouse,
    kpis,
    allGRNs,
    grnPagination,
    grnFilters,
    setGrnPage,
    setGrnFilters,
    isFetchingGRNList: isFetchingGrn,
    activeTab,
    handleTabChange,
    prefetchCatalogData: () => {},
    refreshPage,
  };
}
