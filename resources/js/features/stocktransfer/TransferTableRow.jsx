import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { 
  Eye, Edit, Trash2, MoreVertical,
  Truck, PackageCheck, Package, AlertTriangle, ArrowRight
} from "lucide-react";
import {
  getStatusStyle,
  getStatusLabel,
} from "./constants/statusConfig";
import {
  formatPhp,
  getTransferDate,
  getTransferTotalItems,
  getTransferTotalCost,
  getActorName,
  calculateOverdueDuration,
  formatTransferLocalDate,
  formatTransferLocalTime,
} from "./services/transferService";

export default function TransferTableRow({
  transfer,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onPickItems,
  onMarkTransit,
  onReceive,
  onPrintPicklist,
  onPrintManifest,
  onPrintParcelLabel,
}) {
  const isConsolidated = transfer.status === "consolidated";
  const isTransitOrReceived = ["shipped", "in_transit", "partially_received", "fully_received"].includes(transfer.status);
  const canDelete = !isConsolidated && !isTransitOrReceived;
  const itemCount = getTransferTotalItems(transfer);
  const totalCost = getTransferTotalCost(transfer);
  const srcWarehouse = transfer.source_location;
  const destWarehouse = transfer.destination_location;
  const createdBy = getActorName(transfer, "created_by");
  const avatarInitials = createdBy !== "N/A" ? createdBy.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : "?";
  const createdDate = getTransferDate(transfer, "created_date");

  const groupedPreviewItems = transfer.summary?.preview_items || [];
  const overdueDuration = calculateOverdueDuration(transfer);

  // Avatar color derived from initials for variety
  const avatarColors = [
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
  ];
  const avatarColorClass = avatarColors[(avatarInitials.charCodeAt(0) || 0) % avatarColors.length];

  const renderPrimaryAction = () => {
    if (isConsolidated) {
      return (
        <button onClick={onView} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
          <Eye size={13} /> View
        </button>
      );
    }

    switch(transfer.status) {
      case 'draft':
        return (
          <button onClick={onPickItems} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
            <Package size={13} /> Pick Items
          </button>
        );
      case 'picked':
        return (
          <button onClick={onMarkTransit} className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-violet-700">
            <Truck size={13} /> Ship
          </button>
        );
      case 'shipped':
      case 'partially_received':
        return (
          <button onClick={onReceive} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700">
            <PackageCheck size={13} /> Receive
          </button>
        );
      default:
        return (
          <button onClick={onView} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
            <Eye size={13} /> View
          </button>
        );
    }
  };

  return (
    <tr className={`group border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${isSelected ? 'bg-primary/5' : ''} ${isConsolidated ? "opacity-60" : ""}`}>
      
      {/* Checkbox */}
      <td className="p-4">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="h-4 w-4 text-primary border-border rounded" />
      </td>
      
      {/* Transfer ID */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span 
          onClick={onView}
          className="font-mono text-sm font-semibold text-primary cursor-pointer hover:underline underline-offset-2"
        >
          {transfer.transfer_number}
        </span>
      </td>

      {/* Route */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex h-4 w-8 items-center justify-center rounded bg-muted text-[9px] font-bold uppercase text-muted-foreground">
              From
            </span>
            <span className="max-w-[120px] truncate text-muted-foreground">{srcWarehouse?.name || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex h-4 w-8 items-center justify-center rounded bg-primary/10 text-[9px] font-bold uppercase text-primary">
              To
            </span>
            <span className="max-w-[120px] truncate font-medium text-foreground">{destWarehouse?.name || "N/A"}</span>
          </div>
        </div>
      </td>

      {/* Created Date */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{formatTransferLocalDate(createdDate)}</span>
          <span className="text-xs text-muted-foreground">{formatTransferLocalTime(createdDate)}</span>
        </div>
      </td>

      {/* Items */}
      <td className="px-6 py-4 whitespace-nowrap">
        <Popover>
          <PopoverTrigger>
            <div className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-transparent px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground">
              <Package size={13} className="text-muted-foreground/60" />
              {itemCount}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold text-foreground">Items Preview</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{itemCount} total</span>
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {groupedPreviewItems.map((item) => (
                <div key={item.key} className="flex items-start justify-between rounded-md border border-border bg-muted/30 p-2 hover:bg-accent transition-colors">
                  <div className="mr-3 min-w-0">
                    <div className="text-xs font-medium leading-snug text-foreground break-words">{item.variant_name}</div>
                    <div className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">{item.preview_identifier}</div>
                  </div>
                  <span className="flex-shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground shadow-sm">
                    ×{item.qty}
                  </span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col items-start gap-1">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${getStatusStyle(transfer.status)}`}>
            {getStatusLabel(transfer.status)}
          </span>
          {overdueDuration && (
            <div className="flex items-center gap-1 rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
              <AlertTriangle size={9} />
              {overdueDuration} overdue
            </div>
          )}
        </div>
      </td>

      {/* Total Cost */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatPhp(totalCost)}</span>
      </td>

      {/* Created By */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold shadow-sm ${avatarColorClass}`}>
            {avatarInitials}
          </div>
          <span className="text-sm text-muted-foreground">{createdBy}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          
          {renderPrimaryAction()}

          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <MoreVertical size={15} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1 bg-popover text-popover-foreground shadow-lg border-border">
              {!isConsolidated && transfer.status === 'draft' && (
                <>
                  <button onClick={onPickItems} className="flex w-full items-center rounded px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent">
                    <Package size={12} className="mr-2"/> Pick Items
                  </button>
                  <button onClick={onEdit} className="flex w-full items-center rounded px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent">
                    <Edit size={12} className="mr-2"/> Edit
                  </button>
                </>
              )}
              <button onClick={onView} className="flex w-full items-center rounded px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent">
                <Eye size={12} className="mr-2"/> View Details
              </button>
              {canDelete && (
                <>
                  <div className="my-1 h-px bg-border" />
                  <button onClick={onDelete} className="flex w-full items-center rounded px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 size={12} className="mr-2"/> Delete
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </td>
    </tr>
  );
}
