import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Upload,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  validateInventoryImportCSV,
  validateInventoryCSV,
  importValidatedInventoryRows,
} from "@/components/inventory/services/inventoryImportService";
import ImportValidationPreview from "./ImportValidationPreview";
import ImportResultSummary from "./ImportResultSummary";

// steps: upload → validating → preview → importing → done
export function ImportInventoryItemsDialog({ open, onOpenChange, onSuccess }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [parseError, setParseError] = useState("");
  const [rowCount, setRowCount] = useState(0);

  // Validation results
  const [validationResult, setValidationResult] = useState(null);

  // Import results
  const [importResult, setImportResult] = useState(null);

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setCsvText("");
    setParseError("");
    setRowCount(0);
    setValidationResult(null);
    setImportResult(null);
  };

  const handleClose = (nextOpen) => {
    if (!nextOpen) {
      if (step === "validating" || step === "importing") return;
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const text = String(loadEvent.target?.result || "");
        const validation = validateInventoryImportCSV(text);
        setFile(selectedFile);
        setCsvText(text);
        setRowCount(validation.rowCount);
        setParseError("");
        setValidationResult(null);
        setImportResult(null);
      } catch (error) {
        setFile(null);
        setCsvText("");
        setRowCount(0);
        setValidationResult(null);
        setImportResult(null);
        setParseError(error.message || "Unable to read CSV file.");
      }
    };
    reader.readAsText(selectedFile);
  };

  // Phase 1: Validate
  const handleValidate = async () => {
    if (!csvText) return;
    setStep("validating");

    try {
      const result = await validateInventoryCSV({ csvText });
      setValidationResult(result);
      setStep("preview");
    } catch (error) {
      setParseError(error.message || "Validation failed");
      setStep("upload");
      toast.error(error.message || "Validation failed");
    }
  };

  // Phase 2: Import valid rows
  const handleImport = async () => {
    if (!validationResult?.validRows?.length) return;

    setStep("importing");
    const rowIndices = validationResult.validRows.map((r) => r.rowIndex);

    try {
      const result = await importValidatedInventoryRows({ csvText, rowIndices });
      setImportResult(result);
      setStep("done");

      if (result.created > 0) {
        toast.success(`Imported ${result.created} inventory item(s).`);
        onSuccess?.();
      } else {
        toast.error("No inventory items were imported.");
      }
    } catch (error) {
      setImportResult({
        created: 0,
        failed: 1,
        skippedItems: [],
        createdItems: [],
        error: error.message || "Import failed",
      });
      setStep("done");
      toast.error(error.message || "Import failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Inventory Items</DialogTitle>
          <DialogDescription>
            Upload the exported products CSV to create inventory items from existing product masters,
            variants, and warehouses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Upload Step ── */}
          {step === "upload" && (
            <>
              <div
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click to select the inventory products CSV
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Required columns: Brand, Model, Warehouse, Condition
                </p>
                {file && !parseError && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {file.name} ({rowCount} rows)
                    </span>
                  </div>
                )}
              </div>

              {parseError && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* ── Validating Step ── */}
          {step === "validating" && (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium">Validating {rowCount} row(s)...</p>
                  <p className="text-xs text-slate-500">
                    Checking product masters, variants, warehouses, and duplicates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Preview Step ── */}
          {step === "preview" && validationResult && (
            <ImportValidationPreview
              validationResult={validationResult}
            />
          )}

          {/* ── Importing Step ── */}
          {step === "importing" && (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium">
                    Importing {validationResult?.validRows?.length || 0} item(s)...
                  </p>
                  <p className="text-xs text-slate-500">
                    Creating inventory items on the server.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Done Step ── */}
          {step === "done" && importResult && (
            <ImportResultSummary importResult={importResult} />
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleValidate} disabled={!csvText || !!parseError}>
                <ShieldCheck className="w-4 h-4 mr-1" />
                Validate CSV
              </Button>
            </>
          )}

          {step === "validating" && (
            <Button variant="outline" disabled>
              Validating...
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!validationResult?.validRows?.length}
              >
                Import {validationResult?.validRows?.length || 0} Valid Item(s)
              </Button>
            </>
          )}

          {step === "importing" && (
            <Button variant="outline" disabled>
              Importing...
            </Button>
          )}

          {step === "done" && (
            <>
              <Button variant="outline" onClick={resetState}>
                Import More
              </Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}