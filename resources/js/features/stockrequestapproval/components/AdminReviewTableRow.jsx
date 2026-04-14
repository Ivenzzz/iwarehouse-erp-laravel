import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Printer, Package, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const getRequestItemDisplayName = (item) =>
  item?.variant_name || [item?.brand, item?.model].filter(Boolean).join(" ") || item?.variant_sku || "Unknown item";

const getRequestItemSecondaryText = (item) => {
  const attrs = item?.variant_attributes || {};
  return [attrs.ram, attrs.rom, attrs.color]
    .filter(Boolean)
    .join(" | ");
};

const getRequestItemVariants = (item) => (item?.variant_id ? [{ id: item.variant_id }] : []);

// Priority calculation based on required date
const getPriority = (requiredDate) => {
  if (!requiredDate) return { label: "N/A", color: "bg-muted text-muted-foreground" };
  
  const reqDate = new Date(requiredDate);
  const today = new Date();
  const diffTime = reqDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) return { label: "CRITICAL", color: "text-rose-500 bg-rose-50 dark:bg-rose-400/10 border border-rose-200 dark:border-rose-400/20" };
  if (diffDays <= 7) return { label: "HIGH", color: "text-amber-500 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20" };
  if (diffDays <= 14) return { label: "MEDIUM", color: "text-blue-500 bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/20" };
  return { label: "LOW", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20" };
};

// Item breakdown component
function ItemBreakdown({ items, productMasters, productVariants, brands, inventory, branchId }) {
  return (
    <div className="p-4 bg-muted/30 border-t border-border">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Package size={14} />
        Item Breakdown & Inventory Context
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 font-medium">Item Details</th>
            <th className="pb-2 font-medium">Unit Cost</th>
            <th className="pb-2 font-medium">Req. Qty</th>
            <th className="pb-2 font-medium">Total</th>
            <th className="pb-2 font-medium">Stock Context</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item, idx) => {
            const matchingVariants = getRequestItemVariants(item, productVariants);
            const secondaryText = getRequestItemSecondaryText(item, productVariants);
            const unitCost = item.unit_cost || 0;
            const qty = item.quantity || 0;
            const total = unitCost * qty;
            const variantIds = matchingVariants.map((entry) => entry.id);

            const stockOnHand = inventory?.filter(
              (inv) => variantIds.includes(inv.variant_id) && inv.warehouse_id === branchId && inv.status === "available"
            ).reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0;

            const isLowStock = stockOnHand < qty;
            const isHealthy = stockOnHand >= qty * 2;

            return (
              <tr key={idx} className="border-b border-border/60 last:border-0">
                <td className="py-3">
                  <p className="font-medium text-foreground">{getRequestItemDisplayName(item, productMasters, productVariants, brands)}</p>
                  {secondaryText && <p className="text-[11px] text-muted-foreground">{secondaryText}</p>}
                </td>
                <td className="py-3 text-foreground">
                  ₱{unitCost.toLocaleString()}
                </td>
                <td className="py-3 text-foreground">{qty}</td>
                <td className="py-3 font-medium text-foreground">
                  ₱{total.toLocaleString()}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">On Hand:</span>
                    <span className="font-medium text-foreground">{stockOnHand} units</span>
                  </div>
                  <div className="mt-1">
                    {isLowStock && (
                      <span className="inline-flex items-center gap-1 text-rose-500 text-xs">
                        <AlertTriangle size={12} /> Stockout Risk
                      </span>
                    )}
                    {!isLowStock && isHealthy && (
                      <span className="inline-flex items-center gap-1 text-emerald-500 text-xs">
                        <CheckCircle2 size={12} /> Healthy Level
                      </span>
                    )}
                    {!isLowStock && !isHealthy && (
                      <span className="inline-flex items-center gap-1 text-amber-500 text-xs">
                        <TrendingUp size={12} /> Monitor Stock
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminReviewTableRow({
  pr,
  productMasters,
  productVariants,
  brands,
  inventory,
  isSelected,
  onToggleSelect,
  onPrint,
  showCheckbox = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalCost = pr.items?.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_cost || 0), 0) || 0;
  const priority = getPriority(pr.required_date);
  const itemCount = pr.items?.length || 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "MMM dd, yyyy h:mm a");
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Master Row */}
      <tr className={cn(
        "border-b border-border hover:bg-muted/40 transition-colors",
        isSelected && "bg-primary/10"
      )}>
        {showCheckbox && (
          <td className="px-4 py-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="rounded border-input bg-background cursor-pointer"
            />
          </td>
        )}
        <td className="px-4 py-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-foreground text-sm">
            {pr.destination_warehouse_name}
          </div>
          <div className="text-xs text-muted-foreground">
            {pr.pr_number} • {pr.requester_full_name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {pr.purpose}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-semibold text-foreground">
            ₱ {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground">
            {itemCount} line item{itemCount !== 1 ? "s" : ""}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={cn("text-xs font-medium", priority.color)}>
            {priority.label}
          </Badge>
          <div className="text-xs text-muted-foreground mt-1">
            {pr.required_date ? format(new Date(pr.required_date), "MMM dd, yyyy") : "-"}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge
            variant="outline"
            className="text-xs font-medium uppercase bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-400/20"
          >
            {pr.status?.replace(/_/g, " ") || "PENDING"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrint?.(pr)}>
            <Printer size={16} />
          </Button>
        </td>
      </tr>

      {/* Detail Row (Expanded) */}
      {isExpanded && (
        <tr>
          <td colSpan={showCheckbox ? 7 : 6} className="p-0">
            <ItemBreakdown
              items={pr.items}
              productMasters={productMasters}
              productVariants={productVariants}
              brands={brands}
              inventory={inventory}
              branchId={pr.requested_warehouse_id || pr.branch_id}
            />
          </td>
        </tr>
      )}
    </>
  );
}
