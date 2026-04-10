import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  XCircle,
  QrCode,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Receipt,
  Package,
  Store,
  Barcode,
  Download,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { printQRStickers, QRStickerPreview } from "@/components/shared/services/qrStickerPrintService";
import PaymentMethodCard from "@/components/salesreport/PaymentMethodCard";
import { getTransactionDiscountProofs, getTransactionDiscountTotal } from "@/utils/transactionDiscounts";

const formatCurrency = (amount) => {
  return (amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatPHP = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount || 0);
};

const downloadFile = async (event, url, label) => {
  event?.stopPropagation?.();

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedLabel = (label || "document").replace(/[\\/:*?"<>|]+/g, "_");

    link.href = objectUrl;
    link.download = sanitizedLabel;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const sectionCardClassName =
  "overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const sectionHeadingClassName =
  "mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100";

const inventoryBadgeClassName = "text-[10px] px-1.5 h-5";
const inventoryBadgePalette = {
  conditionDefault: "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20",
  conditionCpo: "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  ram: "bg-violet-100/50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  rom: "bg-sky-100/50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  color: "bg-pink-100/50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20",
  warranty: "bg-cyan-100/50 text-cyan-700 border-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-400 dark:border-cyan-400/20",
};

const infoTileClassName =
  "rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950";

const infoTileLabelClassName =
  "mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";

const normalizePaymentMethodName = (value) =>
  (value || "").trim().toLowerCase();

// Document Preview Section
const DocumentsSection = ({ transaction, onViewImage }) => {
  // Collect payment supporting documents
  const paymentSupportingDocs = useMemo(() => {
    const docs = [];
    const payments = transaction?.payments_json?.payments || [];
    payments.forEach((payment, idx) => {
      const supportingUrls = payment.payment_details?.supporting_doc_urls || [];
      supportingUrls.forEach((docItem, docIdx) => {
        // docItem can be an object {url, name, type} or a plain string
        const docUrl = typeof docItem === 'string' ? docItem : docItem?.url;
        const docName = typeof docItem === 'string' ? null : docItem?.name;
        if (docUrl) {
          docs.push({
            key: `payment_${idx}_doc_${docIdx}`,
            label: docName || `${payment.payment_method} - Supporting Doc ${docIdx + 1}`,
            url: docUrl,
          });
        }
      });
    });
    return docs;
  }, [transaction]);

  const discountProofs = getTransactionDiscountProofs(transaction);
  const documents = [
    ...discountProofs.map((proof, index) => ({
      key: `proof_image_url_${index}`,
      label: `Proof of Discount Validation${discountProofs.length > 1 ? ` ${index + 1}` : ""}`,
      url: proof.proof_image_url,
    })),
    {
      key: "official_receipt_url",
      label: "Official Receipt",
      url: transaction?.supporting_documents?.official_receipt_url,
    },
    {
      key: "customer_id_url",
      label: "Customer ID",
      url: transaction?.supporting_documents?.customer_id_url,
    },
    {
      key: "customer_agreement_url",
      label: "Customer Agreement",
      url: transaction?.supporting_documents?.customer_agreement_url,
    },
    ...paymentSupportingDocs,
  ];

  const availableDocs = documents.filter((d) => d.url);
  const unavailableDocs = documents.filter((d) => !d.url);

  return (
    <div className="space-y-3">
      <h4 className={sectionHeadingClassName}>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          <FileText className="w-4 h-4" />
        </span>
        Supporting Documents
      </h4>

      {(availableDocs.length > 0 || unavailableDocs.length > 0) && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {availableDocs.map((doc) => {
            const isImg = /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(doc.url || "");
            return isImg ? (
              <div
                key={doc.key}
                className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800"
                onClick={() => onViewImage({ url: doc.url, label: doc.label })}
              >
                <img src={doc.url} alt={doc.label} className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="text-white text-xs font-medium">View</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 dark:bg-slate-800/80">
                  <p className="flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">{doc.label}</p>
                  <button
                    type="button"
                    onClick={(e) => downloadFile(e, doc.url, doc.label)}
                    className="ml-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                key={doc.key}
                onClick={(e) => downloadFile(e, doc.url, doc.label)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
              >
                <FileText className="h-5 w-5 flex-shrink-0 text-blue-500 dark:text-blue-300" />
                <span className="flex-1 truncate text-xs font-medium">{doc.label}</span>
                <Download className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              </button>
            );
          })}
          {unavailableDocs.map((doc) => (
            <div
              key={doc.key}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex h-24 items-center justify-center bg-slate-100 dark:bg-slate-800/80">
                <div className="space-y-2 px-3 text-center">
                  <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-2 dark:bg-slate-800/80">
                <p className="flex-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{doc.label}</p>
                <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TransactionDetailsDialog({
  open,
  onOpenChange,
  transaction,
  getWarehouseName,
}) {
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Fetch customer details
  const { data: customer } = useQuery({
    queryKey: ["customer", transaction?.customer_id],
    queryFn: async () => {
      if (!transaction?.customer_id) return null;
      const customers = await base44.entities.Customer.filter({
        id: transaction.customer_id,
      });
      return customers?.[0] || null;
    },
    enabled: !!transaction?.customer_id && open,
  });

  // Fetch employee details for sales rep
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: open,
  });

  // Fetch inventory items for additional product details
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-for-stickers"],
    queryFn: () => base44.entities.Inventory.list(),
    enabled: open,
  });

  // Fetch product masters for category lookup
  const { data: productMasters = [] } = useQuery({
    queryKey: ["product-masters-for-stickers"],
    queryFn: () => base44.entities.ProductMaster.list(),
    enabled: open,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands-for-stickers"],
    queryFn: () => base44.entities.ProductBrand.list(),
    enabled: open,
  });

  // Fetch product variants for attributes
  const { data: productVariants = [] } = useQuery({
    queryKey: ["product-variants-for-stickers"],
    queryFn: () => base44.entities.ProductVariant.list(),
    enabled: open,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-stickers"],
    queryFn: () => base44.entities.ProductCategory.list(),
    enabled: open,
  });

  const { data: paymentTypes = [] } = useQuery({
    queryKey: ["payment-types-for-transaction-details"],
    queryFn: () => base44.entities.PaymentType.list(),
    enabled: open,
  });

  // Create lookup maps
  const inventoryMap = useMemo(() => {
    const map = {};
    inventoryItems.forEach(inv => { map[inv.id] = inv; });
    return map;
  }, [inventoryItems]);

  const productMasterMap = useMemo(() => {
    const map = {};
    productMasters.forEach(pm => { map[pm.id] = pm; });
    return map;
  }, [productMasters]);

  const variantMap = useMemo(() => {
    const map = {};
    productVariants.forEach(v => { map[v.id] = v; });
    return map;
  }, [productVariants]);

  const brandMap = useMemo(() => {
    const map = {};
    brands.forEach((brand) => { map[brand.id] = brand; });
    return map;
  }, [brands]);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.id] = c; });
    return map;
  }, [categories]);

  const paymentTypeById = useMemo(() => {
    const map = {};
    paymentTypes.forEach((paymentType) => {
      if (paymentType?.id) {
        map[paymentType.id] = paymentType;
      }
    });
    return map;
  }, [paymentTypes]);

  const paymentTypeByName = useMemo(() => {
    const map = {};
    paymentTypes.forEach((paymentType) => {
      const normalizedName = normalizePaymentMethodName(paymentType?.name);
      if (normalizedName) {
        map[normalizedName] = paymentType;
      }
    });
    return map;
  }, [paymentTypes]);

  // Helper to check if product is laptop or desktop
  const isLaptopOrDesktop = (categoryId) => {
    const category = categoryMap[categoryId];
    if (!category) return false;
    const name = (category.name || '').toLowerCase();
    return name.includes('laptop') || name.includes('desktop') || name.includes('computer');
  };

  // Helper to get sticker data for an item
  const getStickerData = (item) => {
    const inv = inventoryMap[item.inventory_id];
    const pm = productMasterMap[item.product_master_id || inv?.product_master_id];
    const variant = variantMap[item.variant_id || inv?.variant_id];
    const brand = brandMap[pm?.brand_id];
    const attrs = variant?.attributes || {};

    const brandName = (brand?.name || item.brand_name || pm?.brand_name || '').toUpperCase();
    const model = pm?.model || item.product_name || '';

    // RAM/ROM from ProductVariant.attributes
    const ram = attrs.ram || attrs.RAM || '';
    const storage = attrs.storage || attrs.rom || attrs.ROM || '';
    const ramRom = ram && storage ? `${ram}/${storage}` : (storage || ram);

    const color = attrs.color || attrs.Color || '';

    // CPU/GPU from ProductVariant.attributes (for laptops/desktops)
    const cpu = attrs.cpu || attrs.CPU || attrs.processor || '';
    const gpu = attrs.gpu || attrs.GPU || '';
    const cpuGpu = [cpu, gpu].filter(Boolean).join(' / ');

    // Condition from ProductVariant.condition
    const condition = variant?.condition || 'Brand New';

    const warrantyDescription = inv?.warranty_description || '';
    const cashPrice = item.snapshot_cash_price || item.unit_price || inv?.cash_price || 0;
    const srp = item.snapshot_srp || item.unit_price || inv?.srp || 0;
    const isLaptop = isLaptopOrDesktop(pm?.category_id);
    const identifier =
      item.imei1 ||
      inv?.imei1 ||
      item.imei2 ||
      inv?.imei2 ||
      item.serial_number ||
      inv?.serial_number;
    const warrantyLines = warrantyDescription
      ? warrantyDescription.split(",").map((w) => w.trim()).filter(Boolean)
      : [];

    return {
      brand: brandName,
      model,
      specLine: [ramRom, color].filter(Boolean).join(" "),
      subSpecLine: isLaptop ? cpuGpu : "",
      condition: condition || "Brand New",
      warrantyLines,
      cashPrice,
      srp,
      identifier,
    };
  };

  const getSalesRepName = (salesRepId) => {
    if (!salesRepId) return "N/A";
    const employee = employees.find((e) => e.id === salesRepId);
    if (employee) {
      const firstName = employee.personal_info?.first_name || "";
      const lastName = employee.personal_info?.last_name || "";
      return `${firstName} ${lastName}`.trim() || "N/A";
    }
    return "N/A";
  };

  const customerAddress = useMemo(() => {
    const aj = customer?.address_json;
    if (aj && Object.values(aj).some(Boolean)) {
      return [aj.street, aj.barangay, aj.city_municipality, aj.province, aj.postal_code, aj.country]
        .filter(Boolean)
        .join(", ");
    }
    return "N/A";
  }, [customer]);

  const transactionDiscount =
    transaction?.discount_amount ?? getTransactionDiscountTotal(transaction);
  const hasChange = (transaction?.change_amount || 0) > 0;
  const transactionPayments = transaction?.payments_json?.payments || [];

  const handlePrintQR = async () => {
    if (!transaction?.items?.length) return;

    const stickerItems = transaction.items.map((item) => {
      const stickerData = getStickerData(item);
      if (!stickerData.identifier) return null;
      return stickerData;
    }).filter(Boolean);

    await printQRStickers({
      items: stickerItems,
      title: `QR Codes - ${transaction.or_number}`,
    });
  };

  const handlePrintBarcode = async () => {
    // Barcode printing kept inline since global service is QR-only
    if (!transaction?.items?.length) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print barcodes.");
      return;
    }

    const barcodePrintStyles = `
      @page { size: 46mm 40mm; margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Noto Serif', sans-serif; }
      .barcode-item { width: 46mm; height: 40mm; padding: 0mm 0.5mm; page-break-after: always; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; box-sizing: border-box; border: 1px solid #d1d5dc; }
      .barcode-header { font-size: 9px; font-weight: bold; text-align: left; width: 100%; white-space: normal; line-height: 1.1; margin-top: 0; }
      .barcode-specs { font-size: 7px; text-align: left; width: 100%; }
      .barcode-prices { display: flex; flex-direction: column; justify-content: space-between; width: 100%; font-size: 8px; font-weight: bold; }
      .cash-price { font-weight: bold; }
      .srp-price { font-weight: normal; }
      .barcode-svg { width: 42mm; height: 13mm; margin-top: auto; margin-left: auto; display: block; }
      .barcode-text { font-size: 6px; text-align: center; width: 100%; font-family: monospace; line-height: 1; margin: 0; letter-spacing: 0.1mm; font-weight: lighter; }
    `;

    const barcodeHTML = transaction.items.map((item) => {
      const stickerData = getStickerData(item);
      if (!stickerData.identifier) return "";

      return `
        <div class="barcode-item">
          <div class="barcode-header">
            <strong>${stickerData.brand} ${stickerData.model}</strong>
          </div>
          ${stickerData.specLine ? `<div class="barcode-specs">${stickerData.specLine}</div>` : ""}
          ${stickerData.subSpecLine ? `<div class="barcode-specs">${stickerData.subSpecLine}</div>` : ""}
          ${stickerData.condition ? `<div class="barcode-specs">${stickerData.condition}</div>` : ""}
          ${(stickerData.warrantyLines || []).map((line) => `<div class="barcode-specs">${line}</div>`).join("")}
          <div class="barcode-prices">
            <div class="cash-price">CASH ₱${formatCurrency(stickerData.cashPrice)}</div>
            <div class="srp-price">SRP ₱${formatCurrency(stickerData.srp)}</div>
          </div>
          <svg class="barcode-svg" data-barcode-value="${stickerData.identifier}"></svg>
          <div class="barcode-text">${stickerData.identifier}</div>
        </div>
      `;
    }).filter(Boolean).join("");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcodes - ${transaction.or_number}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap" rel="stylesheet">
        <style>${barcodePrintStyles}</style>
      </head>
      <body>
        ${barcodeHTML}
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.barcode-svg').forEach((svg) => {
              const barcodeValue = svg.dataset.barcodeValue;
              if (barcodeValue) {
                JsBarcode(svg, barcodeValue, { format: 'CODE128', width: 1.5, height: 50, displayValue: false, margin: 18 });
              }
            });
            setTimeout(() => { window.print(); window.close(); }, 500);
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!transaction) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-xl dark:border-slate-800 dark:from-slate-950 dark:to-slate-950 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="rounded-xl border border-slate-200 bg-blue-50/70 px-4 py-4 dark:border-slate-800 dark:bg-blue-950/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3 text-slate-900 dark:text-slate-100">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold leading-none">Transaction Details</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span>OR {transaction.or_number || "N/A"}</span>
                      <span className="hidden h-1 w-1 rounded-full bg-slate-300 md:inline-block dark:bg-slate-600" />
                      <span>{transaction.transaction_number || "No transaction number"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintQR}
                    className="border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <QrCode className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Print QR
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintBarcode}
                    className="border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Barcode className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Print Barcode
                  </Button>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* QR Sticker Preview Section */}
            <div className="flex flex-wrap gap-3">
              {transaction.items?.map((item, idx) => {
                const stickerData = getStickerData(item);
                if (!stickerData.identifier) return null;
                return (
                  <QRStickerPreview
                    key={idx}
                    brand={stickerData.brand}
                    model={stickerData.model}
                    specLine={stickerData.specLine}
                    subSpecLine={stickerData.subSpecLine}
                    condition={stickerData.condition}
                    warrantyLines={stickerData.warrantyLines}
                    cashPrice={stickerData.cashPrice}
                    srp={stickerData.srp}
                    identifier={stickerData.identifier}
                    className="shadow-sm"
                  />
                );
              })}
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-800" />

            {/* Transaction & Customer Info Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Transaction Info */}
              <Card className={sectionCardClassName}>
                <div className="h-1.5 bg-blue-500/80 dark:bg-blue-500/70" />
                <CardContent className="space-y-4 pt-4">
                  <h4 className={sectionHeadingClassName}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                      <FileText className="h-4 w-4" />
                    </span>
                    Transaction Info
                  </h4>

                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className={infoTileClassName}>
                      <p className={infoTileLabelClassName}>OR Number</p>
                      <p className="font-mono text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {transaction.or_number || "N/A"}
                      </p>
                    </div>

                    <div className={infoTileClassName}>
                      <p className={infoTileLabelClassName}>Transaction #</p>
                      <p className="font-mono text-sm font-semibold break-all text-slate-800 dark:text-slate-200">
                        {transaction.transaction_number}
                      </p>
                    </div>

                    <div className={infoTileClassName}>
                      <p className={infoTileLabelClassName}>Date & Time</p>
                      <p className="flex items-start gap-2 font-semibold text-slate-900 dark:text-slate-100">
                        <Calendar className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>
                        {transaction.transaction_date
                          ? format(new Date(transaction.transaction_date), "MMM dd, yyyy | h:mm a")
                          : "N/A"}
                        </span>
                      </p>
                    </div>

                    <div className={infoTileClassName}>
                      <p className={infoTileLabelClassName}>Branch</p>
                      <p className="flex items-start gap-2 font-semibold text-slate-900 dark:text-slate-100">
                        <Store className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>{getWarehouseName?.(transaction.warehouse_id) || "N/A"}</span>
                      </p>
                    </div>

                    <div className={`${infoTileClassName} sm:col-span-2`}>
                      <p className={infoTileLabelClassName}>Assisted Salesperson</p>
                      <p className="flex items-start gap-2 font-semibold text-slate-900 dark:text-slate-100">
                        <User className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>{getSalesRepName(transaction.sales_representative_id)}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card className={sectionCardClassName}>
                <div className="h-1.5 bg-sky-500/80 dark:bg-sky-500/70" />
                <CardContent className="space-y-4 pt-4">
                  <h4 className={sectionHeadingClassName}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                      <User className="h-4 w-4" />
                    </span>
                    Customer Info
                  </h4>

                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className={infoTileClassName}>
                      <p className={infoTileLabelClassName}>Name</p>
                      <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {customer?.full_name || "Walk-in Customer"}
                      </p>
                    </div>

                    <div className={infoTileClassName}>
                      <p className={infoTileLabelClassName}>Phone</p>
                      <p className="flex items-start gap-2 font-semibold text-slate-900 dark:text-slate-100">
                        <Phone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>{customer?.phone || "N/A"}</span>
                      </p>
                    </div>

                    <div className={infoTileClassName}>
                      <p className={infoTileLabelClassName}>Address</p>
                      <p className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>{customerAddress}</span>
                      </p>
                    </div>

                    {transaction.customer_signature_url && (
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Customer Signature
                        </p>
                        <img
                          src={transaction.customer_signature_url}
                          alt="Customer Signature"
                          className="h-16 cursor-pointer rounded-lg border border-slate-200 bg-white shadow-sm transition-transform hover:scale-[1.02] dark:border-slate-700 dark:bg-slate-950"
                          onClick={() =>
                            setSelectedDocument({
                              url: transaction.customer_signature_url,
                              label: "Customer Signature",
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Items Bought */}
            <Card className={sectionCardClassName}>
              <div className="h-1.5 bg-violet-500/70 dark:bg-violet-500/60" />
              <CardContent className="pt-4">
                <h4 className={sectionHeadingClassName}>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                    <Package className="h-4 w-4" />
                  </span>
                  Items Bought
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100/90 text-[11px] uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Serial/IMEI</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(transaction.items || []).map((item, idx) => {
                        // Resolve product details from Inventory → ProductVariant → ProductMaster
                        const inv = inventoryMap[item.inventory_id];
                        const variant = variantMap[item.variant_id || inv?.variant_id];
                        const pm = productMasterMap[item.product_master_id || inv?.product_master_id];
                        const brand = brandMap[pm?.brand_id];
                        const attrs = variant?.attributes || {};

                        // Build display name: prefer Brand + Model, then existing stored item fields
                        const brandName = brand?.name || item.brand_name || pm?.brand_name || "";
                        const modelName = pm?.model || "";
                        const productName = [brandName, modelName].filter(Boolean).join(" ") || variant?.variant_name || item.variant_name || pm?.name || item.product_name || "N/A";
                        const condition = variant?.condition || '';
                        const isCPO = condition === "Certified Pre-Owned";
                        const ram = attrs.ram || attrs.RAM || "";
                        const rom = attrs.storage || attrs.rom || attrs.ROM || "";
                        const color = attrs.color || attrs.Color || "";
                        const warranty = inv?.warranty_description || "";
                        const serialDisplay = item.imei1 || inv?.imei1 || item.serial_number || inv?.serial_number || "-";

                        // Determine price basis label
                        let priceBasis = "";
                        if (item.price_basis) {
                          priceBasis = item.price_basis === "cash" ? "Cash Price" : item.price_basis === "srp" ? "SRP Price" : item.price_basis;
                        } else if (item.snapshot_cash_price && item.unit_price === item.snapshot_cash_price) {
                          priceBasis = "Cash Price";
                        } else if (item.snapshot_srp && item.unit_price === item.snapshot_srp) {
                          priceBasis = "SRP Price";
                        }

                        return (
                          <tr key={idx} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-950/50">
                            <td className="px-3 py-2">
                              <div className="flex max-w-[320px] flex-col gap-1.5 py-1">
                                <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                                  {productName}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {condition && (
                                    <Badge
                                      variant="outline"
                                      className={`${inventoryBadgeClassName} ${isCPO ? inventoryBadgePalette.conditionCpo : inventoryBadgePalette.conditionDefault}`}
                                    >
                                      {isCPO ? "CPO" : condition}
                                    </Badge>
                                  )}
                                  {ram && (
                                    <Badge variant="outline" className={`${inventoryBadgeClassName} ${inventoryBadgePalette.ram}`}>
                                      {ram}
                                    </Badge>
                                  )}
                                  {rom && (
                                    <Badge variant="outline" className={`${inventoryBadgeClassName} ${inventoryBadgePalette.rom}`}>
                                      {rom}
                                    </Badge>
                                  )}
                                  {color && (
                                    <Badge variant="outline" className={`${inventoryBadgeClassName} ${inventoryBadgePalette.color}`}>
                                      {color}
                                    </Badge>
                                  )}
                                  {warranty && (
                                    <Badge variant="outline" className={`${inventoryBadgeClassName} ${inventoryBadgePalette.warranty}`}>
                                      {warranty}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                              {serialDisplay}
                            </td>

                            <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">
                              {item.quantity || 1}
                            </td>

                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                              <span className="font-medium">{formatPHP(item.unit_price)}</span>
                              {priceBasis && (
                                <p
                                  className={`text-[10px] uppercase tracking-[0.12em] ${
                                    priceBasis === "Cash Price"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : priceBasis === "SRP Price"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-slate-400 dark:text-slate-500"
                                  }`}
                                >
                                  {priceBasis}
                                </p>
                              )}
                            </td>

                            <td className="px-3 py-2 text-right">
                              <span className="block font-semibold text-blue-700 dark:text-blue-300">
                                {formatPHP(item.line_total || item.unit_price * (item.quantity || 1))}
                              </span>
                              {(item.discount_amount || 0) > 0 && (
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-600 dark:text-rose-400">
                                  -{formatPHP(item.discount_amount)}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card className={sectionCardClassName}>
              <div className="h-1.5 bg-emerald-500/70 dark:bg-emerald-500/60" />
              <CardContent className="pt-4">
                <h4 className={sectionHeadingClassName}>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  Payment Details
                </h4>

                <div className="space-y-3 text-sm">
                  <div className="space-y-3">
                    {transactionPayments.map(
                      (payment, idx) => {
                        const paymentType =
                          paymentTypeById[payment.payment_type_id] ||
                          paymentTypeByName[normalizePaymentMethodName(payment.payment_method)];

                        return (
                          <PaymentMethodCard
                            key={idx}
                            payment={payment}
                            paymentType={paymentType}
                            onViewDocument={setSelectedDocument}
                          />
                        );
                      }
                    )}
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-800" />

                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Financial Summary
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg px-3 py-2">
                        <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {formatPHP(transaction.subtotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 dark:border-rose-900/60 dark:bg-rose-950/30">
                        <span className="text-rose-700 dark:text-rose-300">Total Discount</span>
                        <span className="font-semibold text-rose-700 dark:text-rose-300">
                          {formatPHP(transactionDiscount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
                        <span className="font-medium text-blue-700 dark:text-blue-300">Total Amount</span>
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-200">
                          {formatPHP(transaction.total_amount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">Amount Paid</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-200">
                          {formatPHP(transaction.amount_paid)}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        hasChange
                          ? "border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30"
                          : "border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
                      }`}>
                        <span className={hasChange ? "font-medium text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-400"}>
                          Change
                        </span>
                        <span className={hasChange ? "font-semibold text-amber-700 dark:text-amber-200" : "font-medium text-slate-900 dark:text-slate-100"}>
                          {formatPHP(transaction.change_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supporting Documents */}
            <Card className={sectionCardClassName}>
              <div className="h-1.5 bg-blue-500/70 dark:bg-blue-500/60" />
              <CardContent className="pt-4">
                <DocumentsSection transaction={transaction} onViewImage={setSelectedDocument} />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview with Download */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] border border-emerald-200 bg-gradient-to-b from-white to-emerald-50/60 p-3 text-slate-900 dark:border-emerald-900/60 dark:from-slate-950 dark:to-emerald-950/20 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="pr-12 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {selectedDocument?.label || "Document Preview"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-start">
            <button
              type="button"
              onClick={(e) => downloadFile(e, selectedDocument?.url, selectedDocument?.label || "document-preview")}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>

          <div className="flex items-center justify-center overflow-auto">
            {/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(selectedDocument?.url || "") ? (
              <img
                src={selectedDocument?.url}
                alt={selectedDocument?.label || "Document"}
                className="max-h-[75vh] max-w-full rounded-lg border border-emerald-100 bg-white object-contain shadow-sm dark:border-emerald-900/40 dark:bg-slate-950"
              />
            ) : (
              <iframe
                src={selectedDocument?.url}
                title={selectedDocument?.label || "Document Preview"}
                className="h-[75vh] w-full rounded-lg border border-emerald-100 bg-white shadow-sm dark:border-emerald-900/40 dark:bg-slate-950"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
