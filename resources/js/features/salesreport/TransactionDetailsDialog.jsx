import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Package, CreditCard, User, Store, Download } from "lucide-react";
import { format } from "date-fns";

const formatPHP = (amount) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount || 0);

export default function TransactionDetailsDialog({
  open,
  onOpenChange,
  transactionId,
  endpoint,
  transaction: initialTransaction = null,
}) {
  const [transaction, setTransaction] = useState(initialTransaction);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTransaction(initialTransaction);
  }, [initialTransaction]);

  useEffect(() => {
    if (!open || !transactionId || !endpoint) {
      return;
    }

    setIsLoading(true);

    axios.get(endpoint).then(({ data }) => {
      setTransaction(data.transaction || null);
    }).finally(() => setIsLoading(false));
  }, [open, transactionId, endpoint]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        {isLoading || !transaction ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading transaction...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardContent className="pt-6"><div className="text-xs text-slate-500">OR Number</div><div className="font-semibold">{transaction.or_number || "-"}</div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-xs text-slate-500">Date</div><div className="font-semibold">{transaction.transaction_date ? format(new Date(transaction.transaction_date), "MMM dd, yyyy h:mm a") : "-"}</div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-xs text-slate-500">Branch</div><div className="font-semibold flex items-center gap-2"><Store className="h-4 w-4" />{transaction.warehouse_name || "-"}</div></CardContent></Card>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center gap-2 font-semibold"><User className="h-4 w-4" />Customer</div>
                <div>{transaction.customer_name || "Walk-in Customer"}</div>
                <div className="text-sm text-slate-500">{transaction.customer_phone || "N/A"}</div>
                <div className="text-sm text-slate-500">{transaction.customer_address || "N/A"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-2 font-semibold"><Package className="h-4 w-4" />Items</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Serial/IMEI</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(transaction.items || []).map((item, index) => (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="px-3 py-2">
                            <div className="font-medium">{[item.product_name, item.variant_name].filter(Boolean).join(" ") || "N/A"}</div>
                            <div className="flex gap-1 mt-1">
                              {item.condition ? <Badge variant="outline">{item.condition}</Badge> : null}
                              {item.warranty_description ? <Badge variant="outline">{item.warranty_description}</Badge> : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{item.imei1 || item.imei2 || item.serial_number || "-"}</td>
                          <td className="px-3 py-2 text-center">{item.quantity || 1}</td>
                          <td className="px-3 py-2 text-right">{formatPHP(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatPHP(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" />Payments</div>
                <div className="space-y-2">
                  {(transaction.payments_json?.payments || []).map((payment, index) => (
                    <div key={index} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{payment.payment_method || "N/A"}</div>
                        <div className="font-semibold">{formatPHP(payment.amount)}</div>
                      </div>
                      {payment.payment_details?.reference_number ? <div className="text-xs text-slate-500 mt-1">Reference: {payment.payment_details.reference_number}</div> : null}
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm">Subtotal: <span className="font-semibold">{formatPHP(transaction.subtotal)}</span></div>
                  <div className="rounded-lg border p-3 text-sm">Discount: <span className="font-semibold">{formatPHP(transaction.discount_amount)}</span></div>
                  <div className="rounded-lg border p-3 text-sm">Amount Paid: <span className="font-semibold">{formatPHP(transaction.amount_paid)}</span></div>
                  <div className="rounded-lg border p-3 text-sm">Change: <span className="font-semibold">{formatPHP(transaction.change_amount)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" />Supporting Documents</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(transaction.supporting_documents || {}).filter(([, url]) => !!url).map(([key, url]) => (
                    <Button key={key} variant="outline" asChild>
                      <a href={url} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-4 w-4" />{key.replace(/_/g, " ")}
                      </a>
                    </Button>
                  ))}
                  {Object.values(transaction.supporting_documents || {}).filter(Boolean).length === 0 ? <div className="text-sm text-slate-500">No documents attached.</div> : null}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
