import { useCallback } from "react";
import axios from "axios";

export function useDRHistory() {
  const getHistoryChain = useCallback(async (dr) => {
    if (!dr?.id) return [];
    const { data } = await axios.get(route("delivery-receipts.history", dr.id));
    return data?.history || [];
  }, []);

  const extractPhotosFromDR = useCallback((dr) => {
    const allFiles = [];
    const uploads = dr.uploads_json || dr.uploads || {};

    if (uploads.box_photos?.length > 0) {
      allFiles.push(...uploads.box_photos.map((url) => ({ url, type: "image", label: "Box Photo" })));
    }
    if (uploads.vendor_dr_url) {
      const ext = uploads.vendor_dr_url.split(".").pop().toLowerCase();
      allFiles.push({ url: uploads.vendor_dr_url, type: ext === "pdf" ? "pdf" : "image", label: "Vendor DR/Invoice" });
    }
    if (uploads.waybill_url) {
      const ext = uploads.waybill_url.split(".").pop().toLowerCase();
      allFiles.push({ url: uploads.waybill_url, type: ext === "pdf" ? "pdf" : "image", label: "Waybill/POD" });
    }
    if (uploads.freight_invoice_url) {
      const ext = uploads.freight_invoice_url.split(".").pop().toLowerCase();
      allFiles.push({ url: uploads.freight_invoice_url, type: ext === "pdf" ? "pdf" : "image", label: "Freight Invoice" });
    }
    return allFiles;
  }, []);

  return { getHistoryChain, extractPhotosFromDR };
}
