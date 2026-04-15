import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Activity } from "lucide-react";
import { format } from "date-fns";

const getStatusTone = (status) => {
  switch (status) {
    case "completed":
      return "border-success/25 bg-success/10 text-success";
    case "with_variance":
      return "border-primary/25 bg-primary/10 text-primary";
    case "ready_for_warehouse":
      return "border-info/25 bg-info/10 text-info";
    case "warehouse_encoding":
      return "border-primary/20 bg-primary/10 text-primary";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
};

function DRTableRow({ dr, onViewDetails, onViewHistory }) {
  const receiptDate = new Date(dr.date_received || dr.receipt_date || dr.created_date);
  const declared = dr.declared_items_json || {};
  const itemsList = declared.items || dr.declared_items || [];
  const totalUnits = itemsList.reduce(
    (acc, item) => acc + (Number(item.actual_quantity) || Number(item.received_quantity) || Number(item.declared_quantity) || 0),
    0
  );
  const totalLandedCost = declared.total_landed_cost || dr.total_landed_cost || 0;
  const encodedByValue = dr.encoded_by || dr.metadata_json?.encoded_by || dr.created_by;
  const encodedByUser = encodedByValue?.includes?.("@") ? encodedByValue.split("@")[0] : encodedByValue;
  const isDirectImport = !dr.po_id;
  const status = dr.status || "received";

  return (
    <tr className="group transition-colors hover:bg-accent/60">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span
            className="cursor-pointer font-mono text-sm font-medium text-primary group-hover:underline"
            onClick={() => onViewDetails(dr)}
          >
            {dr.dr_number || "DR-????"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            Ref: <span className="font-medium text-foreground">{dr.reference_number || dr.dr_number || dr.vendor_dr_number || "N/A"}</span>
          </span>
          {isDirectImport && (
            <Badge variant="outline" className="mt-1 w-fit border-info/25 bg-info/10 px-2 py-0 text-[10px] text-info">
              Direct Import
            </Badge>
          )}
        </div>
      </td>

      <td className="px-6 py-4">
        <span className="text-sm font-medium text-foreground">
          {dr.supplier_name || "Unknown Supplier"}
        </span>
        {dr.po_number && <div className="mt-0.5 text-xs text-muted-foreground">PO: {dr.po_number}</div>}
      </td>

      <td className="px-6 py-4 text-sm text-foreground">{encodedByUser || "System"}</td>

      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm text-foreground">{format(receiptDate, "MMM dd, yyyy")}</span>
          <span className="text-xs text-muted-foreground">{format(receiptDate, "hh:mm a")}</span>
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-foreground">
            PHP {totalLandedCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-muted-foreground">
            {totalUnits} Unit{totalUnits !== 1 ? "s" : ""}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 text-center">
        <Badge variant="outline" className={`${getStatusTone(status)} px-3 py-1 font-normal`}>
          {status.replace(/_/g, " ")}
        </Badge>
      </td>

      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 border border-border bg-background text-xs text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onViewDetails(dr)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onViewHistory(dr)}
            className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="View History"
          >
            <Activity className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default React.memo(DRTableRow);
