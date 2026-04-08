import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  fetchInventoryPage,
  enrichInventoryItems,
  applyClientInventoryFilters,
  INVENTORY_FETCH_LIMIT,
  INVENTORY_EXACT_LOOKUP_LIMIT,
  isExactInventoryIdSearch,
  matchesBrowseFiltersWithoutSearch,
  searchInventoryExactMatches,
} from "@/components/inventory/services/inventoryQueryService";

const EXACT_LOOKUP_DEBOUNCE_MS = 350;

export function useInventoryData(filters) {
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search ?? "");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(filters.search ?? "");
    }, EXACT_LOOKUP_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

  const inventoryQuery = useQuery({
    queryKey: ["inventory", "capped"],
    queryFn: () => fetchInventoryPage({ skip: 0, limit: INVENTORY_FETCH_LIMIT }),
    initialData: [],
  });

  const productMastersQuery = useQuery({
    queryKey: ["productMasters"],
    queryFn: () => base44.entities.ProductMaster.list(),
    initialData: [],
  });

  const variantsQuery = useQuery({
    queryKey: ["variants"],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouse.list(),
    initialData: [],
  });

  const brandsQuery = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.ProductBrand.list(),
    initialData: [],
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list(),
    initialData: [],
  });

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: [],
  });

  const subcategoriesQuery = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.ProductSubcategory.list(),
    initialData: [],
  });

  const cappedInventory = inventoryQuery.data || [];
  const enrichedInventory = useMemo(
    () =>
      enrichInventoryItems({
        items: cappedInventory,
        productMasters: productMastersQuery.data,
        variants: variantsQuery.data,
        warehouses: warehousesQuery.data,
        brands: brandsQuery.data,
      }),
    [
      cappedInventory,
      productMastersQuery.data,
      variantsQuery.data,
      warehousesQuery.data,
      brandsQuery.data,
    ]
  );
  const filteredInventory = useMemo(
    () =>
      applyClientInventoryFilters({
        items: enrichedInventory,
        filters,
      }),
    [enrichedInventory, filters]
  );
  const shouldRunExactLookup = useMemo(
    () =>
      isExactInventoryIdSearch(debouncedSearch) &&
      filteredInventory.length === 0 &&
      !inventoryQuery.isLoading,
    [debouncedSearch, filteredInventory.length, inventoryQuery.isLoading]
  );
  const exactLookupQuery = useQuery({
    queryKey: ["inventory", "exact-lookup", debouncedSearch, filters.sorting],
    queryFn: () =>
      searchInventoryExactMatches({
        search: debouncedSearch,
        sorting: filters.sorting,
        limit: INVENTORY_EXACT_LOOKUP_LIMIT,
      }),
    enabled: shouldRunExactLookup,
    staleTime: 30_000,
  });
  const exactLookupRows = exactLookupQuery.data?.rows || [];
  const exactLookupInventory = useMemo(
    () =>
      enrichInventoryItems({
        items: exactLookupRows,
        productMasters: productMastersQuery.data,
        variants: variantsQuery.data,
        warehouses: warehousesQuery.data,
        brands: brandsQuery.data,
      }).map((item) => {
        const matchesBrowseFilters = matchesBrowseFiltersWithoutSearch(item, filters);
        return {
          ...item,
          _isExactLookupFallback: true,
          _matchesBrowseFilters: matchesBrowseFilters,
          _outsideCurrentFilters: !matchesBrowseFilters,
        };
      }),
    [
      exactLookupRows,
      productMastersQuery.data,
      variantsQuery.data,
      warehousesQuery.data,
      brandsQuery.data,
      filters,
    ]
  );
  const mergedInventory = useMemo(() => {
    const seenIds = new Set();
    const rows = [];

    filteredInventory.forEach((item) => {
      seenIds.add(item.id);
      rows.push(item);
    });

    exactLookupInventory.forEach((item) => {
      if (seenIds.has(item.id)) return;
      rows.push(item);
    });

    return rows;
  }, [filteredInventory, exactLookupInventory]);

  return {
    inventory: mergedInventory,
    localInventory: filteredInventory,
    pagedInventory: cappedInventory,
    enrichedInventory,
    productMasters: productMastersQuery.data,
    variants: variantsQuery.data,
    warehouses: warehousesQuery.data,
    brands: brandsQuery.data,
    categories: categoriesQuery.data,
    subcategories: subcategoriesQuery.data,
    suppliers: suppliersQuery.data,
    isFetchingInventory: inventoryQuery.isFetching,
    inventoryError: inventoryQuery.error,
    isSearchingFullInventory: exactLookupQuery.isFetching,
    exactLookupActive: shouldRunExactLookup,
    exactLookupFoundCount: exactLookupInventory.length,
    exactLookupError: exactLookupQuery.error,
    isLoading:
      inventoryQuery.isLoading ||
      productMastersQuery.isLoading ||
      variantsQuery.isLoading ||
      warehousesQuery.isLoading,
  };
}
