import { useMemo } from "react";

export const getStatusColor = (status) => {
  const colors = {
    draft: "border-border bg-muted text-muted-foreground",
    receiving_quotes: "border-chart-3/30 bg-chart-3/15 text-chart-3",
    converted_to_po: "border-primary/30 bg-primary/20 text-primary",
    consolidated: "border-chart-5/30 bg-chart-5/15 text-chart-5",
    closed: "border-chart-2/30 bg-chart-2/15 text-chart-2",
    cancelled: "border-destructive/20 bg-destructive/10 text-destructive",
  };
  return colors[status] || "border-border bg-muted text-muted-foreground";
};

export const getStatusLabel = (status) => {
  const labels = {
    draft: "Draft",
    receiving_quotes: "Receiving Quotes",
    converted_to_po: "Converted to PO",
    consolidated: "Consolidated",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return labels[status] || status?.replace(/_/g, " ");
};

export const useSupplierOptions = (suppliers) => {
  return useMemo(() => {
    if (!suppliers || suppliers.length === 0) return [];

    return suppliers
      .map((supplier) => {
        const name = supplier.master_profile?.legal_business_name || supplier.master_profile?.trade_name || "Unknown Supplier";

        return {
          value: String(supplier.id),
          label: name,
          searchValue: name,
          searchText: name,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [suppliers]);
};
