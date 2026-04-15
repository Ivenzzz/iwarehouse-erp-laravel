import { useCallback, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { createGoodsReceipt } from "../services/goodsReceiptService";

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

  const pending = pageData.pending_delivery_receipts || {};
  const grns = pageData.goods_receipts || {};
  const lookups = pageData.lookups || {};

  const deliveryReceipts = pending.data || [];
  const allGRNs = grns.data || [];
  const pendingPagination = pending.pagination || {};
  const grnPagination = grns.pagination || {};
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

  const fetchNextPage = useCallback(() => {
    if ((grnPagination.page || 1) >= (grnPagination.last_page || 1)) return;
    pushQuery({ grn_page: (grnPagination.page || 1) + 1, active_tab: "goods-receipts" }, setIsFetchingGrn);
  }, [grnPagination.last_page, grnPagination.page, pushQuery]);

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

  return {
    currentUser: lookups.current_user || null,
    deliveryReceipts,
    allDeliveryReceipts: deliveryReceipts,
    loadingDRs: false,
    fetchNextPendingPage,
    hasNextPendingPage: (pendingPagination.page || 1) < (pendingPagination.last_page || 1),
    isFetchingNextPendingPage: isFetchingPending,
    loadingGRNs: false,
    productMasters: lookups.product_masters || [],
    variants: lookups.variants || [],
    suppliers: lookups.suppliers || [],
    warehouses: lookups.warehouses || [],
    brands: lookups.brands || [],
    categories: lookups.categories || [],
    subcategories: lookups.subcategories || [],
    pos: lookups.pos || [],
    companyInfo: lookups.company_info || null,
    createGRNMutation,
    mainWarehouse,
    kpis,
    allGRNs,
    fetchNextPage,
    hasNextPage: (grnPagination.page || 1) < (grnPagination.last_page || 1),
    isFetchingNextPage: isFetchingGrn,
    activeTab,
    handleTabChange,
    prefetchCatalogData: () => {},
    refreshPage,
  };
}

