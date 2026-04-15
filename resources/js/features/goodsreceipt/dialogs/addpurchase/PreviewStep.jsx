import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";

function fmt(val) {
  const n = parseFloat(val);
  if (!n) return "—";
  return "₱" + n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function getIdentifier(row) {
  const parts = [row["IMEI 1"], row["IMEI 2"], row["Serial Number"]].filter(Boolean);
  return parts.join(" / ") || "—";
}

export default function PreviewStep({ validatedRows, duplicateErrors, onImport, onClose }) {
  const totalCost = validatedRows.reduce((s, r) => s + (parseFloat(r.row["Cost"]) || 0), 0);

  return (
    <div className="space-y-4">
      {duplicateErrors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Duplicate items found in inventory</span>
          </div>
          <div className="max-h-[150px] overflow-y-auto space-y-1">
            {duplicateErrors.map((d, i) => (
              <p key={i} className="text-xs text-[hsl(var(--destructive))]">
                Row {d.rowIndex}: {d.type} &quot;{d.value}&quot; already exists (GRN: {d.existingGRN})
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[hsl(var(--success))]">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{validatedRows.length} items validated successfully</span>
        </div>
        <span className="text-sm text-[hsl(var(--success))] font-medium">
          Total Cost: {fmt(totalCost)}
        </span>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto bg-card">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="text-left p-2 text-muted-foreground font-medium whitespace-nowrap">#</th>
              <th className="text-left p-2 text-muted-foreground font-medium whitespace-nowrap">Product</th>
              <th className="text-left p-2 text-muted-foreground font-medium whitespace-nowrap">IMEI / Serial</th>
              <th className="text-center p-2 text-muted-foreground font-medium whitespace-nowrap">RAM</th>
              <th className="text-center p-2 text-muted-foreground font-medium whitespace-nowrap">ROM</th>
              <th className="text-left p-2 text-muted-foreground font-medium whitespace-nowrap">Color</th>
              <th className="text-left p-2 text-muted-foreground font-medium whitespace-nowrap">Condition</th>
              <th className="text-right p-2 text-muted-foreground font-medium whitespace-nowrap">Cost</th>
              <th className="text-right p-2 text-muted-foreground font-medium whitespace-nowrap">Cash Price</th>
              <th className="text-right p-2 text-muted-foreground font-medium whitespace-nowrap">SRP</th>
              <th className="text-left p-2 text-muted-foreground font-medium whitespace-nowrap">Warranty</th>
              <th className="text-left p-2 text-muted-foreground font-medium whitespace-nowrap">Package</th>
            </tr>
          </thead>
          <tbody>
            {validatedRows.map((vr, i) => {
              const r = vr.row;
              return (
                <tr key={i} className="border-t border-border hover:bg-accent/40">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2 text-foreground whitespace-nowrap">{vr.productMasterName || "Unknown"}</td>
                  <td className="p-2 text-foreground whitespace-nowrap font-mono">{getIdentifier(r)}</td>
                  <td className="p-2 text-center text-slate-300">{r["Ram Capacity"] || "—"}</td>
                  <td className="p-2 text-center text-slate-300">{r["Rom Capacity"] || "—"}</td>
                  <td className="p-2 text-slate-300">{r["Color"] || "—"}</td>
                  <td className="p-2 text-slate-300">{r["Condition"] || "—"}</td>
                  <td className="p-2 text-right text-slate-200">{fmt(r["Cost"])}</td>
                  <td className="p-2 text-right text-slate-200">{fmt(r["Cash Price"])}</td>
                  <td className="p-2 text-right text-slate-200">{fmt(r["SRP"])}</td>
                  <td className="p-2 text-slate-300 whitespace-nowrap">{r["Warranty"] || "—"}</td>
                  <td className="p-2 text-slate-300 whitespace-nowrap">{r["Package"] || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose} className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
          Cancel
        </Button>
        <Button
          disabled={duplicateErrors.length > 0}
          onClick={onImport}
          className="bg-[hsl(var(--success))] hover:opacity-90 text-[hsl(var(--success-foreground))]"
        >
          Import {validatedRows.length} Items
        </Button>
      </div>
    </div>
  );
}