import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

export default function BrandConflictStep({ brandConflicts, setBrandConflicts, onResolve, onClose }) {
  const handleBrandSelect = (conflictIndex, brandId) => {
    setBrandConflicts((prev) =>
      prev.map((c, i) => (i === conflictIndex ? { ...c, selectedBrandId: brandId } : c))
    );
  };

  const allResolved = brandConflicts.every((c) => c.selectedBrandId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[hsl(var(--warning))] bg-warning/10 border border-warning/20 rounded-lg p-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">
          The following rows have models that exist under multiple brands. Please select the correct brand for each.
        </p>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {brandConflicts.map((conflict, index) => (
          <div
            key={index}
            className="border border-border rounded-lg p-4 bg-muted/40 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Row {conflict.rowIndex + 1}: <span className="text-primary">{conflict.modelName}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  IMEI: {conflict.row["IMEI 1"] || "N/A"} | Serial: {conflict.row["Serial Number"] || "N/A"}
                </p>
              </div>
            </div>

            <Select
              value={conflict.selectedBrandId || ""}
              onValueChange={(val) => handleBrandSelect(index, val)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select brand..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {conflict.brands.map((b) => (
                  <SelectItem key={b.brandId} value={b.brandId}>
                    {b.brandName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose} className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
          Cancel
        </Button>
        <Button
          disabled={!allResolved}
          onClick={onResolve}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
