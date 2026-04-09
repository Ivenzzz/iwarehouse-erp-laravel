import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function OnlineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-help ${isOnline
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
          : "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
        }`}>
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span>{isOnline ? "Online" : "Offline"}</span>
      </div>

      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 w-max max-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-2 rounded-md shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
          {isOnline ? "System is synced to cloud" : "No internet connection - working in offline mode"}
        </div>
      )}
    </div>
  );
}