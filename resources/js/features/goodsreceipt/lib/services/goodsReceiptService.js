import { router } from "@inertiajs/react";

function readGoodsReceiptFlash(page, key, fallback = null) {
  return page?.props?.flash?.goods_receipt_api?.[key] ?? fallback;
}

function inertiaPost(url, data, key, { forceFormData = false } = {}) {
  return new Promise((resolve, reject) => {
    router.post(url, data, {
      preserveState: true,
      preserveScroll: true,
      forceFormData,
      onSuccess: (page) => resolve(readGoodsReceiptFlash(page, key, {})),
      onError: (errors) => reject(new Error(errors?.message || "Request failed.")),
    });
  });
}

function inertiaPatch(url, data, key) {
  return new Promise((resolve, reject) => {
    router.patch(url, data, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: (page) => resolve(readGoodsReceiptFlash(page, key, {})),
      onError: (errors) => reject(new Error(errors?.message || "Request failed.")),
    });
  });
}

function inertiaGet(url, data, key) {
  return new Promise((resolve, reject) => {
    router.get(url, data, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onSuccess: (page) => resolve(readGoodsReceiptFlash(page, key, {})),
      onError: (errors) => reject(new Error(errors?.message || "Request failed.")),
    });
  });
}

export async function createGoodsReceipt(payload) {
  return inertiaPost(route("goods-receipts.store"), payload, "create_goods_receipt");
}

export async function validateDuplicates(items) {
  const payload = await inertiaPost(route("goods-receipts.validate-duplicates"), { items }, "validate_duplicates");
  return payload?.duplicates || [];
}

export async function markDeliveryReceiptComplete(deliveryReceiptId) {
  await inertiaPatch(route("goods-receipts.mark-dr-complete", deliveryReceiptId), {}, "mark_dr_complete");
}

export async function uploadPurchaseFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const payload = await inertiaPost(route("goods-receipts.upload"), formData, "upload_purchase_file", { forceFormData: true });
  return payload?.file_url || "";
}

export async function validateCSVOnServer(csvText) {
  return inertiaPost(route("goods-receipts.purchase-import.validate-csv"), { csvText }, "validate_csv");
}

export async function resolveConflictsOnServer(brandConflicts) {
  return inertiaPost(route("goods-receipts.purchase-import.resolve-conflicts"), { brandConflicts }, "resolve_conflicts");
}

export async function executeDirectPurchaseImport({ formData, validatedRows, mainWarehouse }) {
  const payload = await inertiaPost(
    route("goods-receipts.purchase-import.execute"),
    {
      formData,
      warehouseId: mainWarehouse.id,
      validatedRows,
    },
    "execute_purchase_import",
    { forceFormData: true }
  );

  if (payload?.duplicates) return { duplicates: payload.duplicates };

  return {
    drNumber: payload?.drNumber,
    grnNumber: payload?.grnNumber,
    itemCount: payload?.itemCount,
  };
}

export async function fetchGoodsReceiptCatalog(drId) {
  const payload = await inertiaGet(route("goods-receipts.catalog"), { dr_id: drId }, "catalog");

  return {
    productMasters: payload?.product_masters || [],
    variants: payload?.variants || [],
  };
}

export async function fetchGoodsReceiptDetail(goodsReceiptId) {
  const payload = await inertiaGet(route("goods-receipts.show", goodsReceiptId), {}, "detail");
  return payload?.goods_receipt || null;
}
