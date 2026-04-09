import React from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Calendar,
  ArrowRight,
  Package,
  Printer,
  User,
  CheckCircle2,
  Truck,
  ClipboardCheck,
  BoxSelect,
  AlertCircle,
  Phone,
  Image as ImageIcon,
  ExternalLink,
  Timer,
  Plus,
  HelpCircle,
  PackageX,
  Clock,
} from "lucide-react";
import { getStatusStyle, getStatusLabel } from "../constants/statusConfig";
import {
  formatPhp,
  calculateDuration,
  calculateTotalDuration,
  formatTransferLocalDateTime,
  getTransferDate,
  getTransferTotalCost,
  getTransferTotalItems,
  resolveTransferItems,
} from "../services/transferService";
import { cn } from "@/lib/utils";

export default function DetailsDialog({
  open,
  onOpenChange,
  selectedTransfer,
}) {
  const transfer = selectedTransfer || { product_lines: [] };

  const groupedTransferRows = React.useMemo(() => {
    const groups = new Map();

    const addToGroup = ({ variantId, variantName, identifier }) => {
      if (!groups.has(variantId)) {
        groups.set(variantId, {
          key: variantId,
          variantName,
          identifiers: [],
          qty: 0,
        });
      }
      const group = groups.get(variantId);
      if (identifier) group.identifiers.push(identifier);
      group.qty += 1;
    };

    resolveTransferItems(transfer).forEach((item, index) => {
      const resolvedVariantId = item.variant_id || `item-${index}`;

      addToGroup({
        variantId: resolvedVariantId,
        variantName: item.variant_name,
        identifier: {
          key: item.inventory_id || `${resolvedVariantId}-${index}`,
          value: item.identifier,
          received: item.is_received,
          missing: false,
        },
      });
    });

    return Array.from(groups.values());
  }, [transfer]);

  const totalItems = React.useMemo(() => getTransferTotalItems(transfer), [transfer]);
  const totalValue = React.useMemo(() => getTransferTotalCost(transfer), [transfer]);

  const totalDuration = calculateTotalDuration(transfer);
  const actors = transfer.actors_json || {};
  const dates = transfer.dates_json || {};
  const logistics = transfer.logistics_json || {};
  const consolidation = transfer.consolidation_json || {};
  const receivingJson = transfer.receiving_json || {};
  const missingItems = transfer.missing_items_json || [];
  const overageItems = transfer.overage_items_json || [];
  const unknownItems = transfer.unknown_items_json || [];
  const hasLogisticsData =
    logistics.driver_name || logistics.courier_name || logistics.proof_of_dispatch_url || logistics.remarks;

  const timelineEvents = [
    {
      label: "Created Request",
      user: actors.created_by_name || transfer.created_by?.full_name,
      date: dates.created_date || transfer.created_date,
      icon: Calendar,
      isDone: true,
    },
    {
      label: "Picked Items",
      user: actors.picked_by_name,
      date: dates.picked_date,
      icon: BoxSelect,
      isDone: !!dates.picked_date,
    },
    {
      label: "Sent / Dispatched",
      user: actors.shipped_by_name,
      date: dates.shipped_date,
      icon: Truck,
      isDone: !!dates.shipped_date,
    },
    {
      label: "Received",
      user: actors.received_by_name,
      date: dates.received_date,
      icon: CheckCircle2,
      isDone: !!dates.received_date,
    },
  ];

  const serialChipClass = (isMissing) =>
    isMissing
      ? "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground"
      : "border-border bg-muted text-muted-foreground";

  const sectionLinkClass =
    "flex w-full items-center justify-center rounded-md border border-info/20 bg-info-muted px-3 py-2 text-xs font-medium text-info-muted-foreground transition-colors hover:bg-info-muted/80";

  const noteCardClass = "rounded border border-border bg-muted/60 p-2";

  const serialReceiptBadgeClass = (received) =>
    received
      ? "border-success/20 bg-success-muted text-success-muted-foreground"
      : "border-warning/20 bg-warning-muted text-warning-muted-foreground";

  if (!selectedTransfer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 overflow-hidden border-border bg-background p-0 text-foreground">
        <div className="z-10 flex items-start justify-between border-b border-border bg-card px-6 py-5 shadow-sm">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">{selectedTransfer.transfer_number}</h2>
              <Badge className={getStatusStyle(selectedTransfer.status)}>{getStatusLabel(selectedTransfer.status)}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center rounded bg-muted px-2 py-1 font-medium text-muted-foreground">
                <MapPin className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {selectedTransfer.source_location?.name || "Pending Assignment"}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center rounded bg-muted px-2 py-1 font-medium text-muted-foreground">
                <MapPin className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {selectedTransfer.destination_location?.name || "Pending Assignment"}
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-xl font-bold text-success">{formatPhp(totalValue)}</div>
              <div className="text-xs font-medium text-muted-foreground">{totalItems} Items</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Time</div>
              <div className="flex items-center justify-end text-xl font-bold text-foreground">
                <Timer className="mr-2 h-5 w-5 text-muted-foreground" />
                {totalDuration || "0m"}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                {getTransferDate(selectedTransfer, "received_date") ? "Completed" : "Running"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <div className="order-2 flex min-h-0 flex-1 flex-col border-r border-border bg-card md:order-1">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
              <span>Items Details</span>
              <span className="text-xs font-normal text-muted-foreground">Ref: {selectedTransfer.reference || "N/A"}</span>
            </div>
            <ScrollArea className="flex-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Serials / IMEI</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupedTransferRows.map((group) => (
                    <tr key={group.key} className="hover:bg-accent/40">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
                            <Package size={18} />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{group.variantName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {group.identifiers.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {group.identifiers.map((identifier) => (
                              <div
                                key={identifier.key}
                                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1"
                              >
                                <div
                                  className={cn(
                                    "rounded border px-2 py-1 font-mono text-[11px]",
                                    serialChipClass(identifier.missing)
                                  )}
                                >
                                  {identifier.value}
                                </div>
                                <Badge variant="outline" className={serialReceiptBadgeClass(Boolean(identifier.received))}>
                                  {identifier.received ? "Received" : "Not Received Yet"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Quantity Tracked Only</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-medium align-top">{group.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {overageItems.length > 0 && (
                <div className="border-t-2 border-warning/20">
                  <div className="flex items-center gap-2 border-b border-warning/20 bg-warning-muted px-4 py-3">
                    <Plus className="h-4 w-4 text-warning-muted-foreground" />
                    <span className="text-sm font-semibold text-warning-muted-foreground">Overage Items ({overageItems.length})</span>
                    <span className="text-xs text-warning-muted-foreground/80">Items received but not on manifest</span>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-warning/10 bg-warning-muted/30">
                      {overageItems.map((item, i) => (
                        <tr key={`overage-${i}`} className="hover:bg-warning-muted/50">
                          <td className="px-6 py-3 align-top">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-warning/20 bg-warning-muted text-warning-muted-foreground">
                                <Plus size={14} />
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{item.variant_name || item.product_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 align-top">
                            <div className="inline-block rounded border border-warning/20 bg-warning-muted px-2 py-1 font-mono text-[11px] text-warning-muted-foreground">
                              {item.identifier}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center font-medium align-top">1</td>
                          <td className="px-6 py-3 text-right align-top">
                            <Badge className="border-warning/20 bg-warning-muted text-warning-muted-foreground">Overage</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {missingItems.length > 0 && (
                <div className="border-t-2 border-destructive/20">
                  <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive-muted px-4 py-3">
                    <PackageX className="h-4 w-4 text-destructive-muted-foreground" />
                    <span className="text-sm font-semibold text-destructive-muted-foreground">Missing Items ({missingItems.length})</span>
                    <span className="text-xs text-destructive-muted-foreground/80">Expected but not received</span>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-destructive/10 bg-destructive-muted/30">
                      {missingItems.map((item, i) => (
                        <tr key={`missing-${i}`} className="hover:bg-destructive-muted/50">
                          <td className="px-6 py-3 align-top">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-destructive/20 bg-destructive-muted text-destructive-muted-foreground">
                                <PackageX size={14} />
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{item.variant_name || item.product_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 align-top">
                            <div className="inline-block rounded border border-destructive/20 bg-destructive-muted px-2 py-1 font-mono text-[11px] text-destructive-muted-foreground">
                              {item.identifier}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center font-medium align-top">1</td>
                          <td className="px-6 py-3 text-right align-top">
                            <Badge className="border-destructive/20 bg-destructive-muted text-destructive-muted-foreground">Missing</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {unknownItems.length > 0 && (
                <div className="border-t-2 border-border">
                  <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Unknown Barcodes ({unknownItems.length})</span>
                    <span className="text-xs text-muted-foreground">Scanned but not in database</span>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-border bg-muted/20">
                      {unknownItems.map((item, i) => (
                        <tr key={`unknown-${i}`} className="hover:bg-muted/50">
                          <td className="px-6 py-3 align-top">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
                                <HelpCircle size={14} />
                              </div>
                              <div>
                                <div className="font-medium italic text-foreground">Unknown Item</div>
                                <div className="mt-0.5 text-xs text-muted-foreground">Not found in inventory</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 align-top" colSpan={2}>
                            <div className="inline-block rounded border border-border bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
                              {item.barcode}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right align-top">
                            <Badge className="border-border bg-muted text-muted-foreground">Unknown</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="order-1 w-full overflow-y-auto bg-muted/30 p-0 md:order-2 md:w-96">
            {consolidation.role && (
              <div className="border-b border-border bg-card p-5">
                <h4 className="mb-3 flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Package className="mr-1.5 h-3.5 w-3.5" /> Consolidation
                </h4>

                {consolidation.role === "master" && (
                  <div>
                    <div className="mb-2 text-xs text-muted-foreground">Consolidated From</div>
                    <div className="flex flex-wrap gap-2">
                      {(consolidation.source_transfer_numbers || []).map((transferNumber) => (
                        <Badge key={transferNumber} variant="secondary" className="font-mono">
                          {transferNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {consolidation.role === "source" && (
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Merged Into</div>
                    <div className="text-sm font-semibold text-foreground">
                      {consolidation.merged_into_transfer_number || "Unknown Transfer"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasLogisticsData && (
              <div className="border-b border-border bg-card p-5">
                <h4 className="mb-3 flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Truck className="mr-1.5 h-3.5 w-3.5" /> Logistics Info
                </h4>

                <div className="space-y-3">
                  {(logistics.courier_name || logistics.driver_name) && (
                    <div>
                      <div className="mb-0.5 text-xs text-muted-foreground">Provider / Driver</div>
                      <div className="text-sm font-medium text-foreground">
                        {logistics.courier_name && <span className="block">{logistics.courier_name}</span>}
                        {logistics.driver_name && <span>{logistics.driver_name}</span>}
                      </div>
                    </div>
                  )}

                  {logistics.driver_contact && (
                    <div>
                      <div className="mb-0.5 text-xs text-muted-foreground">Contact</div>
                      <div className="flex items-center text-sm font-medium text-foreground">
                        <Phone className="mr-1 h-3 w-3 text-muted-foreground" />
                        {logistics.driver_contact}
                      </div>
                    </div>
                  )}

                  {logistics.remarks && (
                    <div className={noteCardClass}>
                      <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Logistics Remarks</div>
                      <p className="text-xs italic text-foreground/80">"{logistics.remarks}"</p>
                    </div>
                  )}

                  {logistics.proof_of_dispatch_url && (
                    <div className="pt-1">
                      <a
                        href={logistics.proof_of_dispatch_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(sectionLinkClass, "group")}
                      >
                        <ImageIcon className="mr-2 h-3.5 w-3.5" />
                        View Proof of Dispatch
                        <ExternalLink className="ml-2 h-3 w-3 opacity-50 group-hover:opacity-100" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-6">
              <h4 className="mb-6 flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ClipboardCheck className="mr-2 h-4 w-4" /> Chain of Custody
              </h4>

              <div className="relative ml-2">
                <div className="absolute bottom-0 left-4 top-3 w-px bg-border"></div>

                <div className="space-y-0">
                  {timelineEvents.map((event, idx) => {
                    let elapsedTime = null;
                    if (idx > 0 && event.isDone && timelineEvents[idx - 1].isDone) {
                      elapsedTime = calculateDuration(timelineEvents[idx - 1].date, event.date);
                    }

                    return (
                      <div key={idx} className="group relative pb-10 pl-12 last:pb-0">
                        {elapsedTime && (
                          <div className="absolute -top-5 left-12 flex items-center">
                            <div className="flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                              <Clock className="mr-1 h-3 w-3" />
                              {elapsedTime}
                            </div>
                          </div>
                        )}

                        <div
                          className={`absolute left-0 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background transition-colors ${
                            event.isDone ? "border-primary text-primary shadow-sm" : "border-border text-muted-foreground/50"
                          }`}
                        >
                          <event.icon size={14} strokeWidth={2.5} />
                        </div>

                        <div className={`pt-1.5 transition-opacity ${event.isDone ? "opacity-100" : "opacity-60"}`}>
                          <div className="mb-2 text-sm font-bold leading-none text-foreground">{event.label}</div>

                          <div className="flex flex-col gap-1.5">
                            {event.user ? (
                              <div className="flex items-center text-xs font-medium text-foreground/80">
                                <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                {event.user}
                              </div>
                            ) : (
                              <div className="flex items-center text-xs italic text-muted-foreground">
                                <User className="mr-1.5 h-3.5 w-3.5 opacity-50" />
                                Pending assignment
                              </div>
                            )}

                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                              {event.isDone ? formatTransferLocalDateTime(event.date) : "--"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {(receivingJson.branch_remarks || receivingJson.discrepancy_reason || receivingJson.photo_proof_url) && (
              <div className="border-t border-border bg-card p-5">
                <h4 className="mb-3 flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Receiving Info
                </h4>

                {receivingJson.discrepancy_reason && (
                  <div className="mb-3">
                    <div className="mb-0.5 text-xs text-muted-foreground">Discrepancy Reason</div>
                    <Badge className="border-warning/20 bg-warning-muted text-warning-muted-foreground">
                      {receivingJson.discrepancy_reason.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}

                {receivingJson.branch_remarks && (
                  <div className={`${noteCardClass} mb-3`}>
                    <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Branch Remarks</div>
                    <p className="text-xs italic text-foreground/80">"{receivingJson.branch_remarks}"</p>
                  </div>
                )}

                {receivingJson.photo_proof_url && (
                  <a
                    href={receivingJson.photo_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(sectionLinkClass, "group")}
                  >
                    <ImageIcon className="mr-2 h-3.5 w-3.5" />
                    View Receiving Photo
                    <ExternalLink className="ml-2 h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </a>
                )}
              </div>
            )}

            {(selectedTransfer.notes || selectedTransfer.discrepancy_json) && (
              <div className="border-t border-border bg-card p-5">
                {selectedTransfer.discrepancy_json && (
                  <div className="mb-3 rounded-md border border-destructive/20 bg-destructive-muted p-3">
                    <div className="mb-1 flex items-center text-xs font-bold text-destructive-muted-foreground">
                      <AlertCircle size={12} className="mr-1" /> Variance Reported
                    </div>
                    <p className="text-xs text-destructive-muted-foreground">
                      {selectedTransfer.discrepancy_json.type}: {selectedTransfer.discrepancy_json.summary || "No details provided"}
                    </p>
                  </div>
                )}

                {selectedTransfer.notes && (
                  <div>
                    <h4 className="mb-1 text-xs font-bold uppercase text-muted-foreground">General Notes</h4>
                    <p className="text-sm italic text-foreground/80">"{selectedTransfer.notes}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-card px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
