import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer } from "lucide-react";

export default function ReceiptDialog({
  open,
  onOpenChange,
  completedTransaction,
  onPrintReceipt,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-950 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-center text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            Transaction Complete!
          </DialogTitle>
          <DialogDescription className="text-center dark:text-slate-400">
            Your transaction has been successfully processed.
          </DialogDescription>
        </DialogHeader>

        {completedTransaction && (
          <div className="p-4 space-y-2 text-sm text-center border-t border-b dark:border-slate-700 py-4 my-2 dark:text-slate-300">
            <p>
              <strong>Transaction Number:</strong>{" "}
              <span className="font-semibold text-base">{completedTransaction.transaction_number}</span>
            </p>
            <p>
              <strong>Official Receipt No.:</strong>{" "}
              <span className="font-semibold text-base">{completedTransaction.or_number}</span>
            </p>
            <p>
              <strong>Total Amount:</strong>{" "}
              <span className="font-semibold text-lg">
                ₱{completedTransaction.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </p>
            <p>
              <strong>Amount Paid:</strong> ₱
              {completedTransaction.amount_paid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
            {completedTransaction.change_amount > 0 && (
              <p className="text-green-600">
                <strong>Change:</strong> ₱
                {completedTransaction.change_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </p>
            )}
            <p>
              <strong>Customer:</strong> {completedTransaction.customer_name || "N/A"}
            </p>

            {/* Display Program/Installment info from payments */}
            {completedTransaction.payments_json?.payments?.some(p => p.payment_details?.program_name) && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Installment Details:</p>
                {completedTransaction.payments_json.payments
                  .filter(p => p.payment_details?.program_name)
                  .map((p, idx) => (
                    <div key={idx} className="text-xs text-left bg-blue-50 dark:bg-blue-900/20 p-2 rounded mt-1">
                      <p><strong>Program:</strong> {p.payment_details.program_name}</p>
                      {p.payment_details.loan_term_months && (
                        <p><strong>Term:</strong> {p.payment_details.loan_term_months} Months</p>
                      )}
                      <p><strong>Amount:</strong> ₱{p.amount?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        <DialogFooter className="flex justify-center gap-2 pt-4">
          <Button onClick={onPrintReceipt} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
