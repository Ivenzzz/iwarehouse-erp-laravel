import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PriceConfirmDialog({
  open,
  onOpenChange,
  selectedCount,
  skippedCount,
  newCashPrice,
  newSrp,
  newCashPriceFormatted,
  newSrpFormatted,
  onConfirm,
  isUpdating,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-gray-900 dark:text-white">Confirm Price Update</DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400">
                This action will update prices for {selectedCount} inventory item{selectedCount !== 1 ? "s" : ""}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {newCashPrice !== null && (
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">New Cash Price</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono">
                {newCashPriceFormatted}
              </span>
            </div>
          )}
          {newSrp !== null && (
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">New SRP</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono">
                {newSrpFormatted}
              </span>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>{selectedCount}</strong> item{selectedCount !== 1 ? "s" : ""} will be updated.
              A price change entry will be logged in each item's movement history.
              {skippedCount > 0 ? ` ${skippedCount} selected item${skippedCount !== 1 ? "s were" : " was"} skipped because they are no longer eligible.` : ""}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Confirm Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
