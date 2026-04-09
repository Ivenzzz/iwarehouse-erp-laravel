import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { Button } from "@/shared/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import BatchUpdateFieldForm from "@/features/inventory/dialogs/BatchUpdateFieldForm";
import BatchUpdateResults from "@/features/inventory/dialogs/BatchUpdateResults";

export default function BatchUpdateDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedItemIds,
  warehouses,
  onConfirm,
  isUpdating,
  result,
  onReset,
}) {
  const [fields, setFields] = useState({});
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [variantOptions, setVariantOptions] = useState([]);
  const [variantSearchValue, setVariantSearchValue] = useState("");
  const [variantPage, setVariantPage] = useState(1);
  const [variantLastPage, setVariantLastPage] = useState(1);
  const [variantLoading, setVariantLoading] = useState(false);

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
    setVariantOptions([]);
    setVariantPage(1);
    setVariantLastPage(1);
    setVariantSearchValue("");
    onReset?.();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open || result) {
      return undefined;
    }

    let isActive = true;

    const fetchVariantOptions = async () => {
      setVariantLoading(true);

      try {
        const response = await axios.get(route("inventory.variant-options"), {
          params: {
            search: variantSearchValue,
            page: 1,
          },
        });

        if (!isActive) {
          return;
        }

        const variants = response.data.variants ?? {};
        setVariantOptions((variants.data || []).map((variant) => ({
          value: variant.id,
          label: variant.label,
          description: variant.description,
        })));
        setVariantPage(variants.current_page || 1);
        setVariantLastPage(variants.last_page || 1);
      } catch (error) {
        if (isActive) {
          setVariantOptions([]);
          setVariantPage(1);
          setVariantLastPage(1);
        }
      } finally {
        if (isActive) {
          setVariantLoading(false);
        }
      }
    };

    fetchVariantOptions();

    return () => {
      isActive = false;
    };
  }, [open, result, variantSearchValue]);

  const loadMoreVariants = async () => {
    if (variantLoading || variantPage >= variantLastPage) {
      return;
    }

    setVariantLoading(true);

    try {
      const response = await axios.get(route("inventory.variant-options"), {
        params: {
          search: variantSearchValue,
          page: variantPage + 1,
        },
      });

      const variants = response.data.variants ?? {};
      const nextOptions = (variants.data || []).map((variant) => ({
        value: variant.id,
        label: variant.label,
        description: variant.description,
      }));

      setVariantOptions((current) => {
        const seen = new Set(current.map((option) => String(option.value)));
        const appended = nextOptions.filter((option) => !seen.has(String(option.value)));

        return [...current, ...appended];
      });
      setVariantPage(variants.current_page || variantPage);
      setVariantLastPage(variants.last_page || variantLastPage);
    } catch (error) {
      // Keep the current option list intact if pagination fails.
    } finally {
      setVariantLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }

      handleClose();
    }}>
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
          <BatchUpdateFieldForm
            fields={fields}
            onChange={setFields}
            variantOptions={variantOptions}
            warehouseOptions={warehouseOptions}
            variantSearchValue={variantSearchValue}
            onVariantSearchChange={setVariantSearchValue}
            onVariantLoadMore={loadMoreVariants}
            canLoadMoreVariants={variantPage < variantLastPage}
            isVariantLoading={variantLoading}
          />
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
