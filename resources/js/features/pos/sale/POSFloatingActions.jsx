import React, { useState } from "react";
import { Search, ArchiveRestore, Tag, Plus, X } from "lucide-react";

export default function POSFloatingActions({ onSearch, onPriceCheck, onReturns }) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { label: "Transactions (F2)", icon: Search, onClick: onSearch, color: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400" },
    { label: "Price Check (F3)", icon: Tag, onClick: onPriceCheck, color: "bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500" },
    { label: "Return (F5)", icon: ArchiveRestore, onClick: onReturns, color: "bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600" },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end gap-2 md:hidden">
      {/* Action items */}
      {isOpen && actions.map((action, i) => (
        <button
          key={i}
          onClick={() => { action.onClick(); setIsOpen(false); }}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-full text-white text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${action.color}`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </button>
      ))}

      {/* FAB toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white transition-all ${
          isOpen
            ? "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 rotate-45"
            : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        }`}
      >
        {isOpen ? <X className="w-5 h-5 -rotate-45" /> : <Plus className="w-5 h-5" />}
      </button>
    </div>
  );
}