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
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import BatchUpdateFieldForm from "./BatchUpdateFieldForm";
import BatchUpdateResults from "./BatchUpdateResults";

const EMPTY_FIELDS = {};

/**
 * Compute common field values across selected inventory items.
 * A field is "common" only when every selected item shares the same non-empty value.
 */
function computeCommonFields(items) {
  if (!items || items.length === 0) return EMPTY_FIELDS;

  const SIMPLE_KEYS = [
    "variant_id", "imei1", "imei2", "serial_number", "warehouse_id",
    "status", "encoded_date", "warranty_description",
    "cost_price", "cash_price", "srp",
    "cpu", "gpu", "package", "grn_number", "purchase",
  ];

  const PFD_KEYS = [
    "imei3", "model_code", "submodel", "ram_type", "rom_type", "ram_slots",
    "sim_slot", "network_1", "network_2", "network_type", "product_type",
    "with_charger", "code", "country_model", "os", "software", "resolution",
    "condition", "intro", "details", "product_details",
  ];

  const result = {};

  for (const key of SIMPLE_KEYS) {
    const first = items[0][key];
    if (first !== undefined && first !== null && first !== "") {
      const allSame = items.every((item) => item[key] === first);
      if (allSame) result[key] = first;
    }
  }

  // purchase_file_data sub-fields
  const pfdCommon = {};
  let hasPfd = false;
  for (const sk of PFD_KEYS) {
    const first = items[0]?.purchase_file_data?.[sk];
    if (first !== undefined && first !== null && first !== "") {
      const allSame = items.every((item) => item?.purchase_file_data?.[sk] === first);
      if (allSame) {
        pfdCommon[sk] = first;
        hasPfd = true;
      }
    }
  }
  if (hasPfd) result.purchase_file_data = pfdCommon;

  return result;
}

export function BatchUpdateDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedItemIds,
  selectedInventoryItems,
  variants,
  warehouses,
  onConfirm,
  isUpdating,
  result,
  onReset,
}) {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Prefill fields with common values when dialog opens
  React.useEffect(() => {
    if (open && !initialized) {
      const common = computeCommonFields(selectedInventoryItems);
      setFields(common);
      setInitialized(true);
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open, initialized, selectedInventoryItems]);

  const variantOptions = useMemo(() => {
    return variants
      .filter((v) => v.is_active !== false)
      .map((v) => ({ value: v.id, label: v.variant_name || v.variant_sku || v.id }));
  }, [variants]);

  const warehouseOptions = useMemo(() => {
    return warehouses
      .filter((w) => w.is_active !== false)
      .map((w) => ({ value: w.id, label: w.name }));
  }, [warehouses]);

  // Count how many fields are actually filled
  const filledFieldCount = useMemo(() => {
    let count = 0;
    for (const [key, value] of Object.entries(fields)) {
      if (key === "purchase_file_data") {
        if (value && typeof value === "object") {
          const hasAnyPfd = Object.values(value).some((v) => v !== "" && v !== undefined && v !== null);
          if (hasAnyPfd) count++;
        }
        continue;
      }
      if (value !== "" && value !== undefined && value !== null) count++;
    }
    return count;
  }, [fields]);

  const showResult = result && (result.succeeded?.length > 0 || result.failed?.length > 0 || result.skippedConflicts?.length > 0);
  const confirmRequired = `UPDATE ${selectedCount}`;

  const handleConfirm = () => {
    onConfirm(selectedItemIds, fields);
  };

  const handleClose = () => {
    setFields(EMPTY_FIELDS);
    setConfirmStep(false);
    setConfirmText("");
    onReset?.();
    onOpenChange(false);
  };

  const handleBack = () => {
    setConfirmStep(false);
    setConfirmText("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
            {showResult ? "Batch Update Results" : confirmStep ? "Confirm Batch Update" : "Batch Update Inventory"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
            {showResult
              ? "Here are the results of the batch update."
              : confirmStep
              ? `Type "${confirmRequired}" to confirm updating ${selectedCount} item(s).`
              : `Update ${selectedCount} selected item(s). Only filled fields will be applied.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {showResult ? (
          <BatchUpdateResults result={result} />
        ) : confirmStep ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm text-slate-700 dark:text-slate-300">
              <p>
                You are about to update{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedCount}
                </span>{" "}
                item(s) across{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {filledFieldCount}
                </span>{" "}
                field(s).
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Type <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{confirmRequired}</span> to proceed
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmRequired}
                className="h-9 text-sm border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
        ) : (
          <BatchUpdateFieldForm
            fields={fields}
            onChange={setFields}
            variantOptions={variantOptions}
            warehouseOptions={warehouseOptions}
          />
        )}

        <AlertDialogFooter>
          {showResult ? (
            <AlertDialogCancel
              onClick={handleClose}
              className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Close
            </AlertDialogCancel>
          ) : confirmStep ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmText !== confirmRequired || isUpdating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Confirm Update`
                )}
              </Button>
            </>
          ) : (
            <>
              <AlertDialogCancel
                onClick={handleClose}
                className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                onClick={() => setConfirmStep(true)}
                disabled={filledFieldCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Review & Confirm ({filledFieldCount} field{filledFieldCount !== 1 ? "s" : ""})
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}