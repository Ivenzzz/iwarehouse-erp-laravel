import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { base44 } from "@/api/base44Client";
import QRCode from "qrcode";

function formatCurrencyPHP(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LabelValue({ label, value }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 text-xs">
      <div className="text-slate-500 dark:text-slate-400 font-medium">{label}</div>
      <div className="text-slate-900 dark:text-slate-100 break-words">{value || "-"}</div>
    </div>
  );
}

export default function InventoryItemDetailsDialog({
  open,
  onOpenChange,
  item,
  productMasters = [],
  variants = [],
  brands = [],
  categories = [],
  subcategories = [],
}) {
  const [purchaseRef, setPurchaseRef] = useState("");
  const [dateArrived, setDateArrived] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const pm = useMemo(() => productMasters.find((p) => p.id === item?.product_master_id), [item, productMasters]);
  const variant = useMemo(() => variants.find((v) => v.id === item?.variant_id), [item, variants]);
  const brand = useMemo(() => (pm ? brands.find((b) => b.id === pm.brand_id) : null), [pm, brands]);
  const category = useMemo(() => (pm ? categories.find((c) => c.id === pm.category_id) : null), [pm, categories]);
  const subcategory = useMemo(() => (pm ? (subcategories || []).find((s) => s.id === pm.subcategory_id) : null), [pm, subcategories]);

  const identifier = item?.imei1 || item?.imei2 || item?.serial_number || "";

  const color = useMemo(() => {
    const attrs = variant?.attributes || {};
    return attrs.color || attrs.Color || item?.purchase_file_data?.color || "";
  }, [variant, item]);

  const ramSize = useMemo(() => {
    const a = variant?.attributes || {};
    return a.RAM || a.ram || a.memory || "";
  }, [variant]);

  const romSize = useMemo(() => {
    const a = variant?.attributes || {};
    return a.ROM || a.rom || a.Storage || a.storage || "";
  }, [variant]);

  const ramType = item?.purchase_file_data?.ram_type || "";
  const ramSlots = item?.purchase_file_data?.ram_slots || "";
  const romType = item?.purchase_file_data?.rom_type || "";

  const cpu = item?.cpu || pm?.fixed_specifications?.platform_cpu || "";
  const gpu = item?.gpu || pm?.fixed_specifications?.platform_gpu || "";
  const os = item?.purchase_file_data?.os || pm?.fixed_specifications?.platform_os || "";
  const software = item?.purchase_file_data?.software || "";
  const resolution = item?.purchase_file_data?.resolution || pm?.fixed_specifications?.display_resolution || "";
  const productType = item?.purchase_file_data?.product_type || "";
  const condition = variant?.condition || item?.purchase_file_data?.condition || "";

  const model = pm?.model || "";
  const status = item?.status || "";

  // Fetch purchase reference & date arrived (best-effort as per spec)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setPurchaseRef("");
      setDateArrived("");

      // 1) Try DeliveryReceipt match (by serial/IMEI) — schema may not include serials. Skipped if no identifier.
      let drFound = null;
      try {
        if (identifier) {
          // Fallback: fetch a small set and attempt to match loosely by variant/product (no serials in schema)
          const drs = await base44.entities.DeliveryReceipt.list();
          // Unable to reliably match by identifier due to schema; keep null.
          drFound = null;
        }
      } catch (e) {
        // ignore
      }

      if (!cancelled && drFound) {
        setPurchaseRef(drFound.dr_number || item?.grn_number || item?.purchase || "");
        setDateArrived(drFound.receipt_date || "");
        return;
      }

      // 2) Try GoodsReceipt via GRN number
      try {
        if (item?.grn_number) {
          const grns = await base44.entities.GoodsReceipt.filter({ "receipt_info.grn_number": item.grn_number });
          if (!cancelled && Array.isArray(grns) && grns.length > 0) {
            const grn = grns[0];
            setPurchaseRef(grn?.receipt_info?.grn_number || item?.purchase || "");
            setDateArrived(grn?.receipt_info?.receipt_date || "");
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      // 3) Try GoodsReceipt by scanning serials/IMEIs in recent records
      try {
        if (identifier) {
          const recent = await base44.entities.GoodsReceipt.list();
          let matched = null;
          for (const grn of recent) {
            const lines = grn?.items || [];
            for (const line of lines) {
              const serials = line?.serials || [];
              if (serials.some((s) => s?.serial_number === item?.serial_number || s?.imei1 === item?.imei1 || s?.imei2 === item?.imei2)) {
                matched = grn; break;
              }
            }
            if (matched) break;
          }
          if (!cancelled && matched) {
            setPurchaseRef(matched?.receipt_info?.grn_number || item?.purchase || "");
            setDateArrived(matched?.receipt_info?.receipt_date || "");
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      // 4) Fallback to inventory.purchase
      if (!cancelled) {
        setPurchaseRef(item?.purchase || "");
      }
    }

    if (open && item) run();
    return () => { cancelled = true; };
  }, [open, item, identifier]);

  // Build QR preview (data URL) following sticker template
  useEffect(() => {
    let cancelled = false;
    async function buildQR() {
      if (!identifier) { setQrUrl(""); return; }
      try {
        const dataUrl = await QRCode.toDataURL(identifier, { width: 256, margin: 1, errorCorrectionLevel: "M" });
        if (!cancelled) setQrUrl(dataUrl);
      } catch (e) {
        if (!cancelled) setQrUrl("");
      }
    }
    if (open) buildQR();
    return () => { cancelled = true; };
  }, [open, identifier]);

  const headerTitle = [brand?.name, model, variant?.variant_name].filter(Boolean).join(" ");
  const imeiSerial = identifier || "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] overflow-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>

        {/* Title strip */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 mb-4 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-sm font-semibold">{headerTitle || "Item"}</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{imeiSerial}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Details */}
          <div className="space-y-5">
            {/* General Information */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">General Information</div>
              <div className="space-y-2">
                <LabelValue label="IMEI/Serial" value={imeiSerial} />
                <LabelValue label="Category" value={category?.name} />
                <LabelValue label="Subcategory" value={subcategory?.name} />
                <LabelValue label="Status" value={status?.replace(/_/g, " ") || "-"} />
                <LabelValue label="Product Type" value={productType} />
                <LabelValue label="Condition" value={condition} />
                <LabelValue label="Color" value={color} />
              </div>
            </div>

            <Separator className="my-1" />

            {/* Specifications */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Specifications</div>
              <div className="space-y-2">
                <LabelValue label="Model" value={model} />
                <LabelValue label="RAM" value={[ramSize, ramType, ramSlots && `${ramSlots} slots`].filter(Boolean).join(" ")} />
                <LabelValue label="ROM" value={[romSize, romType].filter(Boolean).join(" ")} />
                <LabelValue label="Warranty" value={item?.warranty_description} />
                {cpu ? <LabelValue label="CPU" value={cpu} /> : null}
                {gpu ? <LabelValue label="GPU" value={gpu} /> : null}
                {os ? <LabelValue label="Operating System" value={os} /> : null}
                {software ? <LabelValue label="Software" value={software} /> : null}
                {resolution ? <LabelValue label="Resolution" value={resolution} /> : null}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Pricing */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Pricing Information</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Cost</div>
                  <div className="font-semibold">{formatCurrencyPHP(item?.cost_price)}</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Cash Price</div>
                  <div className="font-semibold">{formatCurrencyPHP(item?.cash_price)}</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">SRP</div>
                  <div className="font-semibold">{formatCurrencyPHP(item?.srp)}</div>
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Purchasing & Logistics */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Purchasing & Logistics</div>
              <div className="space-y-2">
                <LabelValue label="Purchase Reference" value={purchaseRef} />
                <LabelValue label="Date Arrived" value={dateArrived ? new Date(dateArrived).toLocaleString() : "-"} />
                <LabelValue label="Encoded Date" value={item?.encoded_date ? new Date(item.encoded_date).toLocaleString() : "-"} />
                <LabelValue label="Encoded By" value={item?.encoder || item?.created_by || "-"} />
              </div>
            </div>
          </div>

          {/* Right: QR Sticker Preview */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">QR Sticker Preview</div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-950">
              <div className="text-sm font-bold">{(brand?.name || "").toUpperCase()} {(model || "").toUpperCase()}</div>
              <div className="text-xs mt-1">{[ramSize && romSize ? `${ramSize}/${romSize}` : (ramSize || romSize || ""), color].filter(Boolean).join(" ")}</div>
              <div className="text-xs">{[cpu, gpu].filter(Boolean).join(" | ")}</div>
              <div className="text-xs mt-1">{condition || "Brand New"}</div>
              {item?.warranty_description && (
                <div className="text-[11px] mt-1 whitespace-pre-wrap">{String(item.warranty_description)}</div>
              )}
              <div className="mt-2 text-sm font-semibold">CASH {formatCurrencyPHP(item?.cash_price)}</div>
              <div className="text-xs">SRP {formatCurrencyPHP(item?.srp)}</div>

              <div className="mt-3 flex flex-col items-center gap-1">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR" className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 border border-dashed border-slate-300 rounded" />
                )}
                <div className="font-mono text-xs tracking-wide">{identifier || "-"}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}