import axios from "axios";

export async function createGoodsReceipt(payload) {
  const response = await axios.post(route("goods-receipts.store"), payload);
  return response.data;
}

export async function validateDuplicates(items) {
  const response = await axios.post(route("goods-receipts.validate-duplicates"), { items });
  return response.data?.duplicates || [];
}

export async function markDeliveryReceiptComplete(deliveryReceiptId) {
  await axios.patch(route("goods-receipts.mark-dr-complete", deliveryReceiptId));
}

export async function uploadPurchaseFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(route("goods-receipts.upload"), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.file_url || "";
}

export async function validateCSVOnServer(csvText) {
  const response = await axios.post(route("goods-receipts.purchase-import.validate-csv"), { csvText });
  return response.data;
}

export async function resolveConflictsOnServer(brandConflicts) {
  const response = await axios.post(route("goods-receipts.purchase-import.resolve-conflicts"), { brandConflicts });
  return response.data;
}

export async function executeDirectPurchaseImport({ formData, validatedRows, mainWarehouse }) {
  const response = await axios.post(route("goods-receipts.purchase-import.execute"), {
    formData,
    warehouseId: mainWarehouse.id,
    validatedRows,
  });

  const result = response.data || {};
  if (result.duplicates) return { duplicates: result.duplicates };

  return {
    drNumber: result.drNumber,
    grnNumber: result.grnNumber,
    itemCount: result.itemCount,
  };
}

export async function fetchGoodsReceiptCatalog(drId) {
  const response = await axios.get(route("goods-receipts.catalog"), {
    params: { dr_id: drId },
  });

  return {
    productMasters: response.data?.product_masters || [],
    variants: response.data?.variants || [],
  };
}

export async function fetchGoodsReceiptDetail(goodsReceiptId) {
  const response = await axios.get(route("goods-receipts.show", goodsReceiptId));
  return response.data?.goods_receipt || null;
}
