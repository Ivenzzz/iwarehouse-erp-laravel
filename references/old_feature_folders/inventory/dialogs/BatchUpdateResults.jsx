import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function BatchUpdateResults({ result }) {
  if (!result) return null;

  return (
    <div className="space-y-3 py-2">
      {result.succeeded.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{result.succeeded.length} item(s) updated successfully</span>
        </div>
      )}

      {result.skippedConflicts?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{result.skippedConflicts.length} IMEI/SN conflict(s) skipped</span>
          </div>
          <div className="max-h-32 overflow-y-auto rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2 space-y-1">
            {result.skippedConflicts.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-mono text-amber-700 dark:text-amber-400 truncate max-w-[200px]">
                  {c.field}: {c.value}
                </span>
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                  duplicate
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.failed.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{result.failed.length} item(s) failed</span>
          </div>
          <div className="max-h-32 overflow-y-auto rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-2 space-y-1">
            {result.failed.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-xs">
                <span className="font-mono text-rose-700 dark:text-rose-400 truncate max-w-[200px]">
                  {f.id}
                </span>
                <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400">
                  {f.error}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}