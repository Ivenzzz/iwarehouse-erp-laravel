import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  Calendar,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Phone,
  Receipt,
  Store,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { QRStickerPreview } from "@/shared/services/qrStickerPrintService";
import { getTransactionDiscountTotal } from "@/utils/transactionDiscounts";

const formatPHP = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount || 0);

const SECTION_CARD_CLASS =
  "overflow-hidden border border-slate-200/80 rounded-lg bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/75 dark:shadow-[0_20px_50px_rgba(2,6,23,0.45)]";

const SECTION_HEADING_CLASS =
  "mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100";

const TILE_CLASS =
  "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950";

const TILE_LABEL_CLASS =
  "mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

const INVENTORY_BADGE_BASE =
  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]";

const PRODUCT_BADGE_CLASSES = {
  condition: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  ram: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
  rom: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  color: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-300",
  cpu: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
  gpu: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300",
  warranty: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300",
};

const isImageUrl = (url = "") =>
  /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(url);

const resolveDocumentUrl = (value) => {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("/storage/")) {
    return raw;
  }

  if (raw.startsWith("storage/")) {
    return `/${raw}`;
  }

  if (raw.startsWith("pos-documents/")) {
    return `/storage/${raw}`;
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
};

const cleanText = (value) => {
  const text = value === null || value === undefined ? "" : String(value).trim();

  return text || null;
};

const downloadFile = async (event, url, label) => {
  event?.stopPropagation?.();

  if (!url) {
    return;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeLabel = (label || "document").replace(/[\\/:*?"<>|]+/g, "_");

    link.href = objectUrl;
    link.download = safeLabel;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const getPriceBasisLabel = (item) => {
  if (item.price_basis === "cash") {
    return "Cash Price";
  }

  if (item.price_basis === "srp") {
    return "SRP Price";
  }

  if (item.snapshot_cash_price && Number(item.unit_price) === Number(item.snapshot_cash_price)) {
    return "Cash Price";
  }

  if (item.snapshot_srp && Number(item.unit_price) === Number(item.snapshot_srp)) {
    return "SRP Price";
  }

  return "";
};

const getPaymentDetails = (payment) => {
  const details = payment?.payment_details || {};
  const candidates = [
    ["Reference", details.reference_number],
    ["Bank", details.bank],
    ["Terminal", details.terminal_used],
    ["Card Holder", details.card_holder_name],
    ["Loan Term", details.loan_term_months ? `${details.loan_term_months} months` : null],
    ["Sender Mobile", details.sender_mobile],
    ["Registered Mobile", details.registered_mobile],
    ["Contract ID", details.contract_id],
    ["Downpayment", details.downpayment ? formatPHP(details.downpayment) : null],
  ];

  return candidates.filter(([, value]) => Boolean(value));
};

const getItemIdentifier = (item) =>
  cleanText(item.imei1) || cleanText(item.imei2) || cleanText(item.serial_number) || cleanText(item.identifier);

const getItemWarrantyLines = (item) =>
  cleanText(item.warranty_description)
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) || [];

const getItemSpecLines = (item) => {
  const attributes = item.attributes || {};
  const ramValue = cleanText(attributes.ram);
  const romValue = cleanText(attributes.rom);
  const colorValue = cleanText(attributes.color);
  const cpuValue = cleanText(attributes.cpu);
  const gpuValue = cleanText(attributes.gpu);

  return [
    [[ramValue, romValue].filter(Boolean).join("/"), colorValue].filter(Boolean).join(" "),
    [cpuValue, gpuValue].filter(Boolean).join(" | "),
  ].filter(Boolean);
};

const getItemDisplayName = (item) =>
  [item.brand_name, item.model].map(cleanText).filter(Boolean).join(" ") ||
  [item.product_name, item.variant_name].map(cleanText).filter(Boolean).join(" ") ||
  cleanText(item.display_name) ||
  "Unnamed Item";

const getQRStickerPreviewItems = (items) =>
  items
    .map((item, index) => ({
      key: `${item.inventory_item_id || item.inventory_id || index}_${getItemIdentifier(item) || "no_identifier"}`,
      brand: item.brand_name,
      model: item.model,
      specLines: getItemSpecLines(item),
      condition: item.condition,
      warrantyLines: getItemWarrantyLines(item),
      cashPrice: item.snapshot_cash_price,
      srp: item.snapshot_srp,
      identifier: getItemIdentifier(item),
    }))
    .filter((item) => Boolean(item.identifier));

function SummaryTile({ icon: Icon, label, value, tone = "slate" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };

  return (
    <div className={TILE_CLASS}>
      <p className={TILE_LABEL_CLASS}>{label}</p>
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${toneClasses[tone] || toneClasses.slate}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
            {value || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductInfo({ item }) {
  const attributes = item.attributes || {};
  const title =
    [item.brand_name, item.model].map(cleanText).filter(Boolean).join(" ") ||
    [item.product_name, item.variant_name].map(cleanText).filter(Boolean).join(" ") ||
    cleanText(item.display_name) ||
    "N/A";
  const specBadges = [
    ["condition", item.condition],
    ["ram", attributes.ram],
    ["rom", attributes.rom],
    ["color", attributes.color],
    ["cpu", attributes.cpu],
    ["gpu", attributes.gpu],
  ]
    .map(([key, value]) => [key, cleanText(value)])
    .filter(([, value]) => Boolean(value));
  const warranty = cleanText(item.warranty_description);

  return (
    <div className="flex max-w-[340px] flex-col gap-2">
      <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
        {title}
      </p>

      {specBadges.length ? (
        <div className="flex flex-wrap gap-1.5">
          {specBadges.map(([key, value]) => (
            <span key={`${key}_${value}`} className={`${INVENTORY_BADGE_BASE} ${PRODUCT_BADGE_CLASSES[key]}`}>
              {value}
            </span>
          ))}
        </div>
      ) : null}

      {warranty ? (
        <div className="flex flex-wrap gap-1.5">
          <span className={`${INVENTORY_BADGE_BASE} ${PRODUCT_BADGE_CLASSES.warranty}`}>
            {warranty}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function DocumentsSection({ transaction, onSelectDocument }) {
  const documents = useMemo(() => {
    const paymentDocuments = [];
    const payments = transaction?.payments_json?.payments || [];

    payments.forEach((payment, paymentIndex) => {
      const supportingDocs = payment?.payment_details?.supporting_doc_urls || [];

      supportingDocs.forEach((document, documentIndex) => {
        const rawUrl = typeof document === "string" ? document : document?.url;
        const url = resolveDocumentUrl(rawUrl);
        const name = typeof document === "string" ? null : document?.name;

        paymentDocuments.push({
          key: `payment_${paymentIndex}_document_${documentIndex}`,
          label: name || `${payment.payment_method || "Payment"} Document ${documentIndex + 1}`,
          url,
        });
      });
    });

    return [
      {
        key: "official_receipt_url",
        label: "Official Receipt",
        url: resolveDocumentUrl(transaction?.supporting_documents?.official_receipt_url),
      },
      {
        key: "customer_id_url",
        label: "Customer ID",
        url: resolveDocumentUrl(transaction?.supporting_documents?.customer_id_url),
      },
      {
        key: "customer_agreement_url",
        label: "Customer Agreement",
        url: resolveDocumentUrl(transaction?.supporting_documents?.customer_agreement_url),
      },
      ...((transaction?.supporting_documents?.other_supporting_documents || []).map((document, index) => ({
        key: `other_supporting_document_${index}`,
        label: document?.name || `Other Supporting Document ${index + 1}`,
        url: resolveDocumentUrl(document?.url),
      }))),
      ...paymentDocuments,
    ];
  }, [transaction]);
  const availableDocuments = documents.filter((document) => Boolean(document.url));

  return (
    <div className="space-y-4">
      <h4 className={SECTION_HEADING_CLASS}>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          <FileText className="h-4 w-4" />
        </span>
        Supporting Documents
      </h4>

      {availableDocuments.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {availableDocuments.map((document) => {
          const previewableImage = isImageUrl(document.url);

          return (
            <div
              key={document.key}
              className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm transition-colors hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900/60"
            >
              {previewableImage ? (
                <button
                  type="button"
                  onClick={() => onSelectDocument(document)}
                  className="group relative block h-24 w-full overflow-hidden bg-slate-100 text-left dark:bg-slate-900"
                >
                  <img
                    src={document.url}
                    alt={document.label}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/35">
                    <span className="rounded bg-slate-950/60 px-3 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      View
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectDocument(document)}
                  className="group flex h-24 w-full items-center justify-center bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-950">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <span className="text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                      View
                    </span>
                  </div>
                </button>
              )}

              <div className="flex items-center justify-between gap-2 bg-slate-100/80 px-3 py-2 dark:bg-slate-900/80">
                <p className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {document.label}
                </p>
                <button
                  type="button"
                  onClick={(event) => downloadFile(event, document.url, document.label)}
                  className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-blue-300"
                  aria-label={`Download ${document.label}`}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No supporting documents uploaded.
        </div>
      )}
    </div>
  );
}

function DiscountValidationSection({ items, onSelectDocument }) {
  const discountProofs = useMemo(
    () =>
      (items || [])
        .map((item, index) => ({
          key: `discount_proof_${item.inventory_item_id || item.inventory_id || index}`,
          itemName: getItemDisplayName(item),
          proofUrl: resolveDocumentUrl(item.discount_proof_image_url),
          discountAmount: Number(item.discount_amount || 0),
          validatedAt: item.discount_validated_at || null,
          validatedAtDisplay: item.discount_validated_at_server_display || null,
        }))
        .filter((entry) => Boolean(entry.proofUrl)),
    [items],
  );

  return (
    <div className="space-y-4">
      <h4 className={SECTION_HEADING_CLASS}>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
          <Receipt className="h-4 w-4" />
        </span>
        Discount Validation Photos
      </h4>

      {discountProofs.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {discountProofs.map((entry) => (
            <div
              key={entry.key}
              className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm transition-colors hover:border-rose-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-rose-900/60"
            >
              <button
                type="button"
                onClick={() => onSelectDocument({ label: `${entry.itemName} - Discount Proof`, url: entry.proofUrl })}
                className="group relative block h-24 w-full overflow-hidden bg-slate-100 text-left dark:bg-slate-900"
              >
                <img
                  src={entry.proofUrl}
                  alt={`${entry.itemName} discount proof`}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/35">
                  <span className="rounded bg-slate-950/60 px-3 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    View
                  </span>
                </div>
              </button>

              <div className="space-y-1 bg-slate-100/80 px-3 py-2 dark:bg-slate-900/80">
                <p className="line-clamp-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {entry.itemName}
                </p>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Discount: {formatPHP(entry.discountAmount)}
                </p>
                {entry.validatedAt ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Validated: {entry.validatedAtDisplay || format(new Date(entry.validatedAt), "MMM dd, yyyy h:mm a")}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No discount validation photos uploaded.
        </div>
      )}
    </div>
  );
}

export default function TransactionDetailsDialog({
  open,
  onOpenChange,
  transactionId,
  endpoint,
  transaction: initialTransaction = null,
}) {
  const [transaction, setTransaction] = useState(initialTransaction);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    setTransaction(initialTransaction);
  }, [initialTransaction]);

  useEffect(() => {
    if (!open) {
      setSelectedDocument(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !transactionId || !endpoint) {
      return;
    }

    setIsLoading(true);

    axios
      .get(endpoint)
      .then(({ data }) => {
        setTransaction(data.transaction || null);
      })
      .finally(() => setIsLoading(false));
  }, [open, transactionId, endpoint]);

  const payments = transaction?.payments_json?.payments || [];
  const items = transaction?.items || [];
  const qrStickerPreviewItems = getQRStickerPreviewItems(items);
  const totalDiscount = getTransactionDiscountTotal(transaction || {});
  const hasChange = Number(transaction?.change_amount || 0) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-hidden border border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-emerald-50/40 p-0 text-slate-900 dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
          <div className="max-h-[94vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-200/80 bg-gradient-to-r from-emerald-50 via-white to-blue-50/60 pr-14 dark:border-slate-800 dark:from-emerald-950/20 dark:via-slate-950 dark:to-blue-950/20">
              <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Transaction Details
              </DialogTitle>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryTile
                  icon={Receipt}
                  label="OR Number"
                  value={transaction?.or_number || "-"}
                  tone="emerald"
                />
                <SummaryTile
                  icon={Calendar}
                  label="Transaction Date"
                  value={
                    transaction?.transaction_date_server_display
                    || (transaction?.transaction_date ? format(new Date(transaction.transaction_date), "MMM dd, yyyy h:mm a") : "-")
                  }
                  tone="blue"
                />
                <SummaryTile
                  icon={Store}
                  label="Branch"
                  value={transaction?.warehouse_name || "-"}
                  tone="violet"
                />
                <SummaryTile
                  icon={User}
                  label="Sales Representative"
                  value={transaction?.sales_representative_name || "N/A"}
                  tone="amber"
                />
              </div>
            </DialogHeader>

            {isLoading || !transaction ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading transaction...
              </div>
            ) : (
              <div className="space-y-6 px-6 py-6">
                {qrStickerPreviewItems.length ? (
                  <Card className={SECTION_CARD_CLASS}>
                    <CardContent className="space-y-3 pt-4">
                      <p className={TILE_LABEL_CLASS}>QR Sticker Preview</p>
                      <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                        {qrStickerPreviewItems.map((item) => (
                          <QRStickerPreview
                            key={item.key}
                            className="flex-shrink-0"
                            brand={item.brand}
                            model={item.model}
                            specLines={item.specLines}
                            condition={item.condition}
                            warrantyLines={item.warrantyLines}
                            cashPrice={item.cashPrice}
                            srp={item.srp}
                            identifier={item.identifier}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                  <Card className={SECTION_CARD_CLASS}>
                    <CardContent className="space-y-4 pt-4">
                      <h4 className={SECTION_HEADING_CLASS}>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <Receipt className="h-4 w-4" />
                        </span>
                        Transaction Overview
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={TILE_CLASS}>
                          <p className={TILE_LABEL_CLASS}>Transaction Number</p>
                          <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {transaction.transaction_number || "-"}
                          </p>
                        </div>
                        <div className={TILE_CLASS}>
                          <p className={TILE_LABEL_CLASS}>Total Amount</p>
                          <p className="text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                            {formatPHP(transaction.total_amount)}
                          </p>
                        </div>
                        <div className={TILE_CLASS}>
                          <p className={TILE_LABEL_CLASS}>Mode of Release</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {transaction.mode_of_release || "N/A"}
                          </p>
                        </div>
                        <div className={TILE_CLASS}>
                          <p className={TILE_LABEL_CLASS}>Remarks</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {transaction.remarks || "No remarks provided."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={SECTION_CARD_CLASS}>
                    <CardContent className="space-y-4 pt-4">
                      <h4 className={SECTION_HEADING_CLASS}>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                          <User className="h-4 w-4" />
                        </span>
                        Customer Info
                      </h4>

                      <div className="grid gap-3">
                        <div className={TILE_CLASS}>
                          <p className={TILE_LABEL_CLASS}>Name</p>
                          <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {transaction.customer_name || "Walk-in Customer"}
                          </p>
                        </div>
                        <div className={TILE_CLASS}>
                          <p className={TILE_LABEL_CLASS}>Phone</p>
                          <p className="flex items-start gap-2 font-semibold text-slate-900 dark:text-slate-100">
                            <Phone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                            <span>{transaction.customer_phone || "N/A"}</span>
                          </p>
                        </div>
                        <div className={TILE_CLASS}>
                          <p className={TILE_LABEL_CLASS}>Address</p>
                          <p className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                            <span>{transaction.customer_address || "N/A"}</span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className={SECTION_CARD_CLASS}>
                  <CardContent className="pt-4">
                    <h4 className={SECTION_HEADING_CLASS}>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                        <Package className="h-4 w-4" />
                      </span>
                      Items Bought
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
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
                          {items.length ? (
                            items.map((item, index) => {
                              const serialDisplay =
                                item.imei1 || item.imei2 || item.serial_number || item.identifier || "-";
                              const priceBasis = getPriceBasisLabel(item);

                              return (
                                <tr
                                  key={`${item.inventory_item_id || item.inventory_id || index}`}
                                  className="border-t border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-950/40"
                                >
                                  <td className="px-3 py-3">
                                    <ProductInfo item={item} />
                                  </td>
                                  <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                                    {serialDisplay}
                                  </td>
                                  <td className="px-3 py-3 text-center text-slate-700 dark:text-slate-300">
                                    {item.quantity || 1}
                                  </td>
                                  <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">{formatPHP(item.unit_price)}</span>
                                    {priceBasis ? (
                                      <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${priceBasis === "Cash Price" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                        {priceBasis}
                                      </p>
                                    ) : null}
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <span className="block font-semibold text-blue-700 dark:text-blue-300">
                                      {formatPHP(item.line_total)}
                                    </span>
                                    {Number(item.discount_amount || 0) > 0 ? (
                                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-600 dark:text-rose-400">
                                        -{formatPHP(item.discount_amount)}
                                      </p>
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                No items found for this transaction.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className={SECTION_CARD_CLASS}>
                  <CardContent className="pt-4">
                    <h4 className={SECTION_HEADING_CLASS}>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CreditCard className="h-4 w-4" />
                      </span>
                      Payment Details
                    </h4>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        {payments.length ? (
                          payments.map((payment, index) => {
                            const paymentDetails = getPaymentDetails(payment);

                            return (
                              <div
                                key={`${payment.payment_method || "payment"}_${index}`}
                                className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        {payment.payment_method || "N/A"}
                                      </p>
                                      {payment.type ? (
                                        <Badge
                                          variant="outline"
                                          className="border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                                        >
                                          {payment.type}
                                        </Badge>
                                      ) : null}
                                    </div>

                                    {paymentDetails.length ? (
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                                        {paymentDetails.map(([label, value]) => (
                                          <p key={`${label}_${value}`}>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{label}:</span>{" "}
                                            {value}
                                          </p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        No additional payment metadata.
                                      </p>
                                    )}
                                  </div>

                                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                                      Amount
                                    </p>
                                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-200">
                                      {formatPHP(payment.amount)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            No payment details recorded.
                          </div>
                        )}
                      </div>

                      <Separator className="bg-slate-200 dark:bg-slate-800" />

                      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Financial Summary
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-xl px-3 py-2">
                            <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {formatPHP(transaction.subtotal)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 dark:border-rose-900/60 dark:bg-rose-950/30">
                            <span className="text-rose-700 dark:text-rose-300">Total Discount</span>
                            <span className="font-semibold text-rose-700 dark:text-rose-300">
                              {formatPHP(totalDiscount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
                            <span className="font-medium text-blue-700 dark:text-blue-300">Total Amount</span>
                            <span className="text-lg font-bold text-blue-700 dark:text-blue-200">
                              {formatPHP(transaction.total_amount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                            <span className="font-medium text-emerald-700 dark:text-emerald-300">Amount Paid</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-200">
                              {formatPHP(transaction.amount_paid)}
                            </span>
                          </div>

                          <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
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

                <Card className={SECTION_CARD_CLASS}>
                  <CardContent className="pt-4">
                    <DocumentsSection
                      transaction={transaction}
                      onSelectDocument={setSelectedDocument}
                    />
                  </CardContent>
                </Card>

                <Card className={SECTION_CARD_CLASS}>
                  <CardContent className="pt-4">
                    <DiscountValidationSection
                      items={items}
                      onSelectDocument={setSelectedDocument}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedDocument)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedDocument(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden border border-emerald-200 bg-gradient-to-b from-white to-emerald-50/60 p-0 text-slate-900 dark:border-emerald-900/60 dark:from-slate-950 dark:to-emerald-950/20 dark:text-slate-100">
          <DialogHeader className="pr-14">
            <DialogTitle className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
              {selectedDocument?.label || "Document Preview"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) =>
                  downloadFile(
                    event,
                    selectedDocument?.url,
                    selectedDocument?.label || "document-preview",
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(selectedDocument?.url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in New Tab
              </Button>
            </div>

            <div className="flex max-h-[68vh] items-center justify-center overflow-auto rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm dark:border-emerald-900/40 dark:bg-slate-950">
              {isImageUrl(selectedDocument?.url) ? (
                <img
                  src={selectedDocument?.url}
                  alt={selectedDocument?.label || "Document"}
                  className="max-h-[64vh] max-w-full rounded-xl object-contain"
                />
              ) : (
                <iframe
                  src={selectedDocument?.url}
                  title={selectedDocument?.label || "Document Preview"}
                  className="h-[64vh] w-full rounded-xl"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
