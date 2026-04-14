import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function DRLogisticsSection({ formData, setFormData }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-lg font-semibold text-card-foreground">Logistics Information</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Logistics Company</Label>
          <Input
            value={formData.logistics_company}
            onChange={(e) => setFormData((prev) => ({ ...prev, logistics_company: e.target.value }))}
            placeholder="e.g., LBC, JRS, DHL"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Waybill/Tracking Number</Label>
          <Input
            value={formData.waybill_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, waybill_number: e.target.value }))}
            placeholder="Enter tracking number"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Driver Name</Label>
          <Input
            value={formData.driver_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, driver_name: e.target.value }))}
            placeholder="Enter driver name"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Driver Contact</Label>
          <Input
            value={formData.driver_contact}
            onChange={(e) => setFormData((prev) => ({ ...prev, driver_contact: e.target.value }))}
            placeholder="Enter contact number"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
