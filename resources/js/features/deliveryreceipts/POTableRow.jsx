import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInCalendarDays } from "date-fns";
import { getSupplierDisplayName } from "./hooks/useDeliveryReceiptRelations";

function POTableRow({ po, productMasters, onSelectPO }) {
  const supplierName = po?.supplier_name || getSupplierDisplayName(po?.supplier);
  const poItems = po.items_json?.items || po.items || [];
  const totalQuantity = poItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const expectedDate = po.expected_delivery_date ? new Date(po.expected_delivery_date) : null;
  const today = new Date();
  let daysRemaining = null;
  let isLate = false;

  if (expectedDate) {
    daysRemaining = differenceInCalendarDays(expectedDate, today);
    isLate = daysRemaining < 0;
  }

  return (
    <tr className="group transition-colors hover:bg-accent/60">
      <td className="px-6 py-3">
        <span className="font-mono text-sm font-semibold text-primary">{po.po_number}</span>
      </td>

      <td className="px-6 py-3">
        <div className="text-sm font-medium text-foreground">
          {supplierName || "Unknown Supplier"}
        </div>
      </td>

      <td className="px-6 py-3">
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-accent">
              {totalQuantity} Unit{totalQuantity !== 1 ? "s" : ""}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 border border-border bg-popover p-0 text-popover-foreground">
            <div className="border-b border-border bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
              PO Items Preview
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto p-2">
              {poItems.map((item, i) => {
                const pm = productMasters.find((p) => p.id === item.product_master_id);
                const specs = item.product_spec || {};
                const specBadges = [
                  specs.condition && { label: specs.condition },
                  specs.ram && { label: specs.ram },
                  specs.rom && { label: specs.rom },
                ].filter(Boolean);

                return (
                  <div key={item.product_master_id || i} className="border-b border-border pb-2 text-xs last:border-0 last:pb-0">
                    <div className="font-medium text-popover-foreground">{pm?.name || "Unknown Item"}</div>
                    <div className="text-muted-foreground">
                      Qty: {item.quantity} x PHP {item.unit_price}
                    </div>
                    {specBadges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {specBadges.map((spec) => (
                          <Badge
                            key={`${item.product_master_id || i}-${spec.label}`}
                            variant="outline"
                            className="border-border bg-muted text-[10px] text-muted-foreground"
                          >
                            {spec.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </td>

      <td className="px-6 py-3">
        {expectedDate ? (
          <div className="flex flex-col">
            <span className="text-sm text-foreground">{format(expectedDate, "MMM dd, yyyy")}</span>
            <span className={`mt-1 text-[10px] font-bold uppercase ${isLate ? "text-info" : "text-success"}`}>
              {isLate ? `${Math.abs(daysRemaining)} Days Late` : `${daysRemaining} Days Left`}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>

      <td className="px-6 py-3 text-right">
        <span className="font-mono text-sm font-medium text-foreground">
          PHP {(po.financials_json?.total_amount || po.total_amount || 0).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
          })}
        </span>
      </td>

      <td className="px-6 py-3 text-center">
        <Badge className="border border-info/25 bg-info/10 text-info hover:bg-info/15">In Transit</Badge>
      </td>

      <td className="px-6 py-3 text-center">
        <Button
          onClick={() => onSelectPO(po.id)}
          size="sm"
          className="h-8 border border-success/20 bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Receive
        </Button>
      </td>
    </tr>
  );
}

export default React.memo(POTableRow);
