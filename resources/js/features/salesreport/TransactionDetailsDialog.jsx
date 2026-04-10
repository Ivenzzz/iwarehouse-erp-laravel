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
import { getTransactionDiscountTotal } from "@/utils/transactionDiscounts";

const formatPHP = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount || 0);

const SECTION_CARD_CLASS =
  "overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/75 dark:shadow-[0_20px_50px_rgba(2,6,23,0.45)]";

const SECTION_HEADING_CLASS =
  "mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100";

const TILE_CLASS =
  "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950";

const TILE_LABEL_CLASS =
  "mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

const INVENTORY_BADGE_BASE =
  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]";

const isImageUrl = (url = "") =>
  /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(url);

const toDisplayLabel = (value) =>
  (value || "")
    .replace(/_url$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

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

function DocumentsSection({ transaction, onSelectDocument }) {
  const documents = useMemo(() => {
    const paymentDocuments = [];
    const payments = transaction?.payments_json?.payments || [];

    payments.forEach((payment, paymentIndex) => {
      const supportingDocs = payment?.payment_details?.supporting_doc_urls || [];

      supportingDocs.forEach((document, documentIndex) => {
        const url = typeof document === "string" ? document : document?.url;
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
      ...((transaction?.supporting_documents?.other_supporting_documents || []).map((document, index) => ({
        key: `other_supporting_document_${index}`,
        label: document?.name || `Other Supporting Document ${index + 1}`,
        url: document?.url,
      }))),
      ...paymentDocuments,
    ];
  }, [transaction]);

  return (
    <div className="space-y-4">
      <h4 className={SECTION_HEADING_CLASS}>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          <FileText className="h-4 w-4" />
        </span>
        Supporting Documents
      </h4>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {documents.map((document) => {
          const available = Boolean(document.url);
          const previewableImage = isImageUrl(document.url);

          return (
            <div
              key={document.key}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950"
            >
              {available && previewableImage ? (
                <button
                  type="button"
                  onClick={() => onSelectDocument(document)}
                  className="group block w-full text-left"
                >
                  <img
                    src={document.url}
                    alt={document.label}
                    className="h-28 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                </button>
              ) : (
                <div
                  className={`flex h-28 items-center justify-center ${
                    available ? "bg-slate-100 dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-900/70"
                  }`}
                >
                  <div className="space-y-2 text-center">
                    <div
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${
                        available
                          ? "bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300"
                          : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    {!available ? (
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Not Uploaded
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="space-y-3 p-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {available ? "Available" : "Missing"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {document.label}
                  </p>
                </div>

                {available ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onSelectDocument(document)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(event) => downloadFile(event, document.url, document.label)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {toDisplayLabel(document.key)} is not attached to this transaction.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
                  value={transaction?.transaction_date ? format(new Date(transaction.transaction_date), "MMM dd, yyyy h:mm a") : "-"}
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
                <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                  <Card className={SECTION_CARD_CLASS}>
                    <div className="h-1.5 bg-emerald-500/80 dark:bg-emerald-500/70" />
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
                    <div className="h-1.5 bg-sky-500/80 dark:bg-sky-500/70" />
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
                  <div className="h-1.5 bg-violet-500/70 dark:bg-violet-500/60" />
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
                              const productName =
                                [item.product_name, item.variant_name].filter(Boolean).join(" ") ||
                                item.display_name ||
                                "N/A";
                              const serialDisplay =
                                item.imei1 || item.imei2 || item.serial_number || item.identifier || "-";
                              const priceBasis = getPriceBasisLabel(item);

                              return (
                                <tr
                                  key={`${item.inventory_item_id || item.inventory_id || index}`}
                                  className="border-t border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-950/40"
                                >
                                  <td className="px-3 py-3">
                                    <div className="flex max-w-[340px] flex-col gap-2">
                                      <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                                        {productName}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.condition ? (
                                          <span className={`${INVENTORY_BADGE_BASE} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300`}>
                                            {item.condition}
                                          </span>
                                        ) : null}
                                        {item.warranty_description ? (
                                          <span className={`${INVENTORY_BADGE_BASE} border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300`}>
                                            {item.warranty_description}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
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
                  <div className="h-1.5 bg-emerald-500/70 dark:bg-emerald-500/60" />
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
                  <div className="h-1.5 bg-blue-500/70 dark:bg-blue-500/60" />
                  <CardContent className="pt-4">
                    <DocumentsSection
                      transaction={transaction}
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
