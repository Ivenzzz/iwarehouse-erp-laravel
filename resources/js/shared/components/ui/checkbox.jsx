import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const Checkbox = React.forwardRef(function Checkbox(
  { checked = false, onCheckedChange, className, disabled = false, ...props },
  ref,
) {
  const isChecked = checked === true;

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!isChecked)}
      className={cn(
        "inline-flex size-4 items-center justify-center rounded border border-slate-300 bg-white text-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950",
        isChecked && "border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500",
        className,
      )}
      {...props}
    >
      {isChecked ? <Check className="size-3" /> : null}
    </button>
  );
});

export { Checkbox };
