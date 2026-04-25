import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

export default function BrandConflictStep({ brandConflicts, setBrandConflicts, onResolve, onClose }) {
  const normalizeModelKey = (value) =>
    (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

  const groupedConflictsMap = brandConflicts.reduce((acc, conflict) => {
    const key = normalizeModelKey(conflict.normalizedModelName || conflict.modelName);
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = {
        key,
        modelName: conflict.modelName,
        members: [],
        brandMap: new Map(),
        allowCreateBrand: true,
      };
    }

    const group = acc[key];
    group.members.push(conflict);

    (conflict.brands || []).forEach((brand) => {
      const brandId = (brand?.brandId || "").toString();
      if (!brandId) return;
      if (!group.brandMap.has(brandId)) {
        group.brandMap.set(brandId, brand);
      }
    });

    group.allowCreateBrand = group.allowCreateBrand && !!conflict.allowCreateBrand;

    return acc;
  }, {});

  const groupedConflicts = Object.values(groupedConflictsMap).map((group) => {
    const firstSelectedMember = group.members.find((m) => {
      return !!m.selectedBrandId;
    });

    return {
      ...group,
      brands: Array.from(group.brandMap.values()),
      selectedBrandId: firstSelectedMember?.selectedBrandId || "",
      rowIndexes: group.members
        .map((m) => (Number.isFinite(m.rowIndex) ? m.rowIndex + 1 : null))
        .filter((v) => v !== null),
    };
  });

  const applyToGroup = (groupKey, updater) => {
    setBrandConflicts((prev) =>
      prev.map((conflict) => {
        const key = normalizeModelKey(conflict.normalizedModelName || conflict.modelName);
        if (key !== groupKey) return conflict;

        return updater(conflict);
      })
    );
  };

  const handleBrandSelect = (groupKey, selectedValue) => {
    applyToGroup(groupKey, (conflict) =>
      ({
        ...conflict,
        selectedBrandMode: "existing",
        selectedBrandId: selectedValue,
        newBrandName: null,
      })
    );
  };

  const allResolved = groupedConflicts.every((group) => !!group.selectedBrandId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[hsl(var(--warning))] bg-warning/10 border border-warning/20 rounded-lg p-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">
          Resolve brand per model. One selection applies to all rows with the same model.
        </p>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {groupedConflicts.map((group) => (
          <div
            key={group.key}
            className="border border-border rounded-lg p-4 bg-muted/40 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">{group.modelName}</span> ({group.members.length} row{group.members.length > 1 ? "s" : ""})
                </p>
                <p className="text-xs text-muted-foreground">
                  Rows: {group.rowIndexes.join(", ") || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Select existing brand for this model.
                </p>
              </div>
            </div>

            <Select
              value={group.selectedBrandId || ""}
              onValueChange={(val) => handleBrandSelect(group.key, val)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select brand..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {group.brands.map((b) => (
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
