import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ValidationErrorsDialog({ open, errors }) {
  if (!open || errors.length === 0) return null;

  return (
    <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-medium">Validation Errors ({errors.length})</span>
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {errors.map((err, i) => (
          <p key={i} className="text-xs text-[hsl(var(--destructive))]">
            {err.message}
          </p>
        ))}
      </div>
    </div>
  );
}
