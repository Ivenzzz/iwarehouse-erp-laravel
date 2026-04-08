import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useItemLifecycle } from "./hooks/useItemLifecycle";
import { getStatusColor } from "./utils/inventoryUtils";
import {
  Package,
  Truck,
  CheckCircle,
  Archive,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";

const iconMap = {
  package: Package,
  truck: Truck,
  "check-circle": CheckCircle,
  archive: Archive,
  "shopping-cart": ShoppingCart,
  "rotate-ccw": RotateCcw,
  "alert-triangle": AlertTriangle,
};

const statusColors = {
  ordered: "bg-blue-100 text-blue-800",
  received: "bg-purple-100 text-purple-800",
  available: "bg-green-100 text-green-800",
  sold: "bg-gray-100 text-gray-800",
  returned: "bg-orange-100 text-orange-800",
  defective: "bg-red-100 text-red-800",
};

export function ItemLifecycleDialog({ item, open, onOpenChange, productName, warehouseName }) {
  const { data: events = [], isLoading } = useItemLifecycle(item);
  const [sortOrder, setSortOrder] = useState("asc");

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const currentEvent = events.length > 0 ? events[events.length - 1] : null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Item Lifecycle Audit Trail</DialogTitle>
        </DialogHeader>

        {/* Condensed Header */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Product</p>
              <p className="font-semibold text-sm">{productName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Identifier</p>
              <p className="font-mono text-sm">{item?.imei1 || item?.imei2 || item?.serial_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Current Status</p>
              <Badge className={getStatusColor(item?.status)}>{item?.status?.replace(/_/g, " ")}</Badge>
            </div>
          </div>
        </div>

        {/* Sort Toggle */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={toggleSort}>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === "asc" ? "Oldest First" : "Newest First"}
          </Button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No lifecycle events found for this item</div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.map((event, index) => {
                const Icon = iconMap[event.icon] || Package;
                const isLast = sortOrder === "asc" ? index === sortedEvents.length - 1 : index === 0;
                const isCurrent = currentEvent && event.date === currentEvent.date && event.type === currentEvent.type;

                return (
                  <div
                    key={index}
                    className={`relative flex gap-4 ${isCurrent ? "bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-2 border-green-500" : ""}`}
                  >
                    {/* Timeline Line */}
                    {index < sortedEvents.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600" />
                    )}

                    {/* Icon */}
                    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isCurrent ? "bg-green-500" : "bg-blue-500"}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{event.title}</h4>
                            {isCurrent && (
                              <Badge className="bg-green-600 text-white text-xs">Current</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{formatDate(event.date)}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{event.details}</p>
                          {event.reference && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {event.referenceLabel}:{" "}
                              </span>
                              <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                {event.reference}
                              </span>
                            </div>
                          )}
                        </div>
                        <Badge className={statusColors[event.status] || "bg-gray-100 text-gray-800"}>
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}