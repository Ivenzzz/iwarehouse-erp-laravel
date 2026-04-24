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

function StatCard({ icon: Icon, label, value, caption, className, valueClassName }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background/70 p-4 shadow-sm",
        "transition-colors hover:bg-accent/30",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>

      <div className={cn("text-xl font-bold text-foreground", valueClassName)}>
        {value}
      </div>

      {caption && (
        <div className="mt-1 text-xs text-muted-foreground">
          {caption}
        </div>
      )}
    </div>
  );
}

function DetailSection({ icon: Icon, title, children, className }) {
  return (
    <section className={cn("border-b border-border bg-card p-5", className)}>
      <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </h4>

      {children}
    </section>
  );
}

function EmptyState({ icon: Icon = Package, title, description }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>

      <div className="text-sm font-semibold text-foreground">{title}</div>

      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

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
        variantName: item.variant_name || "Unnamed Product",
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

  const totalItems = React.useMemo(
    () => getTransferTotalItems(transfer),
    [transfer]
  );

  const totalValue = React.useMemo(
    () => getTransferTotalCost(transfer),
    [transfer]
  );

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
    logistics.driver_name ||
    logistics.courier_name ||
    logistics.proof_of_dispatch_url ||
    logistics.remarks;

  const hasReceivingInfo =
    receivingJson.branch_remarks ||
    receivingJson.discrepancy_reason ||
    receivingJson.photo_proof_url;

  const hasNotesOrDiscrepancy =
    selectedTransfer?.notes || selectedTransfer?.discrepancy_json;

  const hasIssues =
    missingItems.length > 0 ||
    overageItems.length > 0 ||
    unknownItems.length > 0 ||
    selectedTransfer?.discrepancy_json;

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

  const serialReceiptBadgeClass = (received) =>
    received
      ? "border-green/20 bg-emerald-500 text-slate-50 dark:bg-green-500 dark:text-slate-50"
      : "border-warning/20 bg-warning-muted text-warning-muted-foreground";

  const sectionLinkClass =
    "inline-flex w-full items-center justify-center rounded-lg border border-info/20 bg-info-muted px-3 py-2 text-xs font-semibold text-info-muted-foreground transition-colors hover:bg-info-muted/80";

  const noteCardClass =
    "rounded-lg border border-border bg-muted/60 p-3 text-sm";

  const handlePrint = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  if (!selectedTransfer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        className={cn(
          "max-h-[92vh] max-w-6xl overflow-hidden border-border bg-background p-0 text-foreground shadow-2xl",
          "sm:rounded-2xl"
        )}
      >
        <div className="flex max-h-[92vh] flex-col">
          <header className="border-b border-border bg-card">
            <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {selectedTransfer.transfer_number}
                  </h2>

                  <Badge className={getStatusStyle(selectedTransfer.status)}>
                    {getStatusLabel(selectedTransfer.status)}
                  </Badge>

                  {hasIssues && (
                    <Badge className="border-warning/20 bg-warning-muted text-warning-muted-foreground">
                      Needs Review
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Reference:{" "}
                  <span className="font-medium text-foreground">
                    {selectedTransfer.reference || "N/A"}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center rounded-lg border border-border bg-muted/60 px-3 py-2 font-medium">
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {selectedTransfer.source_location?.name ||
                        "Pending Assignment"}
                    </span>
                  </div>

                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />

                  <div className="flex min-w-0 items-center rounded-lg border border-border bg-muted/60 px-3 py-2 font-medium">
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {selectedTransfer.destination_location?.name ||
                        "Pending Assignment"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[560px]">
                <StatCard
                  icon={Package}
                  label="Items"
                  value={totalItems}
                  caption="Total quantity"
                />

                <StatCard
                  icon={Timer}
                  label="Duration"
                  value={totalDuration || "0m"}
                  caption={
                    getTransferDate(selectedTransfer, "received_date")
                      ? "Completed"
                      : "Running"
                  }
                />

                <StatCard
                  label="Value"
                  value={formatPhp(totalValue)}
                  caption="Transfer cost"
                  valueClassName="text-success"
                  className="col-span-2 sm:col-span-2"
                />
              </div>
            </div>

            {hasIssues && (
              <div className="grid grid-cols-1 border-t border-border bg-muted/30 sm:grid-cols-3">
                <div className="flex items-center gap-3 border-b border-border px-6 py-3 sm:border-b-0 sm:border-r">
                  <PackageX className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {missingItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Missing items
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-b border-border px-6 py-3 sm:border-b-0 sm:border-r">
                  <Plus className="h-4 w-4 text-warning-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {overageItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Overage items
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-6 py-3">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {unknownItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Unknown barcodes
                    </div>
                  </div>
                </div>
              </div>
            )}
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem]">
            <main className="min-h-0 border-r border-border bg-background">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Item Details
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Products, serials, and receiving status
                  </p>
                </div>

                <Badge variant="outline" className="bg-background">
                  {groupedTransferRows.length} product groups
                </Badge>
              </div>

              <ScrollArea className="h-[52vh] lg:h-[calc(92vh-15.5rem)]">
                {groupedTransferRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-xs">
                      <thead className="sticky top-0 z-10 border-b border-border bg-muted/80 text-xs uppercase text-muted-foreground backdrop-blur">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Product</th>
                          <th className="px-6 py-3 font-semibold">
                            Serials / IMEI
                          </th>
                          <th className="px-6 py-3 text-center font-semibold">
                            Qty
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {groupedTransferRows.map((group) => (
                          <tr
                            key={group.key}
                            className="transition-colors hover:bg-accent/30"
                          >
                            <td className="px-6 py-4 align-top">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                                  <Package size={18} />
                                </div>

                                <div className="min-w-0">
                                  <div className="font-semibold text-foreground">
                                    {group.variantName}
                                  </div>

                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {group.identifiers.length > 0
                                      ? `${group.identifiers.length} tracked serials`
                                      : "Quantity tracked only"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 align-top">
                              {group.identifiers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {group.identifiers.map((identifier) => (
                                    <div
                                      key={identifier.key}
                                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1"
                                    >
                                      <div
                                        className={cn(
                                          "rounded-md border px-2 py-1 font-mono text-[11px]",
                                          serialChipClass(identifier.missing)
                                        )}
                                      >
                                        {identifier.value || "No identifier"}
                                      </div>

                                      <Badge
                                        variant="outline"
                                        className={serialReceiptBadgeClass(
                                          Boolean(identifier.received)
                                        )}
                                      >
                                        {identifier.received
                                          ? "Received"
                                          : "Pending"}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">
                                  Quantity Tracked Only
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-center align-top">
                              <span className="inline-flex min-w-9 items-center justify-center rounded-full border border-border bg-muted px-2 py-1 text-sm font-bold text-foreground">
                                {group.qty}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={Package}
                    title="No items found"
                    description="This transfer does not have any resolved product lines yet."
                  />
                )}

                {overageItems.length > 0 && (
                  <DiscrepancyTable
                    tone="warning"
                    icon={Plus}
                    title={`Overage Items (${overageItems.length})`}
                    description="Items received but not on manifest"
                    items={overageItems}
                    badge="Overage"
                    fallbackName="Overage Item"
                  />
                )}

                {missingItems.length > 0 && (
                  <DiscrepancyTable
                    tone="destructive"
                    icon={PackageX}
                    title={`Missing Items (${missingItems.length})`}
                    description="Expected but not received"
                    items={missingItems}
                    badge="Missing"
                    fallbackName="Missing Item"
                  />
                )}

                {unknownItems.length > 0 && (
                  <div className="border-t-2 border-border">
                    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted px-6 py-3">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        Unknown Barcodes ({unknownItems.length})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Scanned but not found in database
                      </span>
                    </div>

                    <table className="w-full min-w-[620px] text-left text-sm">
                      <tbody className="divide-y divide-border bg-muted/20">
                        {unknownItems.map((item, index) => (
                          <tr
                            key={`unknown-${index}`}
                            className="transition-colors hover:bg-muted/50"
                          >
                            <td className="px-6 py-3 align-top">
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                  <HelpCircle size={14} />
                                </div>

                                <div>
                                  <div className="font-semibold italic text-foreground">
                                    Unknown Item
                                  </div>
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    Not found in inventory
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-3 align-top">
                              <div className="inline-block rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
                                {item.barcode}
                              </div>
                            </td>

                            <td className="px-6 py-3 text-right align-top">
                              <Badge className="border-border bg-muted text-muted-foreground">
                                Unknown
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollArea>
            </main>

            <aside className="min-h-0 bg-muted/30">
              <ScrollArea className="h-[40vh] lg:h-[calc(92vh-15.5rem)]">
                {consolidation.role && (
                  <DetailSection icon={Package} title="Consolidation">
                    {consolidation.role === "master" && (
                      <div>
                        <div className="mb-2 text-xs text-muted-foreground">
                          Consolidated From
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(consolidation.source_transfer_numbers || []).map(
                            (transferNumber) => (
                              <Badge
                                key={transferNumber}
                                variant="secondary"
                                className="font-mono"
                              >
                                {transferNumber}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {consolidation.role === "source" && (
                      <InfoRow label="Merged Into">
                        {consolidation.merged_into_transfer_number ||
                          "Unknown Transfer"}
                      </InfoRow>
                    )}
                  </DetailSection>
                )}

                {hasLogisticsData && (
                  <DetailSection icon={Truck} title="Logistics Info">
                    <div className="space-y-4">
                      {(logistics.courier_name || logistics.driver_name) && (
                        <InfoRow label="Provider / Driver">
                          {logistics.courier_name && (
                            <span className="block">
                              {logistics.courier_name}
                            </span>
                          )}

                          {logistics.driver_name && (
                            <span>{logistics.driver_name}</span>
                          )}
                        </InfoRow>
                      )}

                      {logistics.driver_contact && (
                        <InfoRow label="Contact">
                          <span className="flex items-center">
                            <Phone className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            {logistics.driver_contact}
                          </span>
                        </InfoRow>
                      )}

                      {logistics.remarks && (
                        <div className={noteCardClass}>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            Logistics Remarks
                          </div>
                          <p className="text-xs italic leading-relaxed text-foreground/80">
                            “{logistics.remarks}”
                          </p>
                        </div>
                      )}

                      {logistics.proof_of_dispatch_url && (
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
                      )}
                    </div>
                  </DetailSection>
                )}

                <DetailSection
                  icon={ClipboardCheck}
                  title="Chain of Custody"
                  className="bg-muted/20"
                >
                  <div className="relative ml-2">
                    <div className="absolute bottom-0 left-4 top-3 w-px bg-border" />

                    <div className="space-y-0">
                      {timelineEvents.map((event, index) => {
                        const Icon = event.icon;

                        let elapsedTime = null;

                        if (
                          index > 0 &&
                          event.isDone &&
                          timelineEvents[index - 1].isDone
                        ) {
                          elapsedTime = calculateDuration(
                            timelineEvents[index - 1].date,
                            event.date
                          );
                        }

                        return (
                          <div
                            key={event.label}
                            className="group relative pb-9 pl-12 last:pb-0"
                          >
                            {elapsedTime && (
                              <div className="absolute -top-5 left-12 flex items-center">
                                <div className="flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {elapsedTime}
                                </div>
                              </div>
                            )}

                            <div
                              className={cn(
                                "absolute left-0 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background transition-colors",
                                event.isDone
                                  ? "border-primary text-primary shadow-sm"
                                  : "border-border text-muted-foreground/50"
                              )}
                            >
                              <Icon size={14} strokeWidth={2.5} />
                            </div>

                            <div
                              className={cn(
                                "pt-1.5 transition-opacity",
                                event.isDone ? "opacity-100" : "opacity-60"
                              )}
                            >
                              <div className="mb-2 text-sm font-bold leading-none text-foreground">
                                {event.label}
                              </div>

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
                                  {event.isDone
                                    ? formatTransferLocalDateTime(event.date)
                                    : "--"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </DetailSection>

                {hasReceivingInfo && (
                  <DetailSection icon={CheckCircle2} title="Receiving Info">
                    <div className="space-y-4">
                      {receivingJson.discrepancy_reason && (
                        <InfoRow label="Discrepancy Reason">
                          <Badge className="border-warning/20 bg-warning-muted text-warning-muted-foreground">
                            {receivingJson.discrepancy_reason.replace(
                              /_/g,
                              " "
                            )}
                          </Badge>
                        </InfoRow>
                      )}

                      {receivingJson.branch_remarks && (
                        <div className={noteCardClass}>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            Branch Remarks
                          </div>
                          <p className="text-xs italic leading-relaxed text-foreground/80">
                            “{receivingJson.branch_remarks}”
                          </p>
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
                  </DetailSection>
                )}

                {hasNotesOrDiscrepancy && (
                  <DetailSection icon={AlertCircle} title="Notes & Variance">
                    <div className="space-y-4">
                      {selectedTransfer.discrepancy_json && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive-muted p-3">
                          <div className="mb-1 flex items-center text-xs font-bold text-destructive-muted-foreground">
                            <AlertCircle size={12} className="mr-1" />
                            Variance Reported
                          </div>

                          <p className="text-xs leading-relaxed text-destructive-muted-foreground">
                            {selectedTransfer.discrepancy_json.type}:{" "}
                            {selectedTransfer.discrepancy_json.summary ||
                              "No details provided"}
                          </p>
                        </div>
                      )}

                      {selectedTransfer.notes && (
                        <div className={noteCardClass}>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            General Notes
                          </div>
                          <p className="text-sm italic leading-relaxed text-foreground/80">
                            “{selectedTransfer.notes}”
                          </p>
                        </div>
                      )}
                    </div>
                  </DetailSection>
                )}
              </ScrollArea>
            </aside>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Last status:{" "}
              <span className="font-medium text-foreground">
                {getStatusLabel(selectedTransfer.status)}
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>

              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiscrepancyTable({
  tone,
  icon: Icon,
  title,
  description,
  items,
  badge,
  fallbackName,
}) {
  const toneClasses = {
    warning: {
      wrapper: "border-warning/20",
      header: "border-warning/20 bg-warning-muted",
      icon: "border-warning/20 bg-warning-muted text-warning-muted-foreground",
      text: "text-warning-muted-foreground",
      row: "divide-warning/10 bg-warning-muted/30 hover:bg-warning-muted/50",
      chip: "border-warning/20 bg-warning-muted text-warning-muted-foreground",
    },
    destructive: {
      wrapper: "border-destructive/20",
      header: "border-destructive/20 bg-destructive-muted",
      icon: "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground",
      text: "text-destructive-muted-foreground",
      row: "divide-destructive/10 bg-destructive-muted/30 hover:bg-destructive-muted/50",
      chip: "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground",
    },
  };

  const classes = toneClasses[tone];

  return (
    <div className={cn("border-t-2", classes.wrapper)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-b px-6 py-3",
          classes.header
        )}
      >
        <Icon className={cn("h-4 w-4", classes.text)} />

        <span className={cn("text-sm font-semibold", classes.text)}>
          {title}
        </span>

        <span className={cn("text-xs opacity-80", classes.text)}>
          {description}
        </span>
      </div>

      <table className="w-full min-w-[620px] text-left text-sm">
        <tbody className={cn("divide-y", classes.row)}>
          {items.map((item, index) => (
            <tr key={`${badge}-${index}`} className="transition-colors">
              <td className="px-6 py-3 align-top">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      classes.icon
                    )}
                  >
                    <Icon size={14} />
                  </div>

                  <div>
                    <div className="font-semibold text-foreground">
                      {item.variant_name || item.product_name || fallbackName}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-6 py-3 align-top">
                <div
                  className={cn(
                    "inline-block rounded-md border px-2 py-1 font-mono text-[11px]",
                    classes.chip
                  )}
                >
                  {item.identifier || "No identifier"}
                </div>
              </td>

              <td className="px-6 py-3 text-center font-medium align-top">
                1
              </td>

              <td className="px-6 py-3 text-right align-top">
                <Badge className={classes.chip}>{badge}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}