import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import CustomerInsights from "@/features/pos/components/customer/CustomerInsights";

export default function CustomerDetailsPanel({
  isCollapsed,
  onCollapsedChange,
  effectiveBalanceDue,
  selectedCustomerLabel,
  selectedSalesRepLabel,
  onShowCustomerDialog,
  onShowAddSalesRepDialog,
  selectedCustomer,
  onSelectedCustomerChange,
  customerOptionsById,
  customerComboOptions,
  selectedSalesRep,
  onSelectedSalesRepChange,
  salesRepOptionsById,
  salesRepOptions,
}) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900">
      <div className="bg-[#002060] px-6 py-3 text-center text-white dark:bg-slate-950 border-b border-[#00164a] dark:border-slate-800">
        <p className="text-sm font-medium text-slate-200 dark:text-slate-300">Balance</p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-white dark:text-slate-100">
          {"\u20B1"} {effectiveBalanceDue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <Collapsible open={!isCollapsed} onOpenChange={(open) => onCollapsedChange(!open)}>
        <Card className="overflow-hidden border-0 rounded-none bg-transparent py-0 gap-0 shadow-none">
          {isCollapsed ? (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 bg-[#002060] px-6 py-4 text-left text-white transition hover:bg-[#00164a] dark:bg-slate-950 dark:hover:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200 dark:text-slate-300">Customer Details</p>
                </div>
                <span className="flex items-center gap-2 text-xs font-medium text-white dark:text-slate-100">
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </span>
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="bg-[#002060] dark:bg-slate-950 px-6 py-3 border-b border-transparent dark:border-slate-800 flex items-start justify-between gap-3 text-white">
              <div>
                <p className="text-sm font-semibold text-white dark:text-slate-100">Customer Details</p>
                <p className="text-xs text-slate-200 dark:text-slate-300">Select the customer and sales representative for this sale.</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Collapse customer details"
                  className="border border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
          )}

          <CollapsibleContent>
            <CardContent className="bg-white dark:bg-slate-950 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Combobox
                  value={selectedCustomer?.id ? String(selectedCustomer.id) : ""}
                  onValueChange={(value) => {
                    onSelectedCustomerChange(customerOptionsById.get(value) || null);
                  }}
                  options={customerComboOptions}
                  placeholder="Select customer"
                  searchPlaceholder="Search customers..."
                  emptyText="No customer found"
                />
                <Button size="sm" variant="outline" onClick={onShowCustomerDialog}>
                  Add Customer
                </Button>
              </div>



              <div className="flex items-center justify-between gap-3 pt-2">
                <Combobox
                  value={selectedSalesRep?.id ? String(selectedSalesRep.id) : ""}
                  onValueChange={(value) => {
                    onSelectedSalesRepChange(salesRepOptionsById.get(value) || null);
                  }}
                  options={salesRepOptions}
                  placeholder="Select sales representative"
                  searchPlaceholder="Search sales reps..."
                  emptyText="No sales representative found"
                />
                <Button size="sm" variant="outline" onClick={onShowAddSalesRepDialog}>
                  Add Sales Rep
                </Button>
              </div>



              <CustomerInsights customer={selectedCustomer} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
