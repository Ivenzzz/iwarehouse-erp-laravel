import { useRef, useState } from "react";
import { CheckCircle, FileText, Loader2, ShieldCheck, Upload } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import ImportResultSummary from "@/features/inventory/dialogs/ImportResultSummary";
import ImportValidationPreview from "@/features/inventory/dialogs/ImportValidationPreview";
import { importValidatedInventoryRows, validateInventoryCSV } from "@/features/inventory/services/inventoryImportService";

export default function ImportInventoryItemsDialog({ open, onOpenChange, onSuccess }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [parseError, setParseError] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setParseError("");
    setValidationResult(null);
    setImportResult(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleClose = (nextOpen) => {
    if (!nextOpen && (step === "validating" || step === "importing")) {
      return;
    }

    if (!nextOpen) {
      resetState();
    }

    onOpenChange(nextOpen);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError("");
    setValidationResult(null);
    setImportResult(null);
  };

  const handleValidate = async () => {
    if (!file) return;

    setStep("validating");
    setParseError("");

    try {
      const result = await validateInventoryCSV({ file });
      setValidationResult(result);
      setStep("preview");
    } catch (error) {
      setParseError(error.response?.data?.message || error.message || "Validation failed.");
      setStep("upload");
    }
  };

  const handleImport = async () => {
    if (!validationResult?.validRows?.length || !validationResult?.importToken) return;

    setStep("importing");

    try {
      const result = await importValidatedInventoryRows({ importToken: validationResult.importToken });
      setImportResult(result);
      setStep("done");
      if (result.created > 0) {
        onSuccess?.();
      }
    } catch (error) {
      setImportResult({
        created: 0,
        failed: 1,
        skippedItems: [],
        createdItems: [],
        error: error.response?.data?.message || error.message || "Import failed.",
      });
      setStep("done");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Import Inventory Items</DialogTitle>
          <DialogDescription>
            Validate the CSV first, review the result, then import only the rows that passed validation.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {step === "upload" && (
            <>
              <div className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:border-blue-500 dark:border-slate-800" onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                <Upload className="mx-auto mb-4 size-12 text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Click to select the inventory CSV</p>
                <p className="mt-1 text-xs text-slate-500">
                  Required columns: Brand, Model, Warehouse, Condition. Variant columns supported: RAM/ROM (or RAM Capacity/ROM Capacity), Color, CPU, GPU, RAM Type, ROM Type, Operating System (or OS), Screen (or Display).
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Legacy columns (such as Submodel, RAM Slot, Country Model, Resolution, Purchase) are accepted for compatibility and are not stored on inventory items.
                </p>
                {file ? (
                  <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                    <FileText className="size-4" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : null}
              </div>

              {parseError ? (
                <Alert variant="destructive">
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              ) : null}
            </>
          )}

          {step === "validating" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="size-8 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium">Validating inventory CSV...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Checking product masters, variants, warehouses, and duplicate identifiers.</p>
              </div>
            </div>
          )}

          {step === "preview" && validationResult ? <ImportValidationPreview validationResult={validationResult} /> : null}

          {step === "importing" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="size-8 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium">Importing {validationResult?.validRows?.length || 0} item(s)...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Creating inventory items and audit logs on the server.</p>
              </div>
            </div>
          )}

          {step === "done" && importResult ? (
            <>
              {importResult.created > 0 ? (
                <Alert>
                  <CheckCircle className="mt-0.5 size-4 text-emerald-600" />
                  <AlertDescription>Import complete.</AlertDescription>
                </Alert>
              ) : null}
              <ImportResultSummary importResult={importResult} />
            </>
          ) : null}
        </DialogBody>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleValidate} disabled={!file || !!parseError}>
                <ShieldCheck className="mr-1 size-4" />
                Validate CSV
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>Start Over</Button>
              <Button onClick={handleImport} disabled={!validationResult?.validRows?.length}>Import Valid Rows</Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
