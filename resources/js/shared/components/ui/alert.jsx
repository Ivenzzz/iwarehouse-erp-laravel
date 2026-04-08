import * as React from "react";

import { cn } from "@/shared/lib/utils";

function Alert({ className, variant = "default", ...props }) {
  const variants = {
    default: "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
    destructive: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  };

  return (
    <div
      role="alert"
      className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", variants[variant] ?? variants.default, className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }) {
  return <div className={cn("min-w-0 flex-1", className)} {...props} />;
}

export { Alert, AlertDescription };
