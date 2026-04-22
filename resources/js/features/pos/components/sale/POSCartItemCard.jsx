import React from "react";
import { Trash2, Package, Tag } from "lucide-react";

export default function POSCartItemCard({
  item,
  index,
  salesRepOptions,
  onRemove,
  onDiscountClick,
  onTogglePriceBasis,
}) {
  const costPrice = item.cost_price || 0;
  const cashPrice = item.cash_price || 0;
  const srpPrice = item.srp || 0;
  const isCash = item.price_basis !== "srp";
  const lineTotal = item.unit_price * item.quantity - (item.discount_amount || 0);

  const brandModel = [item.brand_name, item.model].filter(Boolean).join(" ");
  const attrs = item.attributes || {};
  const condition = item.condition || "";
  const ram = attrs.RAM || attrs.ram || attrs.memory || "";
  const rom = attrs.rom || "";
  const color = attrs.color || attrs.Color || "";
  const warranty = item.warranty_description || "";

  return (
    <div className="rounded-lg border p-3 space-y-2 bg-white border-slate-200 dark:bg-[#0f172a] dark:border-slate-800">
      {/* Row 1: Name + Basis Badge + Delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {brandModel || item.variant_name || item.displayName}
            {item.is_bundle && (
              <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 text-[8px] rounded font-bold dark:bg-purple-900/30 dark:text-purple-300">
                BUNDLE
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
          {condition && <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{condition}</span>}
            {ram && <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{ram}</span>}
            {rom && <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{rom}</span>}
            {color && <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">{color}</span>}
            {warranty && <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{warranty}</span>}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {item.imei1 || item.serial_number || "-"}
            {item.is_bundle && item.bundle_serial && (
              <span className="ml-1 text-purple-500 dark:text-purple-400">{item.bundle_serial}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onTogglePriceBasis(index)}
            className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer select-none transition-colors ${
              isCash
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                : "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60"
            }`}
          >
            {isCash ? "CASH" : "SRP"}
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 rounded bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: Prices grid */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="rounded px-2 py-1 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400 block">Cash</span>
          <span className={`font-semibold ${isCash ? "text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"}`}>
            ₱{cashPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="rounded px-2 py-1 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400 block">SRP</span>
          <span className={`font-semibold ${!isCash ? "text-orange-700 dark:text-orange-400" : "text-slate-800 dark:text-slate-200"}`}>
            ₱{srpPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="rounded px-2 py-1 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400 block">Cost</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">₱{costPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Row 3: Discount + Subtotal + Meta */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px]">
          <button
            onClick={() => onDiscountClick(index)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <Tag className="w-3 h-3" />
            {item.discount_amount > 0 ? `₱${item.discount_amount.toFixed(0)}` : "Disc"}
          </button>

          <div className="flex items-center gap-1">
            <Package className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span className={`font-semibold ${(item.stock_on_hand || 0) <= 5 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {item.stock_on_hand || 0}
            </span>
          </div>

          {item.sales_representative_id && (
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
              Rep: {salesRepOptions.find((r) => r.value === item.sales_representative_id)?.label || "N/A"}
            </span>
          )}
        </div>

        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
          ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Bundle Components */}
      {item.is_bundle && item.bundle_components?.length > 0 && (
        <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
          <div className="text-[9px] text-purple-600 dark:text-purple-300 font-semibold mb-1">
            Bundle ({item.bundle_components.length} items):
          </div>
          <div className="space-y-0.5">
            {item.bundle_components.map((comp, i) => (
              <div key={i} className="text-[9px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <span className="w-3 h-3 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300 text-[7px] font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="truncate">{comp.product_name} {comp.variant_name}</span>
                <span className="font-mono text-slate-400 dark:text-slate-500">{comp.imei1 || comp.serial_number || ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
