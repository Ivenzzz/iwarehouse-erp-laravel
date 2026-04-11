import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { History, Box, Printer } from "lucide-react";
import { format } from "date-fns";
import { getStatusBadgeStyles } from "./stockRequestUtils";
import StatusHistoryDialog from "./StatusHistoryDialog";

export default function StockRequestTableRow({
  request,
  approval,
  onPrint,
}) {
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const isPendingApproval = request.status === "pending" || request.status === "draft";
  const totalRequestedItems = (request.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const requestorName = request.requested_by || request.requestor_id || "Unknown";
  const requestorInitials = getInitials(requestorName);
  const approvalData = approval?.approval_data || {};
  const approvalDisplayName = approvalData.approver_name || "N/A";
  const approvalDisplayDate = approvalData.approval_date || request.approved_date;
  const approvalInitials = getInitials(approvalDisplayName);

  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">
            {requestorInitials}
          </div>
          <div>
            <span className="block text-sm font-semibold text-primary">
              {request.request_number}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              by {requestorName}
            </span>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div>
          <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            {request.branch_name || "N/A"}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="mt-0.5 flex items-center gap-1 text-xs text-[hsl(var(--info-muted-foreground))] hover:text-[hsl(var(--info))] hover:underline transition-colors">
                <Box size={12} />
                {`${totalRequestedItems} items - ${request.purpose}`}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm mb-3">Request Items</h4>
                {(request.items || []).map((item, idx) => {
                  const conditionLabel = item.condition === "Certified Pre-Owned" ? "CPO" : "Brand New";
                  const attrs = item.variant_attributes || {};
                  const specBadges = [attrs.RAM || attrs.ram, attrs.ROM || attrs.rom || attrs.Storage || attrs.storage, attrs.Color || attrs.color].filter(Boolean);
                  const conditionBadgeClass =
                    conditionLabel === "CPO"
                      ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";

                  return (
                    <div key={idx} className="border-b pb-2 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={`${conditionBadgeClass} text-[10px] px-1.5 py-0 whitespace-nowrap font-medium shadow-none`}>
                          {conditionLabel}
                        </Badge>
                        <span className="font-medium text-xs text-gray-800 dark:text-gray-100">
                          {item.variant_name || `${item.brand || ''} ${item.model || ''}`.trim() || "Unknown"}
                        </span>
                        {specBadges.map((spec) => (
                          <Badge
                            key={`${idx}-${spec}`}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-none"
                          >
                            {spec}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>
                          Qty: <strong>{item.quantity}</strong>
                        </span>
                        {item.reason && <span className="text-gray-500 italic">"{item.reason}"</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="text-xs space-y-1">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Requested: </span>
            <span className="text-gray-800 dark:text-gray-200">
              {request.created_at ? format(new Date(request.created_at), "MMM dd, yyyy | hh:mm a") : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Required: </span>
            <span className="text-gray-800 dark:text-gray-200">
              {request.required_date ? format(new Date(request.required_date), "MMM dd, yyyy | hh:mm a") : "N/A"}
            </span>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        {isPendingApproval ? (
          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400">
              {approvalInitials}
            </div>
            <div className="text-xs">
              <span className="block text-gray-800 dark:text-gray-200">{approvalDisplayName}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {approvalDisplayDate ? format(new Date(approvalDisplayDate), "MMM dd, yyyy | hh:mm a") : ""}
              </span>
            </div>
          </div>
        )}
      </td>

      <td className="px-6 py-4">
        <Badge className={getStatusBadgeStyles(request.status)}>
          {request.status === "branch_transfer_in_transit"
            ? "IN TRANSIT"
            : request.status.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPrint?.(request, approval)}
            className="h-8 w-8 p-0"
            title="Print PDF"
          >
            <Printer size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryDialog(true)}
            className="h-8 w-8 p-0"
          >
            <History size={16} />
          </Button>
        </div>

        <StatusHistoryDialog
          open={showHistoryDialog}
          onOpenChange={setShowHistoryDialog}
          request={request}
        />
      </td>
    </tr>
  );
}