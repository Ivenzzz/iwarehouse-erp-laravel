import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Receipt, Calendar, User, CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function POSSessionTransactionsView({
  onClose,
  transactions = [],
  onPrintTransaction,
}) {
  const totalSales = transactions.reduce((sum, transaction) => sum + (transaction.total_amount || 0), 0);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="bg-[#002060] dark:bg-blue-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to POS
          </Button>
          <div className="text-white">
            <h1 className="text-xl font-bold">Session Transactions</h1>
            <p className="text-sm text-blue-200">View and print receipts for current session</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-white">
          <div className="text-right">
            <p className="text-sm text-blue-200">Total Transactions</p>
            <p className="text-xl font-bold">{transactions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200">Total Sales</p>
            <p className="text-xl font-bold">P{totalSales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Receipt className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="text-sm">Complete a sale to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          OR# {transaction.or_number || "N/A"}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {transaction.transaction_number}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Date/Time</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {transaction.transaction_date
                                ? format(new Date(transaction.transaction_date), "MMM dd, h:mm a")
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {transaction.customer_name || "Walk-in Customer"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Items</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(transaction.items || []).length} item(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Payment</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(transaction.payments || []).map((payment) => payment.payment_method).join(", ") || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {(transaction.items || []).slice(0, 3).map((item, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300"
                            >
                              {[item.product_name, item.variant_name].filter(Boolean).join(" ")}
                            </span>
                          ))}
                          {(transaction.items || []).length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{(transaction.items || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        P{(transaction.total_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          onClick={() => onPrintTransaction?.(transaction)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Print Receipt
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-200 dark:bg-gray-800 px-4 py-2 border-t border-gray-300 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Press ESC or click "Back to POS" to return
        </p>
      </div>
    </div>
  );
}
