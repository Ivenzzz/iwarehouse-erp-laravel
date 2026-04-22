import React from "react";

export default function EmptyCartState() {
  return (
    <div className="h-full flex flex-col items-center justify-center rounded-none bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 p-4">
      <p className="font-medium">Scan or search inventory to begin</p>
    </div>
  );
}
