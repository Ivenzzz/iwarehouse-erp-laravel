import { Package, ArrowRightLeft, Truck } from "lucide-react";

export const getStatusStyle = (status) => {
  switch (status) {
    case 'fully_received': return 'bg-success-muted text-success-muted-foreground border border-success/20';
    case 'consolidated': return 'bg-muted text-muted-foreground border border-border';
    case 'picked': return 'bg-info-muted text-info-muted-foreground border border-info/20';
    case 'shipped': return 'bg-info-muted text-info-muted-foreground border border-info/20';
    case 'draft': return 'bg-muted text-muted-foreground border border-border';
    case 'partially_received': return 'bg-warning-muted text-warning-muted-foreground border border-warning/20';
    default: return 'bg-muted text-muted-foreground border border-border';
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
