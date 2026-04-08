import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, History } from "lucide-react";
import {
  getStatusColor,
  formatCurrency,
  formatDateTime,
  calculateStockAge,
  getStockAgeColor,
} from "./utils/inventoryUtils";

export function InventoryTable({
  items,
  productMasters,
  variants,
  warehouses,
  brands,
  onViewDetails,
  onViewHistory,
  currentPage,
  itemsPerPage,
  selectedItems = [],
  onSelectionChange,
}) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange?.(paginatedItems.map((item) => item.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      onSelectionChange?.([...selectedItems, itemId]);
    } else {
      onSelectionChange?.(selectedItems.filter((id) => id !== itemId));
    }
  };

  const isAllSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedItems.includes(item.id));
  const isSomeSelected =
    paginatedItems.some((item) => selectedItems.includes(item.id)) && !isAllSelected;

  const getProductName = (item) => {
    const pm = productMasters.find((p) => p.id === item.product_master_id);
    const variant = variants.find((v) => v.id === item.variant_id);
    const brand = brands.find((b) => b.id === pm?.brand_id);
    return `${variant?.variant_name || ""}`.trim();
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    return warehouse?.name || "N/A";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-card border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className={
                  isSomeSelected
                    ? "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    : "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                }
              />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Product Details</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Barcode</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Location</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Encoded Date</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Stock Age</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Warranty</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground">Cost</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground">Cash</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground">SRP</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground">Margin</th>
            <th className="px-4 py-3 text-center font-semibold text-foreground">Status</th>
            <th className="px-4 py-3 text-center font-semibold text-foreground">Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginatedItems.length === 0 ? (
            <tr>
              <td colSpan="13" className="text-center py-8 text-muted-foreground">
                No inventory items found
              </td>
            </tr>
          ) : (
            paginatedItems.map((item) => {
              const marginAmount =
                item.cash_price && item.cost_price ? item.cash_price - item.cost_price : 0;

              const isSelected = selectedItems.includes(item.id);

              // Semantic classes for margin amount:
              const marginClass =
                marginAmount > 0
                  ? "text-primary" // success-ish in your emerald theme
                  : marginAmount < 0
                  ? "text-destructive"
                  : "text-muted-foreground";

              // Row styling: semantic tokens only
              const rowClass = [
                "border-b border-border",
                "hover:bg-accent",
                isSelected ? "bg-accent/60" : "bg-transparent",
              ].join(" ");

              return (
                <tr key={item.id} className={rowClass}>
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {getProductName(item) || ""}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    <div className="flex flex-col gap-1">
                      {item.imei1 && <span>{item.imei1}</span>}
                      {item.imei2 && <span>{item.imei2}</span>}
                      {item.serial_number && <span>{item.serial_number}</span>}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-foreground">{getWarehouseName(item.warehouse_id)}</td>

                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDateTime(item.encoded_date)}
                  </td>

                  <td className="px-4 py-3">
                    {/* If getStockAgeColor returns hardcoded colors, consider updating it to return semantic classes */}
                    <span className={`font-medium ${getStockAgeColor(item.encoded_date)}`}>
                      {calculateStockAge(item.encoded_date)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-foreground">
                    {item.warranty_description || "N/A"}
                  </td>

                  <td className="px-4 py-3 text-right text-foreground">
                    {formatCurrency(item.cost_price)}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatCurrency(item.cash_price)}
                  </td>

                  <td className="px-4 py-3 text-right text-foreground">
                    {formatCurrency(item.srp)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${marginClass}`}>
                      {formatCurrency(marginAmount)}
                    </span>

                    {/* If you prefer explicit success color instead of primary:
                        marginAmount>0 ? "text-emerald-400" : ...
                        (but that reintroduces non-semantic classes)
                    */}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {/* Ensure getStatusColor returns semantic classes too */}
                    <Badge className={getStatusColor(item.status)}>
                      {item.status?.replace(/_/g, " ")}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(item)}
                        className="h-7 w-7 p-0 text-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewHistory(item)}
                        className="h-7 w-7 p-0 text-foreground hover:bg-accent hover:text-foreground"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}