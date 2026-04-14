import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function DRNotesSection({ formData, setFormData }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-lg font-semibold text-card-foreground">Additional Notes</h3>

      <div className="space-y-2">
        <Label className="text-foreground">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Any additional notes or observations..."
          rows={3}
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}
