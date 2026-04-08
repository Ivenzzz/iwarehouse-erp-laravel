import { Button } from "@/shared/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";

export default function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isDeleting,
  result,
  onReset,
}) {
  const handleClose = () => {
    onReset?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{result ? "Batch Delete Results" : "Delete Inventory Items"}</AlertDialogTitle>
          <AlertDialogDescription>
            {result
              ? "Review the deletion result below."
              : `Delete ${selectedCount} selected inventory item(s). This permanently removes the records and their logs.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {result ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            <div>{result.deleted || 0} item(s) deleted successfully.</div>
            {result.failed ? <div className="text-red-600">{result.failed} item(s) failed to delete.</div> : null}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleClose}>{result ? "Close" : "Cancel"}</Button>
          </AlertDialogCancel>
          {!result ? (
            <Button variant="destructive" disabled={isDeleting} onClick={onConfirm}>
              {isDeleting ? "Deleting..." : `Delete ${selectedCount} item(s)`}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
