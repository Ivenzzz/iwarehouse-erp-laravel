import React from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PackageCheck,
  Calendar,
  MapPin,
  Box,
  User,
  FileText,
} from "lucide-react";

const getStatusColor = (status) => {
  switch (status) {
    case "ongoing":
      return "bg-yellow-600 text-white";
    case "completed":
      return "bg-green-600 text-white";
    case "completed_with_discrepancy":
      return "bg-orange-600 text-white";
    case "draft":
      return "bg-gray-500 text-white";
    case "qc_pending":
      return "bg-yellow-600 text-white";
    case "qc_rejected":
      return "bg-red-600 text-white";
    case "warehouse_encoding":
      return "bg-blue-600 text-white";
    case "converted_to_stock_transfer":
      return "bg-purple-600 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const getConditionLabel = (condition) => {
  switch (condition) {
    case "Brand New":
      return { label: "Brand New", className: "bg-green-100 text-green-800 border-green-300" };
    case "Certified Pre-Owned":
      return { label: "CPO", className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "Refurbished":
      return { label: "Refurbished", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    default:
      return { label: condition || "N/A", className: "bg-gray-100 text-gray-800 border-gray-300" };
  }
};

const formatCurrency = (value) => `P${(Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

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
    const productName = [item.brand_name, item.model_name, item.variant_name].filter(Boolean).join(" ").trim() || item.product_name || "Unknown";
    const variantCondition = item.condition || "Brand New";

    if (item.identifiers || item.pricing || item.spec) {
      const identifiers = item.identifiers || {};
      const pricing = item.pricing || {};
      const spec = item.spec || {};
      const barcode = item.import_metadata?.barcode || identifiers.barcode || identifiers.imei1 || identifiers.imei2 || identifiers.serial_number || "-";

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
    const qtyReceived =
      Number(item.quantities?.quantity_received) ||
      Number(item.quantity_received) ||
      0;

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
  ].filter(Boolean).join(" | ");
};

export default function GRNDetailsDialog({
  open,
  onOpenChange,
  selectedGRN,
}) {
  if (!selectedGRN) return null;

  const status = getGRNStatus(selectedGRN);
  const totalCost = getGRNTotalAmount(selectedGRN);
  const encodedDate = getGRNDate(selectedGRN);
  const receivedBy = getEncodedBy(selectedGRN);
  const grnNumber = getGRNNumber(selectedGRN);

  const supplierName = selectedGRN.receipt_info?.supplier_name || "Unknown Supplier";

  const boxDeclared =
    selectedGRN.declared_items_json?.box_count_declared ??
    selectedGRN.receipt_info?.box_count_declared ??
    1;
  const boxReceived =
    selectedGRN.declared_items_json?.box_count_received ??
    selectedGRN.receipt_info?.box_count_received ??
    1;

  const flattenedItems = flattenItems(selectedGRN);
  const discrepancyInfo = selectedGRN.discrepancy_info || {};
  const notes = selectedGRN.notes || selectedGRN.metadata_json?.notes || selectedGRN.metadata?.notes || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0 rounded-lg border-border bg-card text-card-foreground shadow-xl">
        <DialogHeader className="border-b border-border px-6 py-4 bg-muted/40 rounded-t-lg text-card-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PackageCheck className="w-7 h-7 text-primary" />
              <div>
                <DialogTitle className="text-xl font-bold">
                  GRN Details: {grnNumber || "N/A"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Detailed information for Goods Receipt Note.
                </DialogDescription>
              </div>
            </div>
            <Badge className={`${getStatusColor(status)} font-bold px-3 py-1 text-sm`}>
              {(status || "draft").replace(/_/g, " ").toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <Card className="bg-muted/30 text-card-foreground border-border shadow-inner">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">GRN Number</p>
                  <p className="text-base font-bold text-foreground">{grnNumber || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">PO Number</p>
                  <p className="text-base font-semibold text-white/90">{selectedGRN.receipt_info?.po_number || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">Supplier</p>
                  <p className="text-base font-semibold text-white/90 truncate" title={supplierName}>
                    {supplierName}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">Warehouse</p>
                  <p className="text-base font-semibold text-white/90 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    {selectedGRN.parties?.warehouse_name || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">Received By</p>
                  <p className="text-base font-semibold text-white/90 flex items-center gap-1">
                    <User className="w-4 h-4 text-green-400" />
                    {receivedBy}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">Encoded Date</p>
                  <p className="text-base font-semibold text-white/90 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    {encodedDate ? format(new Date(encodedDate), "MMM dd, yyyy hh:mm a") : "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">Total Cost</p>
                  <p className="text-lg font-extrabold text-orange-400">{formatCurrency(totalCost)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">Handling Units</p>
                  <p className="text-base font-semibold text-white/90 flex items-center gap-1">
                    <Box className="w-4 h-4 text-purple-400" />
                    Declared: {boxDeclared} | Received: {boxReceived}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-slate-400">Vendor DR / Ref</p>
                  <p className="text-base font-semibold text-white/90 flex items-center gap-1">
                    <FileText className="w-4 h-4 text-sky-400" />
                    {selectedGRN.receipt_info?.dr_number || "-"} / -
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {discrepancyInfo.has_discrepancy && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-slate-400">Discrepancy</p>
                    <p className="text-sm text-amber-200">
                      {discrepancyInfo.discrepancy_summary || "Discrepancy detected during receiving."}
                    </p>
                  </div>
                )}
                {notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-slate-400">Notes</p>
                    <p className="text-sm text-white/80 italic line-clamp-4">{notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="pb-2 px-0">
              <CardTitle className="text-lg font-bold text-foreground">
                Received Items ({flattenedItems.length} unit{flattenedItems.length !== 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-200 border-b border-slate-200">
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3">
                        Product Name / Package
                      </TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3">
                        Barcode / Serial
                      </TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3">
                        Warranty
                      </TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3 text-right">
                        Cost Price
                      </TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3 text-right">
                        Cash Price
                      </TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3 text-right">
                        SRP
                      </TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3">
                        Specs / Notes
                      </TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase px-4 py-3 text-center">
                        Condition
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {flattenedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          No received items found for this GRN.
                        </TableCell>
                      </TableRow>
                    ) : (
                      flattenedItems.map((item, idx) => {
                        const conditionBadge = getConditionLabel(item.variantCondition);
                        const specSummary = buildSpecSummary(item.spec || {});

                        return (
                          <TableRow key={idx} className="hover:bg-slate-50/50 border-b-slate-100">
                            <TableCell className="px-4 py-3">
                              <div className="flex flex-col">
                                <p className="font-medium text-xs text-slate-800 line-clamp-1">
                                  {item.productName}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Package: {item.package}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3 font-mono text-xs text-slate-700">
                              <div>{item.barcode}</div>
                              {item.identifiers?.imei1 && item.identifiers?.imei1 !== item.barcode && (
                                <div className="text-[10px] text-slate-500 mt-1">{item.identifiers.imei1}</div>
                              )}
                              {item.identifiers?.imei2 && item.identifiers?.imei2 !== item.barcode && (
                                <div className="text-[10px] text-slate-500 mt-1">{item.identifiers.imei2}</div>
                              )}
                              {item.identifiers?.serial_number && item.identifiers?.serial_number !== item.barcode && (
                                <div className="text-[10px] text-slate-500 mt-1">{item.identifiers.serial_number}</div>
                              )}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-xs text-slate-700">
                              {item.warranty}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-right font-mono text-xs text-slate-700">
                              {formatCurrency(item.cost_price)}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-right font-mono text-xs text-green-600">
                              {formatCurrency(item.cash_price)}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-right font-mono text-xs text-slate-700">
                              {formatCurrency(item.srp)}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-[10px] text-slate-600">
                              {specSummary || item.itemNotes || "-"}
                              {specSummary && item.itemNotes && (
                                <div className="mt-1 text-slate-500 italic">{item.itemNotes}</div>
                              )}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-center">
                              <Badge variant="outline" className={`${conditionBadge.className} border`}>
                                {conditionBadge.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 rounded-b-lg">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
