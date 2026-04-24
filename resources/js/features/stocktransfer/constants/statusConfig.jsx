import { Package, ArrowRightLeft, Truck } from "lucide-react";

export const getStatusStyle = (status) => {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';
    case 'picked':
      return 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800';
    case 'shipped':
      return 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800';
    case 'fully_received':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    case 'partially_received':
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    case 'consolidated':
      return 'bg-slate-50 text-slate-400 border border-slate-200 italic dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-700';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
};

export const getStatusLabel = (status) => {
  const labels = {
    draft: "For Picklist",
    picked: "Picked",
    shipped: "Shipped",
    fully_received: "Received",
    partially_received: "Partial",
    consolidated: "Consolidated",
  };
  return labels[status] || status.replace(/_/g, " ");
};

export const getOperationTypeLabel = (type) => {
  const labels = {
    receipt: "Receipt",
    internal_transfer: "Internal Transfer",
    delivery_order: "Delivery Order",
    dropship: "Dropship",
  };
  return labels[type] || type;
};

export const getOperationTypeIcon = (type) => {
  const icons = {
    receipt: Package,
    internal_transfer: ArrowRightLeft,
    delivery_order: Truck,
    dropship: Truck,
  };
  return icons[type] || Package;
};
