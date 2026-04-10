import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Printer, FileText, User, Store } from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

export default function SalesTableRow({
  transaction,
  customerName,
  salesRepName,
  warehouseName,
  onView,
  onPrint,
}) {
  return (
    <tr
      className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
    >
      {/* OR Number */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {transaction.or_number || "N/A"}
          </span>
        </div>
      </td>

      {/* DR */}
      <td className="px-3 py-2.5">
        <span className="font-mono text-gray-700 dark:text-gray-300">
          {transaction.transaction_number || "N/A"}
        </span>
      </td>

      {/* Date/Time */}
      <td className="px-3 py-2.5">
        <div className="text-gray-900 dark:text-gray-100">
          {transaction.transaction_date
            ? format(new Date(transaction.transaction_date), "MMM dd, yyyy")
            : "N/A"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {transaction.transaction_date
            ? format(new Date(transaction.transaction_date), "h:mm a")
            : ""}
        </div>
      </td>

      {/* Branch */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">{warehouseName}</span>
        </div>
      </td>

      {/* Customer */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">{customerName}</span>
        </div>
      </td>

      {/* Staff */}
      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
        {salesRepName}
      </td>

      {/* Payment */}
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          {(transaction.payments_json?.payments || []).slice(0, 2).map((payment, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(payment.amount || 0)}
              </span>
              <Badge
                variant="outline"
                className="w-fit border-slate-300 bg-slate-50 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {payment.payment_method}
              </Badge>
            </div>
          ))}
          {(transaction.payments_json?.payments || []).length > 2 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              +{(transaction.payments_json?.payments || []).length - 2} more
            </span>
          )}
        </div>
      </td>

      {/* Amount */}
      <td className="px-3 py-2.5 text-right">
        <span
          className={`font-semibold ${
            transaction.total_amount < 0
              ? "text-red-600 dark:text-red-400"
              : "text-blue-600 dark:text-blue-400"
          }`}
        >
          {formatCurrency(transaction.total_amount || 0)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(transaction)}
            className="h-8 w-8 border-slate-300 bg-white p-0 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="View Details"
            aria-label="View Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPrint(transaction)}
            className="h-8 w-8 border-slate-300 bg-white p-0 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Print Receipt"
            aria-label="Print Receipt"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
