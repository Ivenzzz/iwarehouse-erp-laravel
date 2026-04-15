import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddPurchaseFormStep from "./addpurchase/AddPurchaseFormStep";
import BrandConflictStep from "./addpurchase/BrandConflictStep";
import PreviewStep from "./addpurchase/PreviewStep";
import ImportingStep from "./addpurchase/ImportingStep";
import ImportDoneStep from "./addpurchase/ImportDoneStep";
import ValidationErrorsDialog from "./addpurchase/ValidationErrorsDialog";

export default function AddPurchaseDialog({
  open,
  onOpenChange,
  step,
  STEPS,
  formData,
  updateFormData,
  suppliers,
  validationErrors,
  duplicateErrors,
  brandConflicts,
  setBrandConflicts,
  validatedRows,
  importResult,
  onValidateCSV,
  onUploadPurchaseFile,
  onResolveConflicts,
  onImport,
  onClose,
}) {
  const allErrors = [
    ...validationErrors,
    ...duplicateErrors.map(d => ({
      rowIndex: d.rowIndex,
      type: d.type,
      message: `Row ${d.rowIndex}: ${d.type} "${d.value}" already exists in inventory (GRN: ${d.existingGRN}).`
    }))
  ];
  const hasErrors = allErrors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground p-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-card-foreground">
            {step === STEPS.FORM && "Add a Purchase"}
            {step === STEPS.VALIDATING && "Validating CSV..."}
            {step === STEPS.BRAND_CONFLICTS && "Resolve Brand Conflicts"}
            {step === STEPS.PREVIEW && "Import Preview"}
            {step === STEPS.IMPORTING && "Importing..."}
            {step === STEPS.DONE && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* Validation errors shown inline */}
        {hasErrors && step === STEPS.FORM && (
          <ValidationErrorsDialog open={true} errors={allErrors} />
        )}

        {step === STEPS.FORM && (
          <AddPurchaseFormStep
            formData={formData}
            updateFormData={updateFormData}
            suppliers={suppliers}
            onValidateCSV={onValidateCSV}
            onUploadPurchaseFile={onUploadPurchaseFile}
            onClose={onClose}
          />
        )}

        {step === STEPS.VALIDATING && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Validating purchase file...</p>
          </div>
        )}

        {step === STEPS.BRAND_CONFLICTS && (
          <BrandConflictStep
            brandConflicts={brandConflicts}
            setBrandConflicts={setBrandConflicts}
            onResolve={onResolveConflicts}
            onClose={onClose}
          />
        )}

        {step === STEPS.PREVIEW && (
          <PreviewStep
            validatedRows={validatedRows}
            duplicateErrors={duplicateErrors}
            onImport={onImport}
            onClose={onClose}
          />
        )}

        {step === STEPS.IMPORTING && <ImportingStep />}

        {step === STEPS.DONE && (
          <ImportDoneStep result={importResult} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
