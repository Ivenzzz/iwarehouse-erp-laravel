import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useEffect, useState } from "react";

const STOCK_TRANSFER_PAGE_SIZE = 50;
const STOCK_TRANSFER_COUNT_PAGE_SIZE = 200;
const STOCK_TRANSFER_SEARCH_LIMIT = 500;

const CONDITION_SUFFIXES = {
  bn: "Brand New",
  cpo: "Certified Pre-Owned",
};

const listStockTransfersPage = async ({ offset = 0, limit = STOCK_TRANSFER_PAGE_SIZE } = {}) =>
  base44.entities.StockTransfer.list("-created_date", limit, offset);

const listAllStockTransfers = async () => {
  const allTransfers = [];
  let offset = 0;

  while (true) {
    const page = await listStockTransfersPage({
      offset,
      limit: STOCK_TRANSFER_COUNT_PAGE_SIZE,
    });

    if (!page?.length) {
      break;
    }

    allTransfers.push(...page);
    offset += page.length;

    if (page.length < STOCK_TRANSFER_COUNT_PAGE_SIZE) {
      break;
    }
  }

  return allTransfers;
};

const parseTransferSearchTerm = (rawQuery = "") => {
  let normalizedQuery = rawQuery.trim();
  let condition = null;
  const lowerQuery = normalizedQuery.toLowerCase();

  if (lowerQuery.endsWith(" bn")) {
    condition = CONDITION_SUFFIXES.bn;
    normalizedQuery = normalizedQuery.slice(0, -3).trim();
  } else if (lowerQuery.endsWith(" cpo")) {
    condition = CONDITION_SUFFIXES.cpo;
    normalizedQuery = normalizedQuery.slice(0, -4).trim();
  } else if (lowerQuery === "bn" || lowerQuery === "cpo") {
    condition = CONDITION_SUFFIXES[lowerQuery];
    normalizedQuery = "";
  }

  return {
    normalizedQuery,
    condition,
  };
};

const uniqById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const tokenizeSearch = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export function useStockTransferData() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const {
    data: stockTransfersData,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["stockTransfers"],
    queryFn: ({ pageParam = 0 }) => listStockTransfersPage({ offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.length || lastPage.length < STOCK_TRANSFER_PAGE_SIZE) {
        return undefined;
      }

      return allPages.reduce((total, page) => total + page.length, 0);
    },
    initialData: {
      pages: [],
      pageParams: [0],
    },
  });

  const transfers = stockTransfersData?.pages?.flatMap((page) => page) || [];

  const { data: allTransfers = [], isLoading: isLoadingAllTransfers } = useQuery({
    queryKey: ["stockTransfers", "all"],
    queryFn: listAllStockTransfers,
    initialData: [],
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouse.list(),
    initialData: [],
  });

  const { data: productMasters = [] } = useQuery({
    queryKey: ["productMasters"],
    queryFn: () => base44.entities.ProductMaster.list(),
    initialData: [],
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["variants"],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
  });

  const { data: productBrands = [] } = useQuery({
    queryKey: ["productBrands"],
    queryFn: () => base44.entities.ProductBrand.list(),
    initialData: [],
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: [],
  });

  const { data: companyInfo } = useQuery({
    queryKey: ["companyInfo"],
    queryFn: async () => {
      const list = await base44.entities.CompanyInfo.list();
      return list[0] || null;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: salesTransactions = [] } = useQuery({
    queryKey: ["salesTransactions"],
    queryFn: () => base44.entities.SalesTransaction.list(),
    initialData: [],
  });

  const invalidateStockTransferQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["stockTransfers"] });
    queryClient.invalidateQueries({ queryKey: ["stockTransfers", "all"] });
  };

  const searchTransferProducts = async ({ sourceLocationId, query }) => {
    const { normalizedQuery, condition } = parseTransferSearchTerm(query);

    if (!sourceLocationId || (!normalizedQuery && !condition)) {
      return [];
    }

    const productMasterById = new Map(productMasters.map((productMaster) => [productMaster.id, productMaster]));
    const brandById = new Map(productBrands.map((brand) => [brand.id, brand]));
    const searchTokens = tokenizeSearch(normalizedQuery);

    const baseInventoryRows = await base44.entities.Inventory.filter(
      {
        warehouse_id: sourceLocationId,
        status: "available",
      },
      "-created_date",
      STOCK_TRANSFER_SEARCH_LIMIT
    );

    const textMatchedInventoryRows = baseInventoryRows.filter((item) => {
      const variant = variants.find((entry) => entry.id === item.variant_id);
      if (!variant) return false;

      const matchesCondition = !condition || variant.condition === condition;
      if (!matchesCondition) {
        return false;
      }

      if (searchTokens.length === 0) {
        return true;
      }

      const productMaster = productMasterById.get(variant.product_master_id);
      const brandName = brandById.get(productMaster?.brand_id)?.name || "";
      const productModel = productMaster?.model || "";
      const productName = productMaster?.name || "";
      const masterSku = productMaster?.master_sku || "";
      const searchableText = [
        variant.variant_name,
        variant.variant_sku,
        brandName,
        productModel,
        productName,
        masterSku,
        [brandName, productModel].filter(Boolean).join(" "),
        [brandName, productName].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTokens.every((token) => searchableText.includes(token));
    });

    return uniqById(textMatchedInventoryRows.filter((item) => item?.variant_id));
  };

  const fetchTransferProductInventory = async ({ sourceLocationId, variantId }) => {
    if (!sourceLocationId || !variantId) {
      return [];
    }

    return base44.entities.Inventory.filter(
      {
        warehouse_id: sourceLocationId,
        status: "available",
        variant_id: variantId,
      },
      "-created_date",
      500
    );
  };

  const createTransferMutation = useMutation({
    mutationFn: (data) => base44.entities.StockTransfer.create(data),
    onSuccess: invalidateStockTransferQueries,
  });

  const updateTransferMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StockTransfer.update(id, data),
    onSuccess: invalidateStockTransferQueries,
  });

  const deleteTransferMutation = useMutation({
    mutationFn: (id) => base44.entities.StockTransfer.delete(id),
    onSuccess: invalidateStockTransferQueries,
  });

  return {
    currentUser,
    transfers,
    allTransfers,
    isLoading,
    isFetchingTransfers: isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isLoadingAllTransfers,
    warehouses,
    productMasters,
    variants,
    productBrands,
    inventory,
    customers,
    suppliers,
    companyInfo,
    users,
    salesTransactions,
    searchTransferProducts,
    fetchTransferProductInventory,
    createTransferMutation,
    updateTransferMutation,
    deleteTransferMutation,
    queryClient,
  };
}
