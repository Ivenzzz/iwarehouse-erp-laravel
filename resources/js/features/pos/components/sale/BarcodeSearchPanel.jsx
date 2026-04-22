import React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BarcodeSearchPanel({
  searchInputRef,
  searchTerm,
  onSearchTermChange,
  isSearching,
  cart,
  onOpenTransactionDiscount,
  barcodeMatches,
  onAddToCart,
}) {
  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-background">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-stretch gap-2">
          <div className="flex items-center justify-center px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white bg-[#002060] rounded-l-md border border-[#002060] whitespace-nowrap">
            Scan Barcode (F1)
          </div>
          <div className="relative flex-1">
            <Input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Scan IMEI, serial number, or enter search text"
              className="p-5"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
            )}
          </div>
        </div>
        <Button variant="outline" onClick={onOpenTransactionDiscount} disabled={cart.length === 0}>
          Transaction Discount
        </Button>
      </div>

      {barcodeMatches.length > 0 && (
        <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {barcodeMatches.map((item) => (
            <button
              key={item.inventory_id}
              type="button"
              onClick={() => onAddToCart(item, "cash")}
              className="w-full px-3 py-2 text-left border-b last:border-b-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.displayName || [item.product_name, item.variant_name].filter(Boolean).join(" ")}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {[item.imei1, item.imei2, item.serial_number].filter(Boolean).join(" | ")}
                  </div>
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    P{(item.cash_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">SOH: {item.stock_on_hand || 0}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
