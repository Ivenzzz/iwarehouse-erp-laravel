import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle, 
  ArrowRightLeft, 
  Truck, 
  Package, 
  PackageCheck,
  Clock
} from "lucide-react";
const statusConfig = {
  draft: { icon: FileText, color: "bg-gray-100 text-gray-800", label: "Draft" },
  pending: { icon: Send, color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  approved: { icon: CheckCircle, color: "bg-green-100 text-green-800", label: "Approved" },
  approved_by_admin: { icon: CheckCircle, color: "bg-green-100 text-green-800", label: "Approved by Admin" },
  approved_with_adjustments: { icon: CheckCircle, color: "bg-blue-100 text-blue-800", label: "Approved with Adjustments" },
  declined: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Declined" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Rejected" },
  converted_to_rfq: { icon: FileText, color: "bg-purple-100 text-purple-800", label: "Converted to RFQ" },
  converted_to_stock_transfer: { icon: ArrowRightLeft, color: "bg-blue-100 text-blue-800", label: "Converted to Stock Transfer" },
  converted_to_po: { icon: FileText, color: "bg-indigo-100 text-indigo-800", label: "Converted to PO" },
  waiting_for_supplier_delivery: { icon: Clock, color: "bg-orange-100 text-orange-800", label: "Waiting for Supplier" },
  preparing_by_warehouse: { icon: Package, color: "bg-cyan-100 text-cyan-800", label: "Preparing by Warehouse" },
  picking_by_warehouse: { icon: Package, color: "bg-cyan-100 text-cyan-800", label: "Picking by Warehouse" },
  packed_by_warehouse: { icon: PackageCheck, color: "bg-teal-100 text-teal-800", label: "Packed by Warehouse" },
  in_transit: { icon: Truck, color: "bg-blue-100 text-blue-800", label: "In Transit" },
  delivered: { icon: Truck, color: "bg-green-100 text-green-800", label: "Delivered" },
  received_by_branch: { icon: PackageCheck, color: "bg-green-100 text-green-800", label: "Received by Branch" },
  completed: { icon: CheckCircle, color: "bg-green-100 text-green-800", label: "Completed" },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Cancelled" },
};

export default function StatusHistoryDialog({ open, onOpenChange, request }) {
  const history = request?.status_history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Status History - {request?.request_number}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No status history available</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {history.map((entry, idx) => {
                  const config = statusConfig[entry.status] || {
                    icon: FileText,
                    color: "bg-gray-100 text-gray-800",
                    label: entry.status?.replace(/_/g, " ") || "Unknown"
                  };
                  const Icon = config.icon;

                  return (
                    <div key={idx} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${config.color}`}>
                        <Icon className="w-3 h-3" />
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex items-center justify-between mb-1">
                          <Badge className={config.color}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {entry.timestamp
                              ? format(new Date(entry.timestamp), "MMM dd, yyyy | hh:mm a")
                              : "N/A"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{entry.actor_name || entry.actor_id || "System"}</span>
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{entry.notes}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}