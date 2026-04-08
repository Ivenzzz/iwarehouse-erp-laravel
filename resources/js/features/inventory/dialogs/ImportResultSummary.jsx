import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

export default function ImportResultSummary({ importResult }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Alert>
          <AlertDescription>
            <div className="font-semibold text-emerald-600">{importResult.created}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Created items</div>
          </AlertDescription>
        </Alert>
        <Alert variant={importResult.failed ? "destructive" : "default"}>
          <AlertDescription>
            <div className="font-semibold">{importResult.failed}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Failed items</div>
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
            Created Rows
          </div>
          <ScrollArea className="max-h-72 p-4">
            <div className="space-y-2">
              {importResult.createdItems?.length ? importResult.createdItems.map((item) => (
                <div key={`${item.row}-${item.label}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <div className="font-medium">Row {item.row}: {item.label}</div>
                  <div className="text-xs">Warehouse: {item.warehouse}</div>
                </div>
              )) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No items were created.</div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
            Failures
          </div>
          <ScrollArea className="max-h-72 p-4">
            <div className="space-y-2">
              {importResult.skippedItems?.length ? importResult.skippedItems.map((item) => (
                <div key={`${item.row}-${item.label}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <div className="font-medium">Row {item.row}: {item.label}</div>
                  <div className="text-xs">{item.reason}</div>
                </div>
              )) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No failures recorded.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
