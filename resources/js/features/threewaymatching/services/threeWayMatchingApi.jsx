import { base44 } from "@/api/base44Client";

export const listPurchaseOrders = () => base44.entities.PurchaseOrder.list("-created_date");
export const listDeliveryReceipts = () => base44.entities.DeliveryReceipt.list("-created_date");
export const listGoodsReceipts = () => base44.entities.GoodsReceipt.list("-created_date");
export const listSuppliers = () => base44.entities.Supplier.list();
export const listProductMasters = () => base44.entities.ProductMaster.list();
export const listProductVariants = () => base44.entities.ProductVariant.list();
export const getCurrentUser = () => base44.auth.me();

export const uploadPaymentDocument = async (file) => {
  const response = await base44.integrations.Core.UploadFile({ file });
  return response?.file_url || response?.url || "";
};

export const updatePurchaseOrderPayable = ({ purchaseOrderId, payableJson }) =>
  base44.entities.PurchaseOrder.update(purchaseOrderId, {
    payable_json: payableJson,
  });
