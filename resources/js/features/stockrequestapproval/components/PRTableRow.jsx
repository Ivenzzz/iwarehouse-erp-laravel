import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Package, Printer } from "lucide-react";

const getRequestItemDisplayName = (item) =>
  item?.variant_name || [item?.brand, item?.model].filter(Boolean).join(" ") || item?.variant_sku || "Unknown item";

const getStatusColor = (status) => {
  const colors = {
    declined: "bg-red-100 text-red-800 border-red-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
};

export default function PRTableRow({
  pr,
  onPrint,
  productMasters,
  productVariants,
  brands,
  linkedRFQ = null,
}) {
  const totalCost = pr.items?.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.unit_cost || 0),
    0
  ) || 0;
  const itemCount = pr.items?.length || 0;

  const renderItemsPopover = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2">
          <Package className="w-3 h-3 mr-1" />
          <span className="text-xs">{itemCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-2">
          <p className="font-semibold text-sm">Items Requested</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(pr.items || []).map((item, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">
                  {getRequestItemDisplayName(item, productMasters, productVariants, brands)}
                </p>
                <p className="text-gray-600">Qty: {item.quantity}</p>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <tr className="border-b border-border hover:bg-muted/40 transition-colors">
      <td className="px-4 py-3 w-10" />
      <td className="px-4 py-3 w-10" />
      <td className="px-4 py-3">
        <div className="font-medium text-foreground text-sm">
          {pr.destination_warehouse_name || "N/A"}
        </div>
        <div className="text-xs text-muted-foreground">
          {pr.pr_number || "N/A"} • {pr.requester_full_name || "N/A"}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {pr.purpose || "N/A"}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-foreground">
          P {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted-foreground">
          {itemCount} line item{itemCount !== 1 ? "s" : ""} • {renderItemsPopover()}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-medium text-foreground">
          {pr.required_date ? format(new Date(pr.required_date), "MMM dd, yyyy") : "-"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Declined by {pr.approver_full_name || "N/A"}
        </div>
        <div className="text-xs text-muted-foreground">
          {pr.approved_date
            ? format(new Date(pr.approved_date), "MMM dd, yyyy h:mm a")
            : "N/A"}
        </div>
        <div className="text-xs text-red-600 mt-1">
          {pr.rejection_reason || "No reason provided"}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className={getStatusColor(pr.status)} variant="outline">
          <span className="text-xs uppercase">{(pr.status || "declined").replace(/_/g, " ")}</span>
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onPrint(pr)}
            className="h-8 w-8"
            title="Print"
          >
            <Printer className="w-4 h-4 text-gray-600" />
          </Button>
          {linkedRFQ && (
            <Button size="sm" variant="outline" className="text-xs h-8" disabled>
              RFQ: {linkedRFQ.rfq_number}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
