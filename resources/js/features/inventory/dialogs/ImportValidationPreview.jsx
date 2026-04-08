import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

export default function ImportValidationPreview({ validationResult }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Alert>
          <AlertDescription>
            <div className="font-semibold">{validationResult.totalRows}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total rows</div>
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertDescription>
            <div className="font-semibold text-emerald-600">{validationResult.validRows.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Valid rows</div>
          </AlertDescription>
        </Alert>
        <Alert variant={validationResult.skippedItems.length ? "destructive" : "default"}>
          <AlertDescription>
            <div className="font-semibold">{validationResult.skippedItems.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Skipped rows</div>
          </AlertDescription>
        </Alert>
      </div>

      {validationResult.variantsCreated > 0 ? (
        <Alert>
          <AlertDescription>
            {validationResult.variantsCreated} missing variant(s) will be created during import.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
            Valid Rows
          </div>
          <ScrollArea className="max-h-72 p-4">
            <div className="space-y-2">
              {validationResult.validRows.map((row) => (
                <div key={row.row} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <div>
                    <div className="font-medium">{row.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Warehouse: {row.warehouse}</div>
                  </div>
                  <Badge variant="outline">Row {row.row}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
            Skipped Rows
          </div>
          <ScrollArea className="max-h-72 p-4">
            <div className="space-y-2">
              {validationResult.skippedItems.length ? validationResult.skippedItems.map((row) => (
                <div key={`${row.row}-${row.label}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <div className="font-medium">Row {row.row}: {row.label}</div>
                  <div className="text-xs">{row.reason}</div>
                </div>
              )) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No skipped rows.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
