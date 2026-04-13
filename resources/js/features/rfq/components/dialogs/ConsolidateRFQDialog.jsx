import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Merge, Box, AlertCircle, ChevronDown } from "lucide-react";
import { getRFQItemDisplay } from "../../lib/rfqItemUtils";

export default function ConsolidateRFQDialog({
  open,
  onOpenChange,
  rfqs,
  onConfirm,
  isSubmitting,
}) {
  const [selectedRfqIds, setSelectedRfqIds] = useState(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const draftRfqs = useMemo(() => rfqs.filter((r) => r.status === "draft"), [rfqs]);

  // Group by the first item's brand+model (or variant_name) as a product grouping key
  const groupedData = useMemo(() => {
    const groups = {};
    draftRfqs.forEach((rfq) => {
      const items = rfq.items?.items || [];
      items.forEach((item) => {
        const groupKey = [item.brand, item.model].filter(Boolean).join(" ") || item.variant_name || "Unknown Product";
        if (!groups[groupKey]) groups[groupKey] = [];
        const exists = groups[groupKey].find((e) => e.rfq.id === rfq.id);
        if (!exists) groups[groupKey].push({ rfq, item });
      });
    });
    return groups;
  }, [draftRfqs]);

  const handleToggle = (rfqId) => {
    const newSet = new Set(selectedRfqIds);
    if (newSet.has(rfqId)) newSet.delete(rfqId);
    else newSet.add(rfqId);
    setSelectedRfqIds(newSet);
  };

  const handleSelectGroup = (groupKey, isChecked) => {
    const newSet = new Set(selectedRfqIds);
    groupedData[groupKey].forEach((e) => {
      if (isChecked) newSet.add(e.rfq.id);
      else newSet.delete(e.rfq.id);
    });
    setSelectedRfqIds(newSet);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedRfqIds));
    setSelectedRfqIds(new Set());
  };

  const toggleGroup = (name) => {
    const newSet = new Set(collapsedGroups);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setCollapsedGroups(newSet);
  };

  const sortedGroupKeys = Object.keys(groupedData).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col p-0">
        <div className="shrink-0 p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Consolidate Items
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select Draft RFQs to merge into a single Master RFQ. Items with the same Product & Variant will have their quantities summed.
            </p>
          </DialogHeader>
        </div>

        {draftRfqs.length === 0 ? (
          <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center py-10 text-muted-foreground">
            <AlertCircle className="mb-2 h-10 w-10 opacity-20" />
            <p>No Draft RFQs available to consolidate.</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <div className="space-y-4 py-2">
              {sortedGroupKeys.map((groupKey) => {
                const entries = groupedData[groupKey];
                const allSelected = entries.every((e) => selectedRfqIds.has(e.rfq.id));
                const someSelected = entries.some((e) => selectedRfqIds.has(e.rfq.id));
                const isCollapsed = collapsedGroups.has(groupKey);

                return (
                  <div key={groupKey} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all">
                    <div
                      className="flex cursor-pointer select-none items-center justify-between border-b border-border bg-muted/70 p-3 transition-colors hover:bg-accent/40"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={allSelected || (someSelected && "indeterminate")}
                            onCheckedChange={(checked) => handleSelectGroup(groupKey, checked)}
                          />
                        </div>
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <Box className="h-4 w-4 text-primary" />
                          {groupKey}
                          <Badge variant="secondary" className="text-xs font-normal">{entries.length} RFQs</Badge>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-border">
                        {entries.map(({ rfq, item }) => {
                          const itemsInRfq = rfq.items?.items || [];
                          const { primaryLabel, secondaryLabel } = getRFQItemDisplay(item);
                          return (
                            <div key={rfq.id} className="flex items-center justify-between p-3 pl-10 transition-colors hover:bg-accent/30">
                              <div className="flex items-center gap-3">
                                <Checkbox checked={selectedRfqIds.has(rfq.id)} onCheckedChange={() => handleToggle(rfq.id)} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-primary">{rfq.rfq_number}</span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">Requested by {rfq.requested_by_name || rfq.created_by || "User"}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Includes: <span className="font-medium">{primaryLabel}</span>
                                    {secondaryLabel ? ` (${secondaryLabel})` : ""} (Qty: {item.quantity})
                                    {itemsInRfq.length > 1 && <span className="italic text-muted-foreground/70"> + {itemsInRfq.length - 1} other items</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="shrink-0 p-6 pt-2">
          <DialogFooter className="border-t pt-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm text-muted-foreground">{selectedRfqIds.size} RFQs selected for consolidation</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={selectedRfqIds.size < 2 || isSubmitting}>
                  {isSubmitting ? "Merging..." : "Consolidate & Create RFQ"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
