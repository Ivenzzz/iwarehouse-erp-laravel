import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ShoppingCart, Tag } from "lucide-react";

export default function OrderSummary({
  // Payment state
  payments,
  currentPayment,
  setCurrentPayment,
  paymentTypes,
  onAddPayment,
  onRemovePayment,
  lockedPriceType,
  // Totals
  rawSubtotal,
  totalItemLevelDiscounts,
  taxRate,
  taxAmount,
  grandTotal,
  totalPaid,
  changeAmount,
  balanceDue,
  // Cart & checkout
  cart,
  selectedCustomer,
  selectedWarehouse,
  onCheckout,
}) {
  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Payment Type & Amount */}
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
        <Label className="text-sm font-semibold block">Add Payment</Label>

        {lockedPriceType && (
          <div className="mb-2 p-2 bg-amber-50 rounded border border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Tag className="w-4 h-4" />
              <span>
                Price Type Locked: <strong>{lockedPriceType === "cash" ? "Cash Pricing" : "SRP Pricing"}</strong>
                <br />
                <span className="text-xs">(Set by first payment method)</span>
              </span>
            </div>
          </div>
        )}

        {currentPayment.payment_type_id && (
          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Tag className="w-4 h-4" />
              <span>
                Pricing Mode:{" "}
                <strong>
                  {paymentTypes.find((pt) => pt.id === currentPayment.payment_type_id)?.name?.toLowerCase() === "cash"
                    ? "Cash Pricing"
                    : "SRP Pricing"}
                </strong>
              </span>
            </div>
          </div>
        )}

        <div>
          <Label className="text-sm mb-1 block">Payment Type</Label>
          <Select
            value={currentPayment.payment_type_id}
            onValueChange={(v) => setCurrentPayment({ ...currentPayment, payment_type_id: v })}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {paymentTypes.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  {pt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm mb-1 block">Amount</Label>
          <Input
            type="number"
            value={currentPayment.amount}
            onChange={(e) => setCurrentPayment({ ...currentPayment, amount: e.target.value })}
            placeholder="0"
            className="bg-white"
          />
        </div>

        <Button onClick={onAddPayment} className="w-full bg-green-600 hover:bg-green-700 mt-2">
          Add Payment
        </Button>
      </div>

      {/* Payments Table */}
      {payments.length > 0 && (
        <div className="border rounded-lg bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold">Type</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Amount</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-3 py-2 text-sm">{payment.payment_method}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    ₱{payment.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button onClick={() => onRemovePayment(idx)} variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="bg-white border rounded-lg p-4 space-y-2 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-semibold">₱{rawSubtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
        {totalItemLevelDiscounts > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount:</span>
            <span className="font-semibold text-red-600">
              -₱{totalItemLevelDiscounts.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {taxRate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax ({taxRate}%):</span>
            <span className="font-semibold">₱{taxAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>TOTAL:</span>
          <span>₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-gray-700">
          <span>Amount Paid:</span>
          <span>₱{totalPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
        {changeAmount > 0 && (
          <div className="flex justify-between text-lg font-bold text-green-600">
            <span>Change:</span>
            <span>₱{changeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {balanceDue > 0 && (
          <div className="flex justify-between text-lg font-bold text-red-600">
            <span>Balance Due:</span>
            <span>₱{balanceDue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* Checkout Button */}
      <Button
        onClick={onCheckout}
        className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-lg shadow-md"
        disabled={cart.length === 0 || !selectedCustomer || balanceDue > 0.01 || !selectedWarehouse}
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        Finalize Payment
        {!selectedWarehouse && (
          <span className="text-xs block mt-1 font-normal">(Waiting for warehouse selection)</span>
        )}
      </Button>
    </div>
  );
}