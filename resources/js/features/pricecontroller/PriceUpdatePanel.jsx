import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DollarSign, ArrowRight } from "lucide-react";

export default function PriceUpdatePanel({ selectedCount, onApply, isUpdating }) {
  const [newCashPrice, setNewCashPrice] = useState("");
  const [newSrp, setNewSrp] = useState("");

  const canApply = selectedCount > 0 && (newCashPrice !== "" || newSrp !== "");

  const handleApply = () => {
    onApply({
      newCashPrice: newCashPrice !== "" ? newCashPrice : null,
      newSrp: newSrp !== "" ? newSrp : null,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-emerald-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Set New Prices</h3>
        {selectedCount > 0 && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 dark:text-gray-400">New Cash Price (₱)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Leave blank to skip"
            value={newCashPrice}
            onChange={(e) => setNewCashPrice(e.target.value)}
            className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 dark:text-gray-400">New SRP (₱)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Leave blank to skip"
            value={newSrp}
            onChange={(e) => setNewSrp(e.target.value)}
            className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      <Button
        onClick={handleApply}
        disabled={!canApply || isUpdating}
        className="w-full gap-2"
      >
        <ArrowRight className="w-4 h-4" />
        {isUpdating ? "Updating..." : `Apply to ${selectedCount} Item${selectedCount !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
