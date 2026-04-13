import React from "react";
import { Link } from "@inertiajs/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { Combobox } from "@/components/ui/combobox";
import { getRFQItemDisplay } from "../../lib/rfqItemUtils";
import { calculateQuoteItemTotal } from "../../lib/rfqService";

export default function AddQuoteDialog({
  open,
  onOpenChange,
  selectedRFQ,
  quoteForm,
  setQuoteForm,
  supplierOptions,
  hasSuppliers,
  onSubmit,
  isSubmitting,
}) {
  const updateQuoteItemPrice = (index, field, value) => {
    setQuoteForm((prev) => {
      const newItems = [...prev.items];
      const parsed = parseFloat(value);
      const numeric = Number.isNaN(parsed) ? 0 : parsed;
      const nextValue = field === "discount" ? Math.min(100, Math.max(0, numeric)) : numeric;
      newItems[index] = { ...newItems[index], [field]: nextValue };

      const unitPrice = field === "unit_price" ? nextValue : (newItems[index].unit_price || 0);
      const qty = newItems[index].quantity || 0;
      const discount = field === "discount" ? nextValue : (newItems[index].discount || 0);
      newItems[index].total_price = calculateQuoteItemTotal(qty, unitPrice, discount);

      return { ...prev, items: newItems };
    });
  };

  const calculateQuoteTotals = () => {
    const subtotal = quoteForm.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const shipping = Number(quoteForm.shipping_cost) || 0;
    const taxAmount = Number(quoteForm.tax_amount) || 0;
    const totalAmount = subtotal + shipping + taxAmount;
    return { subtotal, shipping, taxAmount, totalAmount };
  };

  const totals = calculateQuoteTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Supplier Quote - {selectedRFQ?.rfq_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Supplier*</Label>
              <Combobox
                options={supplierOptions}
                value={quoteForm.supplier_id}
                onValueChange={(value) => setQuoteForm({ ...quoteForm, supplier_id: value })}
                placeholder="Select supplier..."
                searchPlaceholder="Search suppliers..."
                emptyText="No suppliers found."
                disabled={!hasSuppliers}
              />
              {!hasSuppliers && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  No suppliers are configured yet. Add supplier records first in{" "}
                  <Link href={route("suppliers.index")} className="font-semibold underline">
                    Suppliers
                  </Link>
                  .
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Quote Date*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-3 w-3" />
                    {quoteForm.quote_date ? format(new Date(quoteForm.quote_date), "MMM dd, yyyy") : format(new Date(), "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={quoteForm.quote_date ? new Date(quoteForm.quote_date) : new Date()}
                    onSelect={(date) =>
                      setQuoteForm({
                        ...quoteForm,
                        quote_date: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={quoteForm.payment_terms} onValueChange={(value) => setQuoteForm({ ...quoteForm, payment_terms: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ETA*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-3 w-3" />
                    {quoteForm.eta ? format(quoteForm.eta, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={quoteForm.eta || undefined}
                    onSelect={(date) => setQuoteForm({ ...quoteForm, eta: date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Items Costing — reads denormalized item data directly */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Items Costing</h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                    <th className="w-24 px-3 py-2 text-center font-medium text-muted-foreground">Qty</th>
                    <th className="w-40 px-3 py-2 text-left font-medium text-muted-foreground">Unit Price</th>
                    <th className="w-28 px-3 py-2 text-center font-medium text-muted-foreground">Discount %</th>
                    <th className="w-40 px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quoteForm.items.map((item, idx) => {
                    const { primaryLabel, secondaryLabel } = getRFQItemDisplay(item);
                    return (
                      <tr key={idx} className="bg-card">
                        <td className="px-3 py-2">
                          <p className="text-xs font-medium text-foreground">{primaryLabel}</p>
                          {secondaryLabel && <p className="text-[10px] text-muted-foreground">{secondaryLabel}</p>}
                        </td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            className="h-8 text-right"
                            value={item.unit_price}
                            onChange={(e) => updateQuoteItemPrice(idx, "unit_price", e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              className="h-8 pr-7 text-right"
                              value={item.discount ?? 0}
                              onChange={(e) => updateQuoteItemPrice(idx, "discount", e.target.value)}
                              placeholder="0"
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Shipping Cost</Label>
                <Input
                  type="number"
                  value={quoteForm.shipping_cost}
                  onChange={(e) => setQuoteForm({ ...quoteForm, shipping_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Amount</Label>
                <Input
                  type="number"
                  value={quoteForm.tax_amount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, tax_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2 rounded bg-primary/5 p-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping:</span>
                <span>{totals.shipping.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-primary/20 pt-2">
                <span className="text-lg font-bold">Total Quote:</span>
                <span className="text-xl font-bold text-primary">
                  {totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSubmit} disabled={isSubmitting || !hasSuppliers}>
              <Plus className="mr-2 h-4 w-4" />Add Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
