import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import {
  parsePurchaseCSV,
  validatePurchaseFileRows
} from "@/features/goodsreceipt/lib/utils/purchaseFileUtils";

export default function PurchaseFileImportTab({
  productMasters,
  variants,
  declaredItemsList,
  onImportReady,
}) {
  const [file, setFile] = useState(null);
  const [parseErrors, setParseErrors] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validatedRows, setValidatedRows] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  const handleFileSelect = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setValidatedRows([]);
      setValidationErrors([]);
      setParseErrors(null);
      setIsValidating(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target.result;
        const { rows, error } = parsePurchaseCSV(csvText);

        if (error) {
          setParseErrors(error);
          setIsValidating(false);
          return;
        }

        const { validatedRows: vRows, errors } = validatePurchaseFileRows(
          rows,
          productMasters,
          variants
        );
        setValidatedRows(vRows);
        setValidationErrors(errors);
        setIsValidating(false);
      };
      reader.readAsText(selectedFile);
    },
    [productMasters, variants]
  );

  const handleImport = useCallback(() => {
    if (validatedRows.length === 0) return;
    onImportReady(validatedRows);
  }, [validatedRows, onImportReady]);

  // Group validated rows by product for summary
  const productSummary = useMemo(() => {
    const map = {};
    for (const row of validatedRows) {
      const key = `${row.product_name} - ${row.variant_name}`;
      if (!map[key]) map[key] = { name: key, condition: row.condition, count: 0, totalCost: 0 };
      map[key].count += 1;
      map[key].totalCost += row.cost_price || 0;
    }
    return Object.values(map);
  }, [validatedRows]);

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Upload Area */}
      <div className="shrink-0">
        <label
          htmlFor="purchase-file-input"
          className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-accent/40 transition-colors"
        >
          {file ? (
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">Click to replace</p>
              </div>
              {isValidating && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {!isValidating && validatedRows.length > 0 && (
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
              )}
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Upload Purchase CSV File
              </p>
              <p className="text-[10px] text-muted-foreground">
                Columns: Model, Barcode, Serial Number, IMEI 1, IMEI 2, IMEI 3, etc.
              </p>
            </>
          )}
        </label>
        <input
          id="purchase-file-input"
          type="file"
          accept=".csv,.tsv,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Parse Error */}
      {parseErrors && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-[hsl(var(--destructive))] flex items-start gap-2 shrink-0">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{parseErrors}</span>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 shrink-0 max-h-32 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
            <span className="text-xs font-bold text-[hsl(var(--warning))]">
              {validationErrors.length} row(s) failed validation (skipped)
            </span>
          </div>
          <div className="space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-[10px] text-[hsl(var(--warning))] font-mono">
                Row {err.row}: {err.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards + Add to Scan Table */}
      {validatedRows.length > 0 && (
        <div className="flex gap-3 shrink-0 items-center">
          <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
            <span className="text-xs font-bold text-[hsl(var(--success))]">{validatedRows.length} items validated</span>
          </div>
          <div className="bg-muted border border-border rounded-lg px-4 py-2">
            <span className="text-xs text-muted-foreground">{productSummary.length} product(s)</span>
          </div>
          <div className="bg-muted border border-border rounded-lg px-4 py-2">
            <span className="text-xs font-mono text-muted-foreground">
              ₱{validatedRows.reduce((s, r) => s + (r.cost_price || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleImport}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 gap-1.5 ml-auto"
          >
            <FileUp className="w-3 h-3" /> Add to Encoded Items
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!file && !parseErrors && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
          <FileSpreadsheet size={48} className="opacity-20" />
          <p className="text-sm font-semibold text-foreground">Upload a CSV file to begin</p>
        </div>
      )}
    </div>
  );
}
