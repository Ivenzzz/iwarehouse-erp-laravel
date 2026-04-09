import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, AlertCircle } from "lucide-react";

export default function CustomerDialog({
  open,
  onOpenChange,
  newCustomer,
  setNewCustomer,
  currentCustomerId = null,
  dialogTitle = "Add New Customer",
  submitLabel = "Create Customer",
  onCreateCustomer,
  customers = [],
}) {
  const normalizedPhone = (newCustomer.phone || "").trim();
  const isDuplicate = customers.some((customer) => customer.id !== currentCustomerId && customer.phone === normalizedPhone);

  const updateAddress = (key, value) => {
    setNewCustomer((previous) => ({
      ...previous,
      address_json: {
        ...(previous.address_json || {}),
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 dark:border-slate-800 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-slate-100 text-xl font-bold">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-4 md:col-span-2 border-b border-gray-100 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-cyan-400 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Basic Information
            </h3>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">First Name</Label>
            <Input
              value={newCustomer.first_name || ""}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, first_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Last Name</Label>
            <Input
              value={newCustomer.last_name || ""}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, last_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Phone</Label>
            <Input
              value={newCustomer.phone || ""}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
            />
            {isDuplicate && (
              <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                A customer with this phone number already exists.
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Email</Label>
            <Input
              type="email"
              value={newCustomer.email || ""}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="space-y-4 md:col-span-2 border-b border-gray-100 dark:border-slate-800 pb-2 mt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-cyan-400">
              Address
            </h3>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-700 dark:text-slate-300">Street</Label>
            <Input
              value={newCustomer.address_json?.street || ""}
              onChange={(e) => updateAddress("street", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Barangay</Label>
            <Input
              value={newCustomer.address_json?.barangay || ""}
              onChange={(e) => updateAddress("barangay", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">City / Municipality</Label>
            <Input
              value={newCustomer.address_json?.city_municipality || ""}
              onChange={(e) => updateAddress("city_municipality", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Province</Label>
            <Input
              value={newCustomer.address_json?.province || ""}
              onChange={(e) => updateAddress("province", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Postal Code</Label>
            <Input
              value={newCustomer.address_json?.postal_code || ""}
              onChange={(e) => updateAddress("postal_code", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-700 dark:text-slate-300">Country</Label>
            <Input
              value={newCustomer.address_json?.country || "Philippines"}
              onChange={(e) => updateAddress("country", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreateCustomer} disabled={isDuplicate}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
