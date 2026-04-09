import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, ChevronUp, ChevronDown, ChevronsUpDown, ClipboardList, CheckCircle2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

import TransferTableRow from "./TransferTableRow";

export default function TransferTable({
  transfers,
  isLoading,
  selectedTransfers,
  onSelectAll,
  onSelectTransfer,
  onView,
  onEdit,
  onDelete,
  onPickItems,
  onMarkTransit,
  onReceive,
  onPrintPicklist,
  onPrintManifest,
  onPrintParcelLabel,
  sortBy,
  sortOrder,
  onSort,
  statusFilter,
  setStatusFilter,
}) {
  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground" />;
    }

    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 inline h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3 text-primary" />
    );
  };

  const HeaderCell = ({ label, sortKey, align = "left" }) => (
    <th
      scope="col"
      className={`cursor-pointer select-none px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => sortKey && onSort(sortKey)}
    >
      {label}
      {sortKey ? <SortIcon column={sortKey} /> : null}
    </th>
  );

  const renderEmptyState = () => {
    if (statusFilter === "to_ship") {
      return (
        <div className="py-16 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 h-12 w-12 text-info opacity-20" />
          <p className="text-sm font-medium">No items ready to ship.</p>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">Go to the For Picklist tab to start processing draft transfers.</p>
          <Button variant="outline" size="sm" onClick={() => setStatusFilter("draft")}>
            Go to For Picklist
          </Button>
        </div>
      );
    }

    if (statusFilter === "in_transit") {
      return (
        <div className="py-16 text-center text-muted-foreground">
          <Truck className="mx-auto mb-3 h-12 w-12 text-info opacity-20" />
          <p className="text-sm font-medium">No items currently in transit.</p>
          <p className="mt-1 text-xs text-muted-foreground">Check "To Ship" items to send them out.</p>
        </div>
      );
    }

    if (statusFilter === "past_due") {
      return (
        <div className="py-16 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success opacity-20" />
          <p className="text-sm font-medium">Great job! No overdue shipments.</p>
          <p className="mt-1 text-xs text-muted-foreground">All in-transit items are on schedule.</p>
        </div>
      );
    }

    return (
      <div className="py-16 text-center text-muted-foreground">
        <Package className="mx-auto mb-3 h-12 w-12 opacity-20" />
        <p className="text-sm font-medium">No stock transfers found</p>
        <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters or create a new transfer.</p>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="overflow-x-auto">
        <div className="max-h-[640px] overflow-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
              <tr>
                <th scope="col" className="w-4 p-4">
                  <Checkbox
                    checked={selectedTransfers.length === transfers.length && transfers.length > 0}
                    onCheckedChange={onSelectAll}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                </th>
                <HeaderCell label="Transfer ID" sortKey="transfer_number" />
                <HeaderCell label="Route" />
                <HeaderCell label="Created" sortKey="created_date" />
                <HeaderCell label="Items" sortKey="items" />
                <HeaderCell label="Status" />
                <HeaderCell label="Total Cost" />
                <HeaderCell label="Created By" sortKey="created_by" />
                <HeaderCell label="Actions" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="9">{renderEmptyState()}</td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <TransferTableRow
                    key={transfer.id}
                    transfer={transfer}
                    isSelected={selectedTransfers.includes(transfer.id)}
                    onSelect={() => onSelectTransfer(transfer.id)}
                    onView={() => onView(transfer)}
                    onEdit={() => onEdit(transfer)}
                    onDelete={() => onDelete(transfer)}
                    onPickItems={() => onPickItems(transfer)}
                    onMarkTransit={() => onMarkTransit(transfer)}
                    onReceive={() => onReceive(transfer)}
                    onPrintPicklist={() => onPrintPicklist(transfer)}
                    onPrintManifest={() => onPrintManifest(transfer)}
                    onPrintParcelLabel={() => onPrintParcelLabel(transfer)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground sm:px-6">
        Showing <span className="font-medium">{transfers.length}</span> loaded results
      </div>
    </div>
  );
}
