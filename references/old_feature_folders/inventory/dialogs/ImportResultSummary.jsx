import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function ImportResultSummary({ importResult }) {
  if (importResult.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>{importResult.error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 py-2 text-center">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
        <p className="text-lg font-medium">Import Complete</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <p className="text-green-600 font-bold text-lg">{importResult.created}</p>
          <p className="text-xs text-slate-500">Created</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
          <p className="text-red-600 font-bold text-lg">{importResult.failed}</p>
          <p className="text-xs text-slate-500">Failed</p>
        </div>
      </div>

      {importResult.skippedItems?.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 rounded-lg">
          <div className="bg-red-50 dark:bg-red-900/30 px-3 py-2 border-b border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Failed Items ({importResult.skippedItems.length})
            </p>
          </div>
          <ScrollArea className="h-[180px]">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {importResult.skippedItems.map((item, index) => (
                <div key={`${item.row}-${index}`} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <span className="text-xs text-slate-400 shrink-0">Row {item.row}</span>
                  </div>
                  <p className="text-xs text-rose-600 mt-1">{item.reason}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {importResult.createdItems?.length > 0 && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg">
          <div className="bg-green-50 dark:bg-green-900/30 px-3 py-2 border-b border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Created Items ({importResult.createdItems.length})
            </p>
          </div>
          <ScrollArea className="h-[180px]">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {importResult.createdItems.map((item, index) => (
                <div
                  key={`${item.row}-${index}`}
                  className="px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{item.label}</p>
                    <p className="text-xs text-slate-500 truncate">{item.warehouse}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">Row {item.row}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}