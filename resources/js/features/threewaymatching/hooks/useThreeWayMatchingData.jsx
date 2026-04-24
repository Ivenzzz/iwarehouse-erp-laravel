import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCurrentUser,
  listDeliveryReceipts,
  listGoodsReceipts,
  listProductMasters,
  listProductVariants,
  listPurchaseOrders,
  listSuppliers,
} from "../services/threeWayMatchingApi";
import { buildMatchRecords } from "../utils/threeWayMatchingTransforms";

export function useThreeWayMatchingData() {
  const purchaseOrdersQuery = useQuery({
    queryKey: ["threeWayMatching", "purchaseOrders"],
    queryFn: listPurchaseOrders,
    initialData: [],
  });

  const deliveryReceiptsQuery = useQuery({
    queryKey: ["threeWayMatching", "deliveryReceipts"],
    queryFn: listDeliveryReceipts,
    initialData: [],
  });

  const goodsReceiptsQuery = useQuery({
    queryKey: ["threeWayMatching", "goodsReceipts"],
    queryFn: listGoodsReceipts,
    initialData: [],
  });

  const suppliersQuery = useQuery({
    queryKey: ["threeWayMatching", "suppliers"],
    queryFn: listSuppliers,
    initialData: [],
  });

  const productMastersQuery = useQuery({
    queryKey: ["threeWayMatching", "productMasters"],
    queryFn: listProductMasters,
    initialData: [],
  });

  const productVariantsQuery = useQuery({
    queryKey: ["threeWayMatching", "productVariants"],
    queryFn: listProductVariants,
    initialData: [],
  });

  const currentUserQuery = useQuery({
    queryKey: ["threeWayMatching", "currentUser"],
    queryFn: getCurrentUser,
  });

  const loading =
    purchaseOrdersQuery.isLoading ||
    deliveryReceiptsQuery.isLoading ||
    goodsReceiptsQuery.isLoading ||
    suppliersQuery.isLoading ||
    productMastersQuery.isLoading ||
    productVariantsQuery.isLoading ||
    currentUserQuery.isLoading;

  const error =
    purchaseOrdersQuery.error ||
    deliveryReceiptsQuery.error ||
    goodsReceiptsQuery.error ||
    suppliersQuery.error ||
    productMastersQuery.error ||
    productVariantsQuery.error ||
    currentUserQuery.error ||
    null;

  const matches = useMemo(
    () =>
      buildMatchRecords({
        purchaseOrders: purchaseOrdersQuery.data || [],
        deliveryReceipts: deliveryReceiptsQuery.data || [],
        goodsReceipts: goodsReceiptsQuery.data || [],
        suppliers: suppliersQuery.data || [],
        productMasters: productMastersQuery.data || [],
        productVariants: productVariantsQuery.data || [],
      }),
    [
      purchaseOrdersQuery.data,
      deliveryReceiptsQuery.data,
      goodsReceiptsQuery.data,
      suppliersQuery.data,
      productMastersQuery.data,
      productVariantsQuery.data,
    ]
  );

  return {
    matches,
    currentUser: currentUserQuery.data || null,
    loading,
    error,
  };
}
