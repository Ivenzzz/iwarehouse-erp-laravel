import React from "react";
import { LogOut, Pause, Maximize, Minimize } from "lucide-react";
import OnlineStatusIndicator from "@/features/pos/OnlineStatusIndicator";

export default function POSHeader({
  displayTransactionNumber,
  currentUser,
  isLoadingSession,
  branchLabel,
  suspendedCount,
  isFullscreen,
  activePricingTotal,
  grandTotal,
  onRecall,
  onToggleFullscreen,
  onEndShift,
}) {
  const branchName = isLoadingSession
    ? "Loading..."
    : branchLabel || "No Branch";

  const amountDue = (activePricingTotal !== null ? activePricingTotal : grandTotal)
    .toLocaleString("en-PH", { minimumFractionDigits: 2 });

  return (
    <header className="bg-gray-200 dark:bg-gray-800 border-b-2 border-gray-400 dark:border-gray-700 flex-shrink-0">
      <div className="px-2 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="bg-black px-2 lg:px-4 py-1 lg:py-2 rounded flex flex-col items-center shadow-md shrink-0">
          <div className="flex items-baseline">
            <span className="text-orange-500 text-lg lg:text-2xl font-bold">i</span>
            <span className="text-white text-lg lg:text-2xl font-bold">Warehouse</span>
          </div>
          <span className="text-white text-[0.3rem] lg:text-[0.4rem] tracking-widest uppercase hidden lg:block">
            MAKING TECHNOLOGY AFFORDABLE FOR EVERYONE
          </span>
        </div>

        <div className="flex-1 min-w-0 text-center">
          <div className="text-xs lg:text-sm font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
            <span className="truncate">Txn#: {displayTransactionNumber}</span>
          </div>
          <div className="text-[10px] lg:text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
            {currentUser?.full_name || "Unknown"} | {branchName}
          </div>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
          <div className="hidden rounded-full border border-emerald-500/15 bg-slate-900/80 px-1.5 py-1 shadow-sm lg:block">
            <OnlineStatusIndicator />
          </div>

          <button
            onClick={onRecall}
            className="relative px-2 lg:px-3 py-1.5 lg:py-2 rounded text-[10px] lg:text-xs font-semibold flex flex-col items-center transition-colors bg-yellow-400 hover:bg-yellow-500 text-slate-900 dark:border dark:border-amber-400/20 dark:bg-amber-500/85 dark:hover:bg-amber-400 dark:text-slate-950 dark:shadow-[0_8px_24px_rgba(245,158,11,0.18)]"
          >
            <Pause className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            {suspendedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold bg-red-600 text-white dark:bg-red-500">
                {suspendedCount}
              </span>
            )}
          </button>

          <button
            onClick={onToggleFullscreen}
            className="hidden lg:flex px-2 lg:px-3 py-1.5 lg:py-2 rounded text-[10px] lg:text-xs font-semibold flex-col items-center transition-colors bg-gray-600 hover:bg-gray-700 text-white dark:border dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <div className="flex items-stretch h-9 lg:h-12 overflow-hidden rounded-md border-2 border-[#002060] dark:border-slate-700 dark:shadow-[0_0_0_1px_rgba(148,163,184,0.08)]">
            <div className="bg-[#002060] dark:bg-slate-800 text-white px-1.5 lg:px-3 flex items-center text-[10px] lg:text-sm font-medium whitespace-nowrap dark:text-slate-200">
              <span className="hidden lg:inline">Amount Due</span>
              <span className="lg:hidden">Due</span>
            </div>
            <div className="bg-white dark:bg-slate-950 text-red-600 dark:text-red-400 text-sm lg:text-2xl font-bold px-2 lg:px-4 min-w-[80px] lg:min-w-[160px] text-right flex items-center justify-end whitespace-nowrap">
              P{amountDue}
            </div>
          </div>

          <button
            onClick={onEndShift}
            className="bg-red-600 hover:bg-red-700 text-white px-2 lg:px-3 py-1.5 lg:py-2 rounded text-[10px] lg:text-xs flex flex-col items-center transition-colors dark:border dark:border-red-500/25 dark:bg-red-600/85 dark:hover:bg-red-500 dark:shadow-[0_8px_24px_rgba(220,38,38,0.16)]"
          >
            <LogOut className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
