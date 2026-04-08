import { useMemo, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import BatchUpdateFieldForm from "@/features/inventory/dialogs/BatchUpdateFieldForm";
import BatchUpdateResults from "@/features/inventory/dialogs/BatchUpdateResults";

export default function BatchUpdateDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedItemIds,
  variants,
  warehouses,
  onConfirm,
  isUpdating,
  result,
  onReset,
}) {
  const [fields, setFields] = useState({});
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const variantOptions = useMemo(
    () => variants.map((variant) => ({ value: variant.id, label: variant.variant_name || variant.variant_sku || variant.id })),
    [variants],
  );
  const warehouseOptions = useMemo(
    () => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
    [warehouses],
  );

  const filledFieldCount = useMemo(
    () => Object.values(fields).filter((value) => value !== "" && value !== null && value !== undefined).length,
    [fields],
  );

  const handleClose = () => {
    setFields({});
    setConfirmStep(false);
    setConfirmText("");
    onReset?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{result ? "Batch Update Results" : confirmStep ? "Confirm Batch Update" : "Batch Update Inventory"}</AlertDialogTitle>
          <AlertDialogDescription>
            {result
              ? "Review the update result below."
              : confirmStep
                ? `Type UPDATE ${selectedCount} to confirm the batch update.`
                : `Update ${selectedCount} selected item(s). Only fields you fill in will be applied.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {result ? (
          <BatchUpdateResults result={result} />
        ) : confirmStep ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
              You are updating {selectedCount} item(s) across {filledFieldCount} field(s).
            </div>
            <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder={`UPDATE ${selectedCount}`} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950" />
          </div>
        ) : (
          <BatchUpdateFieldForm fields={fields} onChange={setFields} variantOptions={variantOptions} warehouseOptions={warehouseOptions} />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleClose}>{result ? "Close" : "Cancel"}</Button>
          </AlertDialogCancel>
          {result ? null : confirmStep ? (
            <>
              <Button variant="outline" onClick={() => setConfirmStep(false)}>Back</Button>
              <Button disabled={confirmText !== `UPDATE ${selectedCount}` || isUpdating} onClick={() => onConfirm(selectedItemIds, fields)}>
                {isUpdating ? "Updating..." : "Confirm Update"}
              </Button>
            </>
          ) : (
            <Button disabled={filledFieldCount === 0} onClick={() => setConfirmStep(true)}>
              Review And Confirm
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
