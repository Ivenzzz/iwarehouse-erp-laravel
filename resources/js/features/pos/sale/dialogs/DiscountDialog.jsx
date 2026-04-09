import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent } from "lucide-react";
import { toast } from "@/shared/hooks/use-toast";

export default function DiscountDialog({
  open,
  onOpenChange,
  onApplyDiscount,
  currentDiscount = 0,
}) {
  const [discountAmount, setDiscountAmount] = useState(String(currentDiscount || 0));

  useEffect(() => {
    if (open) {
      setDiscountAmount(String(currentDiscount || 0));
    }
  }, [open, currentDiscount]);

  const handleApply = () => {
    const amount = parseFloat(discountAmount) || 0;
    onApplyDiscount({ amount });
    toast({ description: "Discount applied successfully." });
    onOpenChange(false);
  };

  const handleClear = () => {
    setDiscountAmount("0");
    onApplyDiscount({ amount: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 dark:border-slate-800 shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-slate-100 font-bold">
            <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Add Discount
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="discount-amount" className="text-gray-700 dark:text-slate-300">Discount Amount (P)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-semibold">P</span>
              <Input
                id="discount-amount"
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="pl-8 text-lg font-semibold bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500 placeholder:text-gray-400 dark:placeholder:text-slate-600"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-gray-100 dark:border-slate-800 pt-4">
          <Button
            variant="outline"
            onClick={handleClear}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
          >
            Clear
          </Button>
          <Button
            onClick={handleApply}
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white shadow-sm dark:shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all"
          >
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
