import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Copy, PackageX } from "lucide-react";

function SkippedSection({ title, icon: Icon, items, borderColor, bgColor, textColor }) {
  if (items.length === 0) return null;
  return (
    <div className={`border ${borderColor} rounded-lg flex-1 min-w-0`}>
      <div className={`${bgColor} px-3 py-2 border-b ${borderColor} flex items-center gap-2`}>
        <Icon className={`w-3.5 h-3.5 ${textColor}`} />
        <p className={`text-sm font-medium ${textColor}`}>
          {title} ({items.length})
        </p>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((item, index) => (
            <div key={`${item.row}-${index}`} className="px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <span className="text-xs text-slate-400 shrink-0">Row {item.row}</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{item.reason}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function ImportValidationPreview({ validationResult }) {
  const { validRows = [], skippedItems = [], variantsCreated = 0, totalRows = 0 } = validationResult;

  const allValid = skippedItems.length === 0;

  const { duplicateItems, missingMasterItems, otherItems } = useMemo(() => {
    const duplicates = [];
    const missing = [];
    const others = [];
    for (const item of skippedItems) {
      const r = (item.reason || "").toLowerCase();
      if (r.includes("duplicate")) duplicates.push(item);
      else if (r.includes("no product master") || r.includes("no warehouse")) missing.push(item);
      else others.push(item);
    }
    return { duplicateItems: duplicates, missingMasterItems: missing, otherItems: others };
  }, [skippedItems]);

  return (
    <div className="space-y-4">
...
      {/* Skipped rows — split by category */}
      {skippedItems.length > 0 && (
        <div className="flex gap-3">
          <SkippedSection
            title="Duplicate IMEIs / Serials"
            icon={Copy}
            items={duplicateItems}
            borderColor="border-orange-200 dark:border-orange-800"
            bgColor="bg-orange-50 dark:bg-orange-900/30"
            textColor="text-orange-700 dark:text-orange-400"
          />
          <SkippedSection
            title="Missing Product Masters"
            icon={PackageX}
            items={missingMasterItems}
            borderColor="border-red-200 dark:border-red-800"
            bgColor="bg-red-50 dark:bg-red-900/30"
            textColor="text-red-700 dark:text-red-400"
          />
        </div>
      )}

      {/* Other skipped rows (variant mismatches, etc.) */}
      {otherItems.length > 0 && (
        <SkippedSection
          title="Other Issues"
          icon={AlertTriangle}
          items={otherItems}
          borderColor="border-yellow-200 dark:border-yellow-800"
          bgColor="bg-yellow-50 dark:bg-yellow-900/30"
          textColor="text-yellow-700 dark:text-yellow-400"
        />
      )}

      {/* Valid rows */}
      {validRows.length > 0 && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg">
          <div className="bg-green-50 dark:bg-green-900/30 px-3 py-2 border-b border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Valid Rows ({validRows.length})
            </p>
          </div>
          <ScrollArea className="h-[180px]">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {validRows.map((item, index) => (
                <div
                  key={`${item.row}-${index}`}
                  className="px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{item.label}</p>
                    <p className="text-xs text-slate-500 truncate">{item.warehouse}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">Row {item.row}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}