import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useStockData(branchId) {
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
    initialData: [],
  });

  const { data: salesTransactions = [] } = useQuery({
    queryKey: ["salesTransactions"],
    queryFn: () => base44.entities.SalesTransaction.list("-transaction_date"),
    initialData: [],
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => base44.entities.PurchaseOrder.filter({ status: "in_transit" }),
    initialData: [],
  });

  const { data: stockTransfers = [] } = useQuery({
    queryKey: ["stockTransfers"],
    queryFn: () => base44.entities.StockTransfer.filter({ status: "in_transit" }),
    initialData: [],
  });

  const getAggregateVariantStock = (variantIds = [], warehouseId) => {
    if (!variantIds.length) return 0;

    return inventory
      .filter(
        (item) =>
          variantIds.includes(item.variant_id) &&
          item.warehouse_id === warehouseId &&
          item.status === "available"
      )
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  const getAggregateVariantSales = (variantIds = [], warehouseId, days) => {
    if (!variantIds.length) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return salesTransactions
      .filter(
        (tx) =>
          tx.warehouse_id === warehouseId &&
          new Date(tx.transaction_date) >= cutoffDate
      )
      .reduce((sum, tx) => {
        const itemQty = (tx.items || [])
          .filter((item) => variantIds.includes(item.variant_id))
          .reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
        return sum + itemQty;
      }, 0);
  };

  const getAggregateADSMetrics = (variantIds = [], warehouseId) => {
    const sales7 = getAggregateVariantSales(variantIds, warehouseId, 7);
    const sales14 = getAggregateVariantSales(variantIds, warehouseId, 14);
    const sales28 = getAggregateVariantSales(variantIds, warehouseId, 28);

    return {
      sales7,
      sales14,
      sales28,
      ads7: sales7 / 7,
      ads14: sales14 / 14,
      ads28: sales28 / 28,
    };
  };

  const getAggregateStockByBranches = (variantIds = []) => {
    const variantStock = inventory.filter(
      (item) => variantIds.includes(item.variant_id) && item.status === "available"
    );

    return variantStock.reduce((acc, item) => {
      const warehouseId = item.warehouse_id;
      acc[warehouseId] = (acc[warehouseId] || 0) + (item.quantity || 0);
      return acc;
    }, {});
  };

  const getAggregateIncomingPOStock = (variantIds = [], deliveryWarehouseId) => {
    if (!variantIds.length) return 0;

    return purchaseOrders.reduce((total, po) => {
      if (po.delivery_warehouse_id === deliveryWarehouseId) {
        const itemQuantity = (po.items || []).reduce((sum, item) => {
          return sum + (variantIds.includes(item.variant_id) ? item.quantity || 0 : 0);
        }, 0);
        return total + itemQuantity;
      }
      return total;
    }, 0);
  };

  const getAggregateIncomingStockTransferToBranch = (variantIds = [], destinationWarehouseId) => {
    let totalIncoming = 0;
    let earliestETA = null;

    stockTransfers.forEach((transfer) => {
      if (transfer.destination_location_id === destinationWarehouseId) {
        (transfer.product_lines || []).forEach((line) => {
          if (variantIds.includes(line.variant_id)) {
            totalIncoming += line.quantity_demanded || 0;
            if (transfer.scheduled_date) {
              const transferETA = new Date(transfer.scheduled_date);
              if (!earliestETA || transferETA < earliestETA) {
                earliestETA = transferETA;
              }
            }
          }
        });
      }
    });

    return { quantity: totalIncoming, eta: earliestETA };
  };

  const getVariantIdsForRequestItem = (item, productVariants = []) =>
    (item?.variant_id ? [item.variant_id] : []).filter(Boolean);

  return {
    getAggregateVariantStock,
    getAggregateVariantSales,
    getAggregateADSMetrics,
    getAggregateStockByBranches,
    getAggregateIncomingPOStock,
    getAggregateIncomingStockTransferToBranch,
    getVariantIdsForRequestItem,
    inventory,
  };
}
