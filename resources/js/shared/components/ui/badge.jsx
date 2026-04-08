import * as React from "react";

import { cn } from "@/shared/lib/utils";

function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
    outline: "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
    secondary: "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant] ?? variants.default,
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
