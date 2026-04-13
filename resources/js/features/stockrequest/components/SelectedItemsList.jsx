import React from "react";
import { Trash2, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SelectedItemsList({
  items,
  onUpdate,
  onRemove,
  globalPurpose,
}) {
  const reasons = [
    globalPurpose,
    "Low Stock",
    "New Product Launch",
    "Customer Request",
    "Marketing Display",
    "Internal Use"
  ];
  const uniqueReasons = [...new Set(reasons)];

  // Handle manual input change
  const handleQtyChange = (idx, value) => {
    // Allow empty string for typing, otherwise parse int
    const val = value === "" ? "" : parseInt(value);
    if (val !== "" && isNaN(val)) return; 
    onUpdate(idx, { quantity: val });
  };

  // Handle blur to ensure valid number
  const handleBlur = (idx, value) => {
    if (value === "" || value < 1) {
      onUpdate(idx, { quantity: 1 });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header - Fixed */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            Selected Items ({items.length})
        </div>
      </div>

      {/* List Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-3">
             <ShoppingCart className="w-12 h-12 opacity-10" />
             <div className="text-center">
                <p className="text-sm font-medium">Your request list is empty.</p>
                <p className="text-xs">Select items from the catalog to start.</p>
             </div>
           </div>
        ) : (
          items.map((item, idx) => {
            const productTitle = [item.brand, item.model].filter(Boolean).join(" ") || item.variant_name || "Unknown Product";
            const attrs = item.variant_attributes || {};
            const specBadges = [attrs.RAM || attrs.ram, attrs.ROM || attrs.rom || attrs.Storage || attrs.storage, attrs.Color || attrs.color].filter(Boolean);
            const conditionLabel = item.condition === "Certified Pre-Owned" ? "CPO" : "Brand New";
            const conditionBadgeClass =
              conditionLabel === "CPO"
                ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";

            return (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm relative group">
                
                {/* Header Row */}
                <div className="flex justify-between items-start mb-2 pr-6">
                    <div>
                        <h4 className="font-medium text-sm text-gray-800 dark:text-gray-100 leading-tight">{productTitle}</h4>
                        {(conditionLabel || specBadges.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded ${conditionBadgeClass}`}
                            >
                              {conditionLabel}
                            </span>
                            {specBadges.map((spec) => (
                              <span
                                key={spec}
                                className="text-[10px] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                    <button 
                        onClick={() => onRemove(idx)}
                        className="absolute top-2 right-2 p-1 text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Controls Container */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2 space-y-3">
                    
                    {/* Row 1: Quantity & Reason */}
                    <div className="flex gap-2">
                        {/* Editable Stepper */}
                        <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded h-8 w-28 shrink-0">
                            <button 
                                onClick={() => onUpdate(idx, { quantity: Math.max(1, (item.quantity || 0) - 1) })}
                                className="px-2 h-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-300 rounded-l transition"
                            >-</button>
                            <Input 
                                type="number"
                                className="h-full border-0 bg-transparent text-center text-sm font-bold text-gray-800 dark:text-gray-100 p-0 focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={item.quantity} 
                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                onBlur={(e) => handleBlur(idx, item.quantity)}
                            />
                            <button 
                                onClick={() => onUpdate(idx, { quantity: (item.quantity || 0) + 1 })}
                                className="px-2 h-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-300 rounded-r transition"
                            >+</button>
                        </div>

                        {/* Reason Dropdown */}
                        <Select 
                            value={item.reason} 
                            onValueChange={(val) => onUpdate(idx, { reason: val })}
                        >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 border-gray-200 flex-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueReasons.map(r => (
                                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Row 2: Quick Add Buttons */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider shrink-0">Quick Add:</span>
                        <div className="flex flex-wrap gap-1">
                            {[1, 5, 10, 20, 50].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => onUpdate(idx, { quantity: (item.quantity || 0) + num })}
                                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-700 transition"
                                >
                                    +{num}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}