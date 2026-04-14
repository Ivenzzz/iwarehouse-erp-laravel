import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Edit3 } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getSupplierDisplayName } from "../hooks/useDeliveryReceiptRelations";

const PAYMENT_TERM_OPTIONS = [
  "NET 7",
  "NET 15",
  "NET 30",
  "NET 45",
  "NET 60",
  "NET 90",
];

function DRBasicInfoSection({
  mode = "supplier",
  formData,
  setFormData,
  suppliers,
  selectedPO,
  selectedSupplier,
  onSupplierSelect,
}) {
  const isDuplicate = formData.vendor_dr_number && formData.vendor_dr_number === "12345";
  const selectedPOLabel = selectedPO
    ? `${selectedPO.po_number} - ${getSupplierDisplayName(selectedSupplier)}`
      : formData.po_id
      ? "Loading purchase order..."
      : "No purchase order selected";

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((supplier) => ({
        value: supplier.id,
        label: getSupplierDisplayName(supplier),
        code: supplier.supplier_code || "",
        searchValue: `${getSupplierDisplayName(supplier)} ${supplier.supplier_code || ""}`.trim(),
      })),
    [suppliers]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground lg:col-span-1">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {mode === "po" ? "PO Reference" : "Supplier & Route"}
        </h3>

        <div className="space-y-3">
          {mode === "po" ? (
            <div>
              <Label className="text-xs text-muted-foreground">Purchase Order*</Label>
              <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                {selectedPOLabel}
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">Select Supplier*</Label>
              <Combobox
                options={supplierOptions}
                value={formData.supplier_id}
                onValueChange={onSupplierSelect}
                placeholder="Select supplier..."
                searchPlaceholder="Search supplier..."
                emptyText="No supplier found."
                selectedOption={
                  formData.supplier_id
                    ? supplierOptions.find((option) => option.value === formData.supplier_id)
                    : undefined
                }
                renderOption={(option) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-popover-foreground">{option.label}</span>
                    {option.code && (
                      <span className="text-xs text-muted-foreground">{option.code}</span>
                    )}
                  </div>
                )}
                renderSelectedOption={(option) => (
                  <div className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                  </div>
                )}
                className="border-border bg-background font-normal text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Logistics Route</Label>

            <div className="mt-1 rounded-lg border border-border bg-background p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-2 flex h-full flex-col items-center">
                  <div className="z-10 h-2.5 w-2.5 rounded-full border-2 border-info bg-card"></div>
                  <div className="my-0.5 h-8 w-0.5 bg-border"></div>
                  <div className="z-10 h-2.5 w-2.5 rounded-full bg-primary"></div>
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="group relative">
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">
                      Source (Supplier Origin)
                    </label>

                    <div className="relative min-w-0">
                      <input
                        type="text"
                        value={formData.route_origin || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, route_origin: e.target.value }))}
                        className="w-full min-w-0 border-b border-border bg-transparent pb-1 pr-6 text-sm font-semibold text-foreground transition-colors hover:border-ring focus:border-ring focus:outline-none"
                        placeholder="Enter Origin..."
                      />
                      <Edit3 className="pointer-events-none absolute right-0 top-1 h-3 w-3 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">
                      Destination (Main Warehouse)
                    </label>

                    <div className="flex min-w-0 items-start gap-1 text-sm font-medium leading-tight text-primary">
                      <span className="min-w-0 break-words">{formData.destination || "Main Warehouse"}</span>
                      <span className="flex-shrink-0 rounded border border-border bg-muted px-1 text-[9px] text-muted-foreground">
                        LOCKED
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vendor Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Label className="text-foreground">Vendor DR Number*</Label>
            <Input
              value={formData.vendor_dr_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, vendor_dr_number: e.target.value }))}
              placeholder="Enter supplier's DR number"
              className={cn(
                "border-input bg-background text-foreground placeholder:text-muted-foreground",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isDuplicate && "border-primary/60 focus-visible:ring-primary/30"
              )}
            />
            {isDuplicate && (
              <div className="absolute left-0 top-full mt-1 flex items-center text-xs text-primary">
                <AlertTriangle className="mr-1 h-3 w-3" /> Duplicate DR detected!
              </div>
            )}
          </div>

          <div>
            <Label className="text-foreground">Date and Time Received</Label>
            <Input
              type="datetime-local"
              value={formData.receipt_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, receipt_date: e.target.value }))}
              className="border-input bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Reference No. 1 (Optional)</Label>
            <Input
              value={formData.reference_number_1 || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, reference_number_1: e.target.value }))}
              placeholder="e.g. RNXXXXXXXXXXX"
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Reference No. 2 (Optional)</Label>
            <Input
              value={formData.reference_number_2 || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, reference_number_2: e.target.value }))}
              placeholder="e.g. RNXXXXXXXXXXX"
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {mode !== "po" && (
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Payment Terms (Optional)</Label>
            <Select
              value={formData.payment_terms || ""}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_terms: value }))}
            >
              <SelectTrigger className="border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring">
                <SelectValue placeholder="Select payment terms..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERM_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DRBasicInfoSection);
