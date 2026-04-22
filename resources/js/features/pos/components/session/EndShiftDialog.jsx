import React, { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "@/shared/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, FileText, X } from "lucide-react";

export default function EndShiftDialog({
  open,
  onOpenChange,
  activeSession,
  sessionTransactions = [],
  onClosed,
}) {
  const [closingBalance, setClosingBalance] = useState("");
  const [cashierRemarks, setCashierRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setClosingBalance("");
      setCashierRemarks("");
    }
  }, [open]);

  const totalSales = sessionTransactions.reduce((sum, transaction) => sum + (transaction.total_amount || 0), 0);

  const handleCloseShift = async () => {
    const parsedClosingBalance = parseFloat(closingBalance);

    if (!activeSession?.id) {
      toast({ variant: "destructive", description: "No active session found." });
      return;
    }

    if (Number.isNaN(parsedClosingBalance) || parsedClosingBalance < 0) {
      toast({ variant: "destructive", description: "Please enter a valid closing balance." });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await axios.patch(route("pos.session.close", activeSession.id), {
        closing_balance: parsedClosingBalance,
        cashier_remarks: cashierRemarks,
      });

      toast({ description: "Shift closed successfully." });
      onClosed?.(data.session);
      onOpenChange(false);
    } catch (error) {
      toast({ variant: "destructive", description: error.response?.data?.message || "Failed to close shift." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 dark:border-slate-800 p-0 gap-0 overflow-hidden">
        <div className="bg-[#002060] dark:bg-slate-950 text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">End Shift</h2>
            <p className="text-sm text-blue-100 dark:text-slate-300">
              Review your session totals and close the POS shift.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Session</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{activeSession?.session_number || "N/A"}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Started {activeSession?.shift_start_time ? format(new Date(activeSession.shift_start_time), "MMM dd, yyyy h:mm a") : "N/A"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Transactions</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{sessionTransactions.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Total Sales</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                P{totalSales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <Label htmlFor="closing-balance" className="text-slate-700 dark:text-slate-200">
                Closing Balance
              </Label>
            </div>
            <Input
              id="closing-balance"
              type="number"
              step="0.01"
              min="0"
              value={closingBalance}
              onChange={(event) => setClosingBalance(event.target.value)}
              placeholder="0.00"
              className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <Label htmlFor="cashier-remarks" className="text-slate-700 dark:text-slate-200">
                Cashier Remarks
              </Label>
            </div>
            <Textarea
              id="cashier-remarks"
              rows={4}
              value={cashierRemarks}
              onChange={(event) => setCashierRemarks(event.target.value)}
              placeholder="Add any end-of-shift notes..."
              className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCloseShift}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? "Closing..." : "Close Shift"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
