import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, Package } from "lucide-react";

export default function DRDeliveryDetailsSection({ formData, setFormData }) {
  const declared = parseInt(formData.box_count_declared);
  const received = parseInt(formData.box_count_received);
  const hasBoxVariance =
    !isNaN(declared) && !isNaN(received) && declared !== received;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
        <Package className="h-5 w-5 text-info" />
        Shipment Handling Units
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded border border-border bg-background p-2">
          <Label className="text-xs text-muted-foreground">
            Box Count (Declared on DR)
          </Label>
          <Input
            type="number"
            value={formData.box_count_declared}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                box_count_declared: e.target.value,
              }))
            }
            placeholder="0"
            className="mt-1 rounded-none border-0 border-b border-border bg-transparent px-0 text-foreground focus-visible:ring-0 focus-visible:border-b-ring"
          />
        </div>

        <div
          className={`rounded border p-2 ${
            hasBoxVariance
              ? "border-primary/30 bg-primary/10"
              : "border-border bg-background"
          }`}
        >
          <Label className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Box Count (Visually Received)</span>
            {hasBoxVariance && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                <AlertCircle className="h-3 w-3" />
                Mismatch
              </span>
            )}
          </Label>
          <Input
            type="number"
            value={formData.box_count_received}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                box_count_received: e.target.value,
              }))
            }
            placeholder="0"
            className="mt-1 rounded-none border-0 border-b border-border bg-transparent px-0 text-foreground focus-visible:ring-0 focus-visible:border-b-ring"
          />
        </div>

        <div className="rounded border border-border bg-background p-2">
          <Label className="text-xs text-muted-foreground">
            Freight Cost (PHP)
          </Label>
          <Input
            type="number"
            value={formData.freight_cost}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                freight_cost: e.target.value,
              }))
            }
            placeholder="0.00"
            className="mt-1 rounded-none border-0 border-b border-border bg-transparent px-0 text-foreground focus-visible:ring-0 focus-visible:border-b-ring"
          />
        </div>
      </div>
    </div>
  );
}
