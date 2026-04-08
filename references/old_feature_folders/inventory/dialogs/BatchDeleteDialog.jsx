import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isDeleting,
  result,
  onReset,
}) {
  const handleClose = () => {
    onReset();
    onOpenChange(false);
  };

  // Result view
  if (result) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 dark:text-slate-100">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Deletion Complete
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>{result.deleted} item(s) deleted successfully.</p>
                {result.failed > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    {result.failed} item(s) failed to delete.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Confirmation view
  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Delete {selectedCount} Inventory Item{selectedCount > 1 ? "s" : ""}
          </AlertDialogTitle>
          <AlertDialogDescription className="dark:text-slate-400">
            This action is <strong className="text-red-600 dark:text-red-400">permanent and cannot be undone</strong>. 
            Are you sure you want to delete {selectedCount} selected inventory item{selectedCount > 1 ? "s" : ""}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="dark:border-slate-700 dark:text-slate-300">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${selectedCount} Item${selectedCount > 1 ? "s" : ""}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}