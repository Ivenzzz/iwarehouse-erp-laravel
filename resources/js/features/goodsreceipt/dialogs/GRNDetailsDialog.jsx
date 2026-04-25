import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  AlertTriangle,
  Box,
  Calendar,
  FileText,
  MapPin,
  Package,
  PackageCheck,
  ReceiptText,
  Truck,
  User,
  Warehouse,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const STATUS_CONFIG = {
  ongoing: {
    label: "Ongoing",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  completed_with_discrepancy: {
    label: "Completed with discrepancy",
    className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
  },
  draft: {
    label: "Draft",
    className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300",
  },
  qc_pending: {
    label: "QC pending",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  qc_rejected: {
    label: "QC rejected",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  },
  warehouse_encoding: {
    label: "Warehouse encoding",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  },
  converted_to_stock_transfer: {
    label: "Converted to stock transfer",
    className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
  },
};

const CONDITION_CONFIG = {
  "Brand New": {
    label: "Brand New",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  "Certified Pre-Owned": {
    label: "CPO",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  },
  Refurbished: {
    label: "Refurbished",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

const getStatusConfig = (status) => {
  const normalizedStatus = status || "draft";

  return (
    STATUS_CONFIG[normalizedStatus] || {
      label: normalizedStatus.replace(/_/g, " "),
      className: "border-muted bg-muted text-muted-foreground",
    }
  );
};

const getConditionConfig = (condition) => {
  return (
    CONDITION_CONFIG[condition] || {
      label: condition || "N/A",
      className: "border-muted bg-muted text-muted-foreground",
    }
  );
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return format(date, "MMM dd, yyyy • hh:mm a");
};

const getGRNNumber = (grn) => grn.grn_number || grn.receipt_info?.grn_number;
const getGRNStatus = (grn) => grn.status || "draft";
const getGRNDate = (grn) => grn.parties?.encoded_date || grn.created_date;
const getGRNTotalAmount = (grn) => grn.total_amount ?? 0;

const getEncodedBy = (grn) => {
  const directValue = grn.encoded_by || grn.received_by || grn.parties?.received_by;
  if (directValue) return directValue;

  const noteMatch = grn.notes?.match(/completed by (.+?) on/i);
  return noteMatch?.[1] || "N/A";
};

const flattenItems = (grn) => {
  return (grn.items || []).flatMap((item) => {
    const productName =
      [item.variant_name].filter(Boolean).join(" ").trim() ||
      item.product_name ||
      "Unknown product";
    const variantCondition = item.condition || "Brand New";

    if (item.identifiers || item.pricing || item.spec) {
      const identifiers = item.identifiers || {};
      const pricing = item.pricing || {};
      const spec = item.spec || {};
      const barcode =
        item.import_metadata?.barcode ||
        identifiers.barcode ||
        identifiers.imei1 ||
        identifiers.imei2 ||
        identifiers.serial_number ||
        "-";

      return [
        {
          productName,
          variantCondition,
          barcode,
          identifiers,
          package: item.package || "N/A",
          warranty: item.warranty || "-",
          cost_price: pricing.cost_price || 0,
          cash_price: pricing.cash_price || 0,
          srp: pricing.srp || 0,
          spec,
          itemNotes: item.item_notes || "",
        },
      ];
    }

    const packageInfo = item.package || item.batch_info?.package || "N/A";
    const serials = item.serials || item.serial_numbers || [];
    const qtyReceived = Number(item.quantities?.quantity_received) || Number(item.quantity_received) || 0;

    if (serials.length === 0 && qtyReceived > 0) {
      return [
        {
          productName: `${productName} (Qty: ${qtyReceived})`,
          variantCondition,
          barcode: "-",
          identifiers: {},
          package: packageInfo,
          warranty: item.batch_info?.warranty || item.warranty || "-",
          cost_price: item.costing?.unit_cost || 0,
          cash_price: item.costing?.cash_price || 0,
          srp: item.costing?.srp || 0,
          spec: {},
          itemNotes: item.item_notes || "",
        },
      ];
    }

    return serials.map((sn) => ({
      productName,
      variantCondition,
      barcode: sn.imei1 || sn.imei2 || sn.serial_number || "-",
      identifiers: sn,
      package: sn.package || packageInfo,
      warranty: sn.warranty || item.batch_info?.warranty || "-",
      cost_price: sn.cost_price || item.costing?.unit_cost || 0,
      cash_price: sn.cash_price || item.costing?.cash_price || 0,
      srp: sn.srp || item.costing?.srp || 0,
      spec: {},
      itemNotes: item.item_notes || "",
    }));
  });
};

const buildSpecSummary = (spec) => {
  return [
    spec.submodel,
    spec.cpu,
    spec.gpu,
    spec.ram_type,
    spec.rom_type,
    spec.ram_slots,
    spec.resolution,
    spec.with_charger ? "With charger" : "",
  ]
    .filter(Boolean)
    .join(" • ");
};

function InfoItem({ icon: Icon, label, value, valueClassName, title }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {label}
      </div>
      <p className={cn("min-w-0 truncate text-sm font-semibold text-foreground", valueClassName)} title={title || String(value || "")}> 
        {value || "N/A"}
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xs font-bold tracking-tight text-foreground" title={String(value || "")}> 
            {value}
          </p>
          {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ItemsTable({ items }) {
  const HEADER_HEIGHT_PX = 48;
  const ROW_HEIGHT_PX = 72;
  const VISIBLE_ROWS = 5;
  const TABLE_VIEWPORT_HEIGHT_PX = HEADER_HEIGHT_PX + ROW_HEIGHT_PX * VISIBLE_ROWS;

  return (
    <div className="hidden overflow-hidden border bg-card shadow-sm lg:block">
      <div
        className="relative h-[408px] overflow-y-auto"
        style={{ height: `${TABLE_VIEWPORT_HEIGHT_PX}px` }}
      >
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-transparent">
              <th className="sticky top-0 z-20 h-10 min-w-[280px] bg-muted/95 px-4 py-3 text-left align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                Product / Package
              </th>
              <th className="sticky top-0 z-20 h-10 min-w-[180px] bg-muted/95 px-4 py-3 text-left align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                Barcode / Serial
              </th>
              <th className="sticky top-0 z-20 h-10 bg-muted/95 px-4 py-3 text-left align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                Warranty
              </th>
              <th className="sticky top-0 z-20 h-10 bg-muted/95 px-4 py-3 text-right align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                Cost
              </th>
              <th className="sticky top-0 z-20 h-10 bg-muted/95 px-4 py-3 text-right align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                Cash
              </th>
              <th className="sticky top-0 z-20 h-10 bg-muted/95 px-4 py-3 text-right align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                SRP
              </th>
              <th className="sticky top-0 z-20 h-10 min-w-[240px] bg-muted/95 px-4 py-3 text-left align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                Specs / Notes
              </th>
              <th className="sticky top-0 z-20 h-10 bg-muted/95 px-4 py-3 text-center align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                Condition
              </th>
            </tr>
          </thead>

          <tbody className="[&_tr:last-child]:border-0">
            {items.length === 0 ? (
              <tr className="border-b transition-colors hover:bg-muted/50">
                <td colSpan={8} className="p-2 px-4 py-14 text-center align-middle">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8" aria-hidden="true" />
                    <p className="text-sm font-medium">No received items found</p>
                    <p className="text-xs">This GRN does not have item details yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const conditionBadge = getConditionConfig(item.variantCondition);
                const specSummary = buildSpecSummary(item.spec || {});

                return (
                  <tr key={`${item.productName}-${item.barcode}-${idx}`} className="border-b align-top transition-colors hover:bg-muted/40">
                    <td className="p-2 px-4 py-4 align-middle">
                      <div className="space-y-1">
                        <p className="line-clamp-2 text-xs font-semibold leading-5 text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Package: {item.package}</p>
                      </div>
                    </td>

                    <td className="p-2 px-4 py-4 align-middle font-mono text-xs text-foreground">
                      <div className="rounded-lg bg-muted/50 px-2 py-1">{item.barcode}</div>
                      {item.identifiers?.imei1 && item.identifiers?.imei1 !== item.barcode ? (
                        <div className="mt-1 text-muted-foreground">IMEI 1: {item.identifiers.imei1}</div>
                      ) : null}
                      {item.identifiers?.imei2 && item.identifiers?.imei2 !== item.barcode ? (
                        <div className="mt-1 text-muted-foreground">IMEI 2: {item.identifiers.imei2}</div>
                      ) : null}
                      {item.identifiers?.serial_number && item.identifiers?.serial_number !== item.barcode ? (
                        <div className="mt-1 text-muted-foreground">SN: {item.identifiers.serial_number}</div>
                      ) : null}
                    </td>

                    <td className="p-2 px-4 py-4 align-middle text-xs text-muted-foreground">{item.warranty}</td>

                    <td className="p-2 px-4 py-4 text-right align-middle font-mono text-xs text-foreground">
                      {formatCurrency(item.cost_price)}
                    </td>

                    <td className="p-2 px-4 py-4 text-right align-middle font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(item.cash_price)}
                    </td>

                    <td className="p-2 px-4 py-4 text-right align-middle font-mono text-xs text-foreground">
                      {formatCurrency(item.srp)}
                    </td>

                    <td className="p-2 px-4 py-4 align-middle text-xs leading-5 text-muted-foreground">
                      {specSummary || item.itemNotes || "-"}
                      {specSummary && item.itemNotes ? <div className="mt-1 italic">{item.itemNotes}</div> : null}
                    </td>

                    <td className="p-2 px-4 py-4 text-center align-middle">
                      <Badge variant="outline" className={cn("whitespace-nowrap rounded-full", conditionBadge.className)}>
                        {conditionBadge.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileItemCard({ item, index }) {
  const conditionBadge = getConditionConfig(item.variantCondition);
  const specSummary = buildSpecSummary(item.spec || {});

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Item #{index + 1}</p>
            <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-foreground">{item.productName}</h4>
          </div>
          <Badge variant="outline" className={cn("shrink-0 rounded-full", conditionBadge.className)}>
            {conditionBadge.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-muted-foreground">Package</p>
            <p className="mt-1 font-medium text-foreground">{item.package}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-muted-foreground">Warranty</p>
            <p className="mt-1 font-medium text-foreground">{item.warranty}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-muted/50 p-3">
            <p className="text-muted-foreground">Barcode / Serial</p>
            <p className="mt-1 break-all font-mono font-medium text-foreground">{item.barcode}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Cost</p>
            <p className="mt-1 font-mono font-semibold text-foreground">{formatCurrency(item.cost_price)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cash</p>
            <p className="mt-1 font-mono font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(item.cash_price)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">SRP</p>
            <p className="mt-1 font-mono font-semibold text-foreground">{formatCurrency(item.srp)}</p>
          </div>
        </div>

        {specSummary || item.itemNotes ? (
          <div className="mt-3 rounded-xl border bg-background p-3 text-xs leading-5 text-muted-foreground">
            {specSummary || item.itemNotes}
            {specSummary && item.itemNotes ? <div className="mt-1 italic">{item.itemNotes}</div> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function GRNDetailsDialog({ open, onOpenChange, selectedGRN }) {
  const flattenedItems = useMemo(() => (selectedGRN ? flattenItems(selectedGRN) : []), [selectedGRN]);

  if (!selectedGRN) return null;

  const status = getGRNStatus(selectedGRN);
  const statusConfig = getStatusConfig(status);
  const totalCost = getGRNTotalAmount(selectedGRN);
  const encodedDate = getGRNDate(selectedGRN);
  const receivedBy = getEncodedBy(selectedGRN);
  const grnNumber = getGRNNumber(selectedGRN);
  const supplierName = selectedGRN.receipt_info?.supplier_name || "Unknown supplier";
  const discrepancyInfo = selectedGRN.discrepancy_info || {};
  const notes = selectedGRN.notes || selectedGRN.metadata_json?.notes || selectedGRN.metadata?.notes || "";

  const boxDeclared =
    selectedGRN.declared_items_json?.box_count_declared ?? selectedGRN.receipt_info?.box_count_declared ?? 1;
  const boxReceived =
    selectedGRN.declared_items_json?.box_count_received ?? selectedGRN.receipt_info?.box_count_received ?? 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl sm:max-w-7xl">
        <DialogHeader className="border-b bg-gradient-to-br from-muted/80 via-background to-background px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary shadow-sm">
                <PackageCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <DialogTitle className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                    {grnNumber || "N/A"}
                  </DialogTitle>
                  <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusConfig.className)}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <DialogDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Review receipt details, supplier information, handling units, discrepancies, and received item pricing.
                </DialogDescription>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-right md:min-w-[280px]">
              <div className="rounded-xl border bg-card/80 p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Total cost</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{formatCurrency(totalCost)}</p>
              </div>
              <div className="rounded-xl border bg-card/80 p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Units</p>
                <p className="mt-1 text-lg font-bold text-foreground">{flattenedItems.length}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={ReceiptText} label="PO Number" value={selectedGRN.receipt_info?.po_number || "N/A"} />
              <StatCard icon={Truck} label="Supplier" value={supplierName} helper="Source party" />
              <StatCard icon={Warehouse} label="Warehouse" value={selectedGRN.parties?.warehouse_name || "N/A"} />
              <StatCard icon={Box} label="Handling units" value={`${boxDeclared} / ${boxReceived}`} helper="Declared / received" />
            </div>

            <Card className="overflow-hidden rounded-2xl shadow-sm">
              <CardHeader className="border-b bg-muted/30 px-5 py-4">
                <CardTitle className="text-base font-semibold">Receipt information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
                <InfoItem icon={ReceiptText} label="GRN Number" value={grnNumber || "N/A"} />
                <InfoItem icon={User} label="Received By" value={receivedBy} />
                <InfoItem icon={Calendar} label="Encoded Date" value={formatDateTime(encodedDate)} />
                <InfoItem
                  icon={FileText}
                  label="Vendor DR / Ref"
                  value={`${selectedGRN.receipt_info?.dr_number || "-"} / ${selectedGRN.receipt_info?.reference_number || "-"}`}
                />
              </CardContent>
            </Card>

            {(discrepancyInfo.has_discrepancy || notes) && (
              <div className="grid gap-3 lg:grid-cols-2">
                {discrepancyInfo.has_discrepancy ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">Discrepancy detected</p>
                        <p className="mt-1 text-sm leading-6">
                          {discrepancyInfo.discrepancy_summary || "Discrepancy detected during receiving."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {notes ? (
                  <div className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-foreground">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{notes}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Received items</h3>
                  <p className="text-sm text-muted-foreground">
                    {flattenedItems.length} unit{flattenedItems.length !== 1 ? "s" : ""} listed for this GRN.
                  </p>
                </div>
              </div>

              <ItemsTable items={flattenedItems} />

              <div className="grid gap-3 lg:hidden">
                {flattenedItems.length === 0 ? (
                  <Card className="rounded-2xl border-dashed">
                    <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                      <Package className="h-8 w-8" aria-hidden="true" />
                      <p className="text-sm font-medium">No received items found</p>
                      <p className="text-xs">This GRN does not have item details yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  flattenedItems.map((item, index) => (
                    <MobileItemCard key={`${item.productName}-${item.barcode}-${index}`} item={item} index={index} />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-5 py-4 sm:px-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
