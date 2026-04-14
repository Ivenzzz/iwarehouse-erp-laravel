import React, { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, Building2, MapPin, Truck, Package, Activity, AlertTriangle, Info } from "lucide-react";
import PortalTooltip from "@/components/shared/PortalTooltip";

function getSpecBadges(attrs = {}) {
  return [attrs.ram, attrs.rom, attrs.color].filter(Boolean);
}

export default function ProductSearchItem({ variant, onAdd, cartQty }) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const hideTimeoutRef = useRef(null);
  const triggerRef = useRef(null);

  const metrics = variant.metrics || {};
  const currentStock = Number(metrics.current_stock || 0);
  const warehouseStock = Number(metrics.main_warehouse_stock || 0);
  const incomingTransfer = metrics.incoming_transfer_to_branch || { quantity: 0, eta: null };
  const incomingPO = Number(metrics.incoming_po_to_warehouse || 0);
  const ads = metrics.ads || { ads7: 0, ads14: 0, ads28: 0 };
  const recommendedQty = Number(metrics.recommended_qty || 0);
  const otherBranches = Array.isArray(metrics.other_branches) ? metrics.other_branches : [];

  const isOutOfStock = currentStock === 0;
  const conditionLabel = variant.condition === "Certified Pre-Owned" ? "CPO" : "Brand New";
  const specBadges = getSpecBadges(variant.variant_attributes || {});
  const productTitle = [variant.brand, variant.model].filter(Boolean).join(" ").trim() || variant.variant_name || "Unknown Product";

  const statusColor = isOutOfStock
    ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
    : currentStock <= 5
      ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
      : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  const statusText = isOutOfStock ? "Out of Stock" : currentStock <= 5 ? "Low Stock" : "In Stock";

  const showTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsTooltipVisible(true);
  };

  const scheduleHideTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => setIsTooltipVisible(false), 120);
  };

  const toggleTooltip = () => {
    if (isTooltipVisible) {
      setIsTooltipVisible(false);
      return;
    }
    showTooltip();
  };

  return (
    <>
      <div className={`relative bg-white dark:bg-gray-800 p-4 rounded-xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between h-full ${cartQty ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200 dark:border-gray-700"}`}>
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col gap-1.5 items-start">
              <Badge className={`${statusColor} text-[10px] px-1.5 py-0 whitespace-nowrap font-medium shadow-none`}>{statusText}</Badge>
              <Badge className={`${conditionLabel === "CPO" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"} border text-[10px] px-1.5 py-0 whitespace-nowrap font-medium shadow-none`}>{conditionLabel}</Badge>
            </div>
            <button
              ref={triggerRef}
              type="button"
              onMouseEnter={showTooltip}
              onMouseLeave={scheduleHideTooltip}
              onClick={toggleTooltip}
              className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2 py-1 rounded cursor-help hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ml-2"
            >
              <Info size={12} />
              More Info
            </button>
          </div>

          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 leading-tight mb-1 mt-2">{productTitle}</h3>
          {variant.variant_name ? <p className="text-[11px] text-gray-600 dark:text-gray-300">{variant.variant_name}</p> : null}
          {specBadges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2 pb-3">
              {specBadges.map((spec) => (
                <Badge key={spec} variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-none">{spec}</Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-auto">
          {cartQty ? (
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800">
              <Check size={14} /> Added ({cartQty})
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300" onClick={onAdd}>
                <Plus size={12} />
              </Button>
            </div>
          ) : (
            <Button onClick={onAdd} className={`w-full h-9 text-xs flex items-center justify-center transition-colors ${isOutOfStock ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white"}`}>
              {isOutOfStock ? <><AlertTriangle size={14} className="mr-1.5" /> Request Restock</> : <><Plus size={14} className="mr-1.5" /> Add to List</>}
            </Button>
          )}
        </div>
      </div>

      <PortalTooltip parentRef={triggerRef} isVisible={isTooltipVisible} interactive onMouseEnter={showTooltip} onMouseLeave={scheduleHideTooltip}>
        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-2xl w-[320px]">
          <h4 className="font-bold text-sm text-white mb-3 border-b border-slate-600 pb-2">
            {productTitle}
            <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">{conditionLabel}</span>
          </h4>

          {specBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {specBadges.map((spec) => (
                <span key={spec} className="text-[10px] px-2 py-0.5 rounded border border-slate-600 text-slate-200 bg-slate-700/60">
                  {spec}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-center">
            <div className="bg-slate-700 p-2 rounded">
              <div className="text-slate-400 mb-1 flex items-center justify-center gap-1"><Building2 size={10} /> Main WH</div>
              <div className="font-bold text-green-400 text-lg">{warehouseStock}</div>
            </div>
            <div className={`bg-slate-700 p-2 rounded border ${isOutOfStock ? "border-red-500/50" : "border-blue-500/50"}`}>
              <div className="text-blue-300 mb-1 flex items-center justify-center gap-1"><MapPin size={10} /> This Branch</div>
              <div className={`font-bold text-lg ${isOutOfStock ? "text-red-400" : "text-white"}`}>{currentStock}</div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded p-2 mb-3">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-2">Stock at Other Branches</div>
            <div className="max-h-[80px] overflow-y-auto space-y-1 pr-1">
              {otherBranches.length > 0 ? (
                otherBranches.map((b) => (
                  <div key={b.warehouse_id} className="flex justify-between text-xs border-b border-slate-600/30 pb-1 last:border-0 last:pb-0">
                    <span className="text-slate-300 truncate w-3/4 text-left">{b.warehouse_name}</span>
                    <span className="font-mono font-bold text-white">{b.qty}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic text-center">No stock elsewhere</div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-3 text-xs">
            <div className="flex-1 bg-slate-700 px-2 py-1 rounded flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1"><Truck size={10} /> To Branch:</span>
              <span className="font-bold text-yellow-400">{incomingTransfer.quantity || 0}</span>
            </div>
            <div className="flex-1 bg-slate-700 px-2 py-1 rounded flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1"><Package size={10} /> To WH:</span>
              <span className="font-bold text-yellow-400">{incomingPO}</span>
            </div>
          </div>

          <div className="bg-slate-700 rounded p-2 mb-3">
            <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 text-center mb-1 border-b border-slate-600 pb-1">
              <div className="text-left pl-1">Stats</div><div>7d</div><div>14d</div><div>28d</div>
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs text-center items-center">
              <div className="text-left pl-1 text-slate-300 font-medium flex items-center gap-1"><Activity size={10} /> ADS</div>
              <div>{Number(ads.ads7 || 0).toFixed(1)}</div><div>{Number(ads.ads14 || 0).toFixed(1)}</div><div>{Number(ads.ads28 || 0).toFixed(1)}</div>
            </div>
          </div>

          <div className="bg-blue-600/20 border border-blue-500/30 p-2 rounded text-center">
            <div className="text-[10px] text-blue-300 uppercase tracking-wide">Recommended (7-Day Coverage)</div>
            <div className="text-xl font-bold text-blue-100">{recommendedQty || 1} Units</div>
          </div>
        </div>
      </PortalTooltip>
    </>
  );
}
