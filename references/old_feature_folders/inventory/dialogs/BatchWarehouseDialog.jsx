import React, { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export function BatchWarehouseDialog({
  open,
  onOpenChange,
  selectedInventoryItems,
  warehouses,
  onConfirm,
  isUpdating,
  result,
  onReset,
}) {
  const [targetWarehouseId, setTargetWarehouseId] = useState("");

  // Warehouse IDs currently held by the selected items
  const currentWarehouseIds = useMemo(() => {
    return new Set(selectedInventoryItems.map((i) => i.warehouse_id));
  }, [selectedInventoryItems]);

  // Only active warehouses, excluding any warehouse that ALL selected items already belong to
  // (exclude a warehouse only if every selected item is already there)
  const warehouseOptions = useMemo(() => {
    return warehouses
      .filter((w) => w.is_active !== false)
      .filter((w) => !currentWarehouseIds.has(w.id) || currentWarehouseIds.size > 1)
      .map((w) => ({ value: w.id, label: w.name }));
  }, [warehouses, currentWarehouseIds]);

  // Items that will actually be moved (exclude items already at the target)
  const itemsToMove = useMemo(() => {
    if (!targetWarehouseId) return selectedInventoryItems;
    return selectedInventoryItems.filter((i) => i.warehouse_id !== targetWarehouseId);
  }, [selectedInventoryItems, targetWarehouseId]);

  const targetWarehouse = warehouses.find((w) => w.id === targetWarehouseId);

  const handleConfirm = () => {
    if (!targetWarehouseId || itemsToMove.length === 0) return;
    onConfirm(itemsToMove.map((i) => i.id), targetWarehouseId);
  };

  const handleClose = () => {
    setTargetWarehouseId("");
    onReset?.();
    onOpenChange(false);
  };

  const showResult = result && (result.succeeded.length > 0 || result.failed.length > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
            {showResult ? "Batch Update Results" : "Batch Update Warehouse"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
            {showResult
              ? "Here are the results of the batch update."
              : `Move ${selectedInventoryItems.length} selected item(s) to a new warehouse.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!showResult ? (
          <div className="space-y-4 py-2">
            {/* Warehouse picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Target Warehouse
              </label>
              <Combobox
                options={warehouseOptions}
                value={targetWarehouseId}
                onValueChange={setTargetWarehouseId}
                placeholder="Select warehouse..."
                className="w-full dark:bg-slate-950 dark:border-slate-700"
              />
            </div>

            {/* Preview summary */}
            {targetWarehouseId && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                <p>
                  You are about to move{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {itemsToMove.length}
                  </span>{" "}
                  item(s) to{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {targetWarehouse?.name}
                  </span>
                  .
                </p>
                {selectedInventoryItems.length !== itemsToMove.length && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedInventoryItems.length - itemsToMove.length} item(s) already at this
                    warehouse will be skipped.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {result.succeeded.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{result.succeeded.length} item(s) moved successfully</span>
              </div>
            )}
            {result.failed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
                  <XCircle className="w-4 h-4" />
                  <span>{result.failed.length} item(s) failed</span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-2 space-y-1">
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
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleClose}
            className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {showResult ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!showResult && (
            <Button
              onClick={handleConfirm}
              disabled={!targetWarehouseId || itemsToMove.length === 0 || isUpdating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Move ${itemsToMove.length} Item(s)`
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}