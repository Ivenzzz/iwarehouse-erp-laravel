import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25];

export default function CashDenominationDialog({ open, onOpenChange, onConfirm, initialTotal = 0 }) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!open) return;
    setCounts({});
  }, [open, initialTotal]);

  const denominationRows = useMemo(() => {
    return DENOMINATIONS.map((value) => {
      const count = Number(counts[value] || 0);
      return {
        value,
        count,
        subtotal: value * count,
      };
    });
  }, [counts]);

  const total = useMemo(() => {
    return denominationRows.reduce((sum, row) => sum + row.subtotal, 0);
  }, [denominationRows]);

  const handleCountChange = (value, nextValue) => {
    setCounts((prev) => ({
      ...prev,
      [value]: nextValue,
    }));
  };

  const handleConfirm = () => {
    const normalized = denominationRows.reduce((acc, row) => {
      if (row.count > 0) acc[row.value] = row.count;
      return acc;
    }, {});

    onConfirm(total, normalized);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 dark:border-slate-800">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cash Denomination Count</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enter the quantity for each bill and coin.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
            {denominationRows.map((row) => (
              <div key={row.value} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    ₱{row.value}
                  </Label>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    ₱{row.subtotal.toLocaleString("en-PH", { minimumFractionDigits: row.value < 1 ? 2 : 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={counts[row.value] || ""}
                  onChange={(e) => handleCountChange(row.value, e.target.value)}
                  placeholder="0"
                  className="bg-white dark:bg-slate-950"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Counted Cash</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Confirm Count
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}