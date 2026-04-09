import React from "react";
import { Trash2, Package, Tag } from "lucide-react";

export default function POSCartTable({
  cart,
  salesRepOptions,
  onRemoveFromCart,
  onDiscountClick,
  onTogglePriceBasis,
}) {
  return (
    <table className="w-full text-xs border-collapse hidden md:table">
      <thead className="sticky top-0 z-10 border-b bg-slate-200 border-slate-300 dark:bg-[#0f172a] dark:border-slate-800">
        <tr>
          {["Code", "Item Name"].map((h) => (
            <th key={h} className="text-left px-2 py-2.5 border-b border-r border-slate-300 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">{h}</th>
          ))}
          {["Cash", "SRP"].map((h) => (
            <th key={h} className="text-right px-2 py-2.5 border-b border-r border-slate-300 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">{h}</th>
          ))}
          <th className="text-center px-2 py-2.5 border-b border-r border-slate-300 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">Basis</th>
          <th className="text-right px-2 py-2.5 border-b border-r border-slate-300 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">Subtotal</th>
          <th className="text-center px-2 py-2.5 border-b border-slate-300 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">Action</th>
        </tr>
      </thead>
      <tbody>
        {cart.map((item, index) => {
          const cashPrice = item.cash_price || 0;
          const srpPrice = item.srp || 0;
          const stockOnHand = item.stock_on_hand || 0;
          const brandModel = [item.brand_name, item.model].filter(Boolean).join(" ");
          const attrs = item.attributes || {};
          const condition = item.condition || "";
          const ram = attrs.RAM || attrs.ram || attrs.memory || "";
          const rom = attrs.ROM || attrs.rom || attrs.Storage || attrs.storage || "";
          const color = attrs.color || attrs.Color || "";
          const warranty = item.warranty_description || "";

          const isCash = item.price_basis !== "srp";
          const lineTotal = item.unit_price * item.quantity - (item.discount_amount || 0);

          return [
            <tr key={`row-${index}`} className="transition-colors even:bg-slate-50 hover:bg-indigo-50 dark:even:bg-white/5 dark:hover:bg-indigo-500/10">
              <td className="px-2 py-2 border-b border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                {item.imei1 || item.serial_number || "-"}
                {item.is_bundle && (
                  <div className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">{item.bundle_serial}</div>
                )}
              </td>
              <td className="px-2 py-2 border-b border-r border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">
                  {brandModel || item.variant_name || item.displayName}
                  {item.is_bundle && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] rounded font-bold dark:bg-purple-900/30 dark:text-purple-300">BUNDLE</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {condition && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{condition}</span>}
                  {ram && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{ram}</span>}
                  {rom && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{rom}</span>}
                  {color && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">{color}</span>}
                  {warranty && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{warranty}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {item.sales_representative_id && (
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      Sales Rep: {salesRepOptions.find((r) => r.value === item.sales_representative_id)?.label || "N/A"}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px]">
                    <Package className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span className={`font-semibold ${stockOnHand <= 5 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      Stock: {stockOnHand}
                    </span>
                  </div>
                </div>
              </td>
              <td className={`px-2 py-2 border-b border-r border-slate-200 dark:border-slate-800 text-right text-[10px] ${isCash ? "font-bold text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                ₱{cashPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </td>
              <td className={`px-2 py-2 border-b border-r border-slate-200 dark:border-slate-800 text-right text-[10px] ${!isCash ? "font-bold text-orange-700 dark:text-orange-400" : "text-slate-700 dark:text-slate-300"}`}>
                ₱{srpPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 border-b border-r border-slate-200 dark:border-slate-800 text-center">
                <button
                  onClick={() => onTogglePriceBasis(index)}
                  className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer select-none transition-colors ${
                    isCash
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                      : "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60"
                  }`}
                >
                  {isCash ? "CASH" : "SRP"}
                </button>
              </td>
              <td className="px-2 py-2 border-b border-r border-slate-200 dark:border-slate-800 font-semibold text-right text-slate-900 dark:text-slate-100">
                ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 border-b border-slate-200 dark:border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onDiscountClick(index)}
                    className="px-1.5 py-1 rounded text-[10px] inline-flex items-center gap-0.5 transition-colors border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50"
                    title="Add Discount"
                  >
                    <Tag className="w-3 h-3" />
                    {item.discount_amount > 0 ? `₱${item.discount_amount.toFixed(0)}` : "Disc"}
                  </button>
                  <button
                    onClick={() => onRemoveFromCart(index)}
                    className="p-1 rounded text-[10px] inline-flex items-center text-white transition-colors bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
                    title="Remove Item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>,
            item.is_bundle && item.bundle_components?.length > 0 ? (
              <tr key={`bundle-${index}`} className="bg-purple-50 dark:bg-purple-900/10">
                <td colSpan={7} className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold mb-1">
                    Bundle Includes ({item.bundle_components.length} items):
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {item.bundle_components.map((comp, compIdx) => (
                      <div key={compIdx} className="flex items-center gap-2 text-[10px] rounded px-2 py-1 border bg-white border-slate-200 text-slate-700 dark:bg-[#0f172a] dark:border-slate-800 dark:text-slate-300">
                        <span className="w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-bold bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300">{compIdx + 1}</span>
                        <span className="font-medium">{comp.product_name} {comp.variant_name}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-[9px]">{comp.imei1 || comp.serial_number || "-"}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ) : null,
          ];
        })}
      </tbody>
    </table>
  );
}
