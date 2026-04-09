import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { 
  Eye, Edit, Trash2, MoreVertical,
  Truck, PackageCheck, Package, AlertTriangle
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
  const itemCount = getTransferTotalItems(transfer);
  const totalCost = getTransferTotalCost(transfer);
  const srcWarehouse = transfer.source_location;
  const destWarehouse = transfer.destination_location;
  const createdBy = getActorName(transfer, "created_by");
  const avatarInitials = createdBy !== "N/A" ? createdBy.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : "?";
  const createdDate = getTransferDate(transfer, "created_date");

  const groupedPreviewItems = transfer.summary?.preview_items || [];

  // Calculate overdue text if applicable
  const overdueDuration = calculateOverdueDuration(transfer);

  // Helper: Determine the Single Primary Action
  const renderPrimaryAction = () => {
    if (isConsolidated) {
      return (
        <button onClick={onView} className="flex items-center px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-md hover:bg-accent transition-colors">
          <Eye size={14} className="mr-1.5" /> View
        </button>
      );
    }

    switch(transfer.status) {
      case 'draft':
        return (
          <button onClick={onPickItems} className="flex items-center px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 transition-colors shadow-sm">
            <Package size={14} className="mr-1.5" /> Pick Items
          </button>
        );
      case 'picked':
        return (
          <button onClick={onMarkTransit} className="flex items-center px-3 py-1.5 text-xs font-medium text-warning-foreground bg-warning rounded-md hover:bg-warning/90 transition-colors shadow-sm">
            <Truck size={14} className="mr-1.5" /> Ship
          </button>
        );
      case 'shipped':
      case 'partially_received':
        return (
          <button onClick={onReceive} className="flex items-center px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 transition-colors shadow-sm">
            <PackageCheck size={14} className="mr-1.5" /> Receive
          </button>
        );
      default:
        return (
          <button onClick={onView} className="flex items-center px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-md hover:bg-accent transition-colors">
            <Eye size={14} className="mr-1.5" /> View
          </button>
        );
    }
  };

  return (
    <tr className={`hover:bg-accent/50 transition-colors group border-b border-border last:border-0 ${isConsolidated ? "bg-muted/30 opacity-80" : ""}`}>
      <td className="p-4">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="h-4 w-4 text-primary border-border rounded" />
      </td>
      
      {/* Transfer ID (Monospace) */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span 
          onClick={onView}
          className="text-sm font-mono font-medium text-primary cursor-pointer hover:underline"
        >
          {transfer.transfer_number}
        </span>
      </td>

      {/* Route (Stacked) */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-xs text-muted-foreground" title="Source">
            <div className="w-10 text-[10px] uppercase font-bold text-muted-foreground">From</div>
            <span className="font-medium text-muted-foreground truncate max-w-[140px]">{srcWarehouse?.name || "N/A"}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground" title="Destination">
             <div className="w-10 text-[10px] uppercase font-bold text-muted-foreground">To</div>
             <span className="font-medium text-foreground truncate max-w-[140px]">{destWarehouse?.name || "N/A"}</span>
          </div>
        </div>
      </td>

      {/* Created Date */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
           <span className="text-sm text-foreground">
             {formatTransferLocalDate(createdDate)}
           </span>
           <span className="text-xs text-muted-foreground">
             {formatTransferLocalTime(createdDate)}
           </span>
        </div>
      </td>

      {/* Items (with Popover preview) */}
      <td className="px-6 py-4 whitespace-nowrap">
        <Popover>
          <PopoverTrigger>
            <div className="cursor-pointer hover:bg-accent px-2 py-1 rounded text-sm text-muted-foreground font-medium border border-transparent hover:border-border">
               {itemCount} items
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3">
             <div className="text-xs font-semibold text-foreground mb-3 pb-2 border-b border-border flex justify-between items-center">
                <span>Items Preview</span>
                <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px]">{itemCount}</span>
             </div>
             <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {groupedPreviewItems.map((item) => (
                  <div key={item.key} className="flex justify-between items-start p-2 border border-border rounded-md bg-muted/30 hover:bg-accent transition-colors">
                     <div className="mr-3 min-w-0">
                       <div className="text-xs font-medium leading-snug text-foreground break-words">
                         {item.variant_name}
                       </div>
                       <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                         {item.preview_identifier}
                       </div>
                     </div>
                     <span className="flex-shrink-0 font-mono text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
                       x{item.qty}
                     </span>
                  </div>
                ))}
             </div>
          </PopoverContent>
        </Popover>
      </td>

      {/* Status (Updated with Overdue Indicator) */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col items-start gap-1">
          <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(transfer.status)}`}>
            {getStatusLabel(transfer.status)}
          </span>
          {overdueDuration && (
            <div className="flex items-center text-[10px] font-bold text-destructive bg-destructive-muted px-1.5 py-0.5 rounded border border-destructive/20">
              <AlertTriangle size={10} className="mr-1" />
              {overdueDuration} overdue
            </div>
          )}
        </div>
      </td>

      {/* Total Cost */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
        {formatPhp(totalCost)}
      </td>

      {/* Created By (Avatar + Name) */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0">
            {avatarInitials}
          </div>
          <div className="text-sm text-muted-foreground font-medium">{createdBy}</div>
        </div>
      </td>

      {/* Actions (Primary + Meatball) */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          
          {renderPrimaryAction()}

          {/* Secondary Actions Dropdown */}
          <Popover>
             <PopoverTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                  <MoreVertical size={16} />
                </button>
             </PopoverTrigger>
             <PopoverContent align="end" className="w-44 p-1 bg-popover text-popover-foreground shadow-lg border-border">
                {!isConsolidated && transfer.status === 'draft' && (
                  <>
                    <button onClick={onPickItems} className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent rounded flex items-center">
                      <Package size={12} className="mr-2"/> Pick Items
                    </button>
                    <button onClick={onEdit} className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent rounded flex items-center">
                      <Edit size={12} className="mr-2"/> Edit
                    </button>
                  </>
                )}
                <button onClick={onView} className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent rounded flex items-center">
                   <Eye size={12} className="mr-2"/> View Details
                </button>
                {!isConsolidated && (
                  <>
                    <div className="h-px bg-border my-1"></div>
                    <button onClick={onDelete} className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive-muted rounded flex items-center">
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
