import { useMemo, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";

export default function BatchWarehouseDialog({
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

  const itemsToMove = useMemo(() => {
    if (!targetWarehouseId) return selectedInventoryItems;
    return selectedInventoryItems.filter((item) => String(item.warehouse_id) !== String(targetWarehouseId));
  }, [selectedInventoryItems, targetWarehouseId]);

  const handleClose = () => {
    setTargetWarehouseId("");
    onReset?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move Warehouse</AlertDialogTitle>
          <AlertDialogDescription>
            Move {selectedInventoryItems.length} selected item(s) to another warehouse.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {result ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            <div>{result.succeeded?.length || 0} item(s) moved successfully.</div>
            {result.failed?.length ? <div className="text-red-600">{result.failed.length} item(s) failed.</div> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <select value={targetWarehouseId} onChange={(event) => setTargetWarehouseId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <option value="">Select target warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
            {selectedInventoryItems.length !== itemsToMove.length ? (
              <div className="text-xs text-amber-600">
                {selectedInventoryItems.length - itemsToMove.length} item(s) are already assigned to the selected warehouse and will be skipped.
              </div>
            ) : null}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleClose}>{result ? "Close" : "Cancel"}</Button>
          </AlertDialogCancel>
          {!result ? (
            <Button disabled={!targetWarehouseId || itemsToMove.length === 0 || isUpdating} onClick={() => onConfirm(itemsToMove.map((item) => item.id), targetWarehouseId)}>
              {isUpdating ? "Moving..." : `Move ${itemsToMove.length} item(s)`}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
