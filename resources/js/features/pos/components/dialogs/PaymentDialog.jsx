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

export default function PaymentDialog({
  open,
  onOpenChange,
  cart,
  payments,
  rawSubtotal,
  totalItemLevelDiscounts,
  taxRate,
  taxAmount,
  grandTotal,
  totalPaid,
  changeAmount,
  balanceDue,
  processingTransaction,
  onProcessTransaction,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-slate-100">Process Payment</DialogTitle>
          <DialogDescription className="dark:text-slate-400">Review and complete the transaction.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-100 dark:bg-slate-900 p-4 rounded-md space-y-2 dark:border dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Total Items:</span>
              <span className="font-semibold dark:text-slate-200">{cart.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Subtotal:</span>
              <span className="font-semibold dark:text-slate-200">
                ₱{rawSubtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {totalItemLevelDiscounts > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Discount:</span>
                <span className="font-semibold text-red-600">
                  -₱{totalItemLevelDiscounts.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Tax ({taxRate}%):</span>
                <span className="font-semibold dark:text-slate-200">
                  ₱{taxAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t dark:border-slate-700 pt-2 dark:text-slate-100">
              <span>Grand Total:</span>
              <span>₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-700 dark:text-cyan-400">
              <span>Amount Paid:</span>
              <span>₱{totalPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            {changeAmount > 0 && (
              <div className="flex justify-between text-lg font-bold text-emerald-600 dark:text-emerald-400">
                <span>Change:</span>
                <span>₱{changeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          {payments.length > 0 && (
            <div className="border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
              <h4 className="px-3 py-2 text-left text-sm font-semibold bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 dark:text-slate-200">Payments Made</h4>
              <table className="w-full">
                <tbody>
                  {payments.map((payment, idx) => (
                    <tr key={idx} className="border-b dark:border-slate-700">
                      <td className="px-3 py-2 text-sm dark:text-slate-300">{payment.payment_method}</td>
                      <td className="px-3 py-2 text-sm text-right dark:text-slate-200">
                        ₱{payment.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button
              onClick={onProcessTransaction}
              disabled={processingTransaction || balanceDue > 0.01}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {processingTransaction ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                "Complete Transaction"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}