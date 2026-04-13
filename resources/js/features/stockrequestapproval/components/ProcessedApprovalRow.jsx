import React, { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Package, Printer } from "lucide-react";
const getRequestItemDisplayName = (item) =>
  item?.variant_name || [item?.brand, item?.model].filter(Boolean).join(" ") || item?.variant_sku || "Unknown item";

const getStatusColor = (status) => {
  const colors = {
    rfq_created: "bg-purple-100 text-purple-800 border-purple-300",
    stock_transfer_created: "bg-cyan-100 text-cyan-800 border-cyan-300",
    split_operation_created: "bg-blue-100 text-blue-800 border-blue-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
};

const getHistoryActorLabel = (entry) =>
  entry.actor_id || entry.changed_by_name || entry.changed_by || "System";

export default function ProcessedApprovalRow({
  approval,
  stockRequest,
  onPrint,
  productMasters,
  productVariants,
  brands,
  linkedRFQ,
}) {
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const approvalData = approval?.approval_data || {};
  const effectiveAction = approvalData.action || stockRequest?.status;
  const itemCount = approvalData.items?.length || stockRequest?.items?.length || 0;
  const totalCost = stockRequest?.items?.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.unit_cost || 0),
    0
  ) || 0;
  const statusHistory = stockRequest?.status_history || [];

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
          <p className="font-semibold text-sm">Items Approved</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(approvalData.items || stockRequest?.items || []).map((item, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">
                  {getRequestItemDisplayName(item, productMasters, productVariants, brands)}
                </p>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">
                    Original: {item.original_quantity || item.quantity}
                  </span>
                  <span className="text-green-600 font-medium">
                    Approved: {item.approved_quantity || item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/40 transition-colors">
        <td className="px-4 py-3 w-10" />
        <td className="px-4 py-3 w-10" />
        <td className="px-4 py-3">
          <div className="font-medium text-foreground text-sm">
            {stockRequest?.destination_warehouse_name || "N/A"}
          </div>
          <div className="text-xs text-muted-foreground">
            {stockRequest?.request_number || stockRequest?.pr_number || "N/A"} •{" "}
            {stockRequest?.requester_full_name || stockRequest?.requested_by || "N/A"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {stockRequest?.purpose || "N/A"}
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
            {stockRequest?.required_date
              ? format(new Date(stockRequest.required_date), "MMM dd, yyyy")
              : "-"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Approved by {approvalData.approver_name || stockRequest?.approver_full_name || "N/A"}
          </div>
          <div className="text-xs text-muted-foreground">
            {(approvalData.approval_date || stockRequest?.approved_date)
              ? format(new Date(approvalData.approval_date || stockRequest?.approved_date), "MMM dd, yyyy h:mm a")
              : "N/A"}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={getStatusColor(effectiveAction)} variant="outline">
            <span className="text-xs uppercase">
              {(effectiveAction || "approved").replace(/_/g, " ")}
            </span>
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowHistoryDialog(true)}
              className="h-8 w-8"
              title="View History"
            >
              <History className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onPrint(stockRequest)}
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

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Status History - {stockRequest?.request_number}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex-1 overflow-y-auto">
            {statusHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No status history available</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-4">
                  {statusHistory.map((entry, idx) => (
                    <div key={idx} className="relative pl-10">
                      <div className="absolute left-2.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {entry.status?.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {entry.timestamp
                              ? format(new Date(entry.timestamp), "MMM dd, yyyy h:mm a")
                              : "N/A"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{getHistoryActorLabel(entry)}</p>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
