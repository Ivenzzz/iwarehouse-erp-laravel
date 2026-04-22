import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, FileText, Image, Upload, X } from "lucide-react";

import { toast } from "@/shared/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";

export default function ReplacementPaymentModal({
  open,
  onOpenChange,
  inventory,
  employees,
  warehouseId,
  onConfirm,
}) {
  const [barcode, setBarcode] = useState("");
  const [resolvedItem, setResolvedItem] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [validatedBy, setValidatedBy] = useState("");
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const employeeOptions = useMemo(
    () => (employees || [])
      .filter((employee) => String(employee.status || "").toLowerCase() === "active")
      .map((employee) => ({
        value: String(employee.id),
        label: employee.full_name || employee.label || employee.employee_id || "Unknown",
      })),
    [employees],
  );

  const reset = () => {
    setBarcode("");
    setResolvedItem(null);
    setLookupError("");
    setRemarks("");
    setValidatedBy("");
    setSupportingDocs([]);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleLookup = () => {
    const searchLower = barcode.trim().toLowerCase();

    if (!searchLower) {
      setResolvedItem(null);
      setLookupError("Please enter a barcode.");
      return;
    }

    const match = (inventory || []).find((item) =>
      String(item.warehouse_id) === String(warehouseId)
      && String(item.status || "").toLowerCase() === "available"
      && [item.imei1, item.imei2, item.serial_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase() === searchLower)
    );

    if (!match) {
      setResolvedItem(null);
      setLookupError("No available inventory item found with that barcode in the selected warehouse.");
      return;
    }

    setResolvedItem(match);
    setLookupError("");
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const remaining = 5 - supportingDocs.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", description: "Maximum 5 documents allowed." });
      return;
    }

    setUploading(true);

    try {
      const uploaded = [];

      for (const file of files.slice(0, remaining)) {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await axios.post(route("pos.uploads.store"), formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploaded.push({
          url: data.file_url,
          name: file.name,
          type: file.type,
        });
      }

      setSupportingDocs((previous) => [...previous, ...uploaded]);
    } catch (error) {
      toast({ variant: "destructive", description: error.response?.data?.message || "Failed to upload document." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirm = () => {
    if (!resolvedItem) {
      toast({ variant: "destructive", description: "Look up a replacement item first." });
      return;
    }

    if (!validatedBy) {
      toast({ variant: "destructive", description: "Select who validated this replacement." });
      return;
    }

    onConfirm({
      replacementInventoryId: resolvedItem.id,
      replacementBarcode: barcode.trim(),
      replacementItemDetails: {
        imei1: resolvedItem.imei1,
        imei2: resolvedItem.imei2,
        serial_number: resolvedItem.serial_number,
        product_master_id: resolvedItem.product_master_id,
        variant_id: resolvedItem.variant_id,
      },
      remarks,
      validatedBy,
      supportingDocUrls: supportingDocs,
    });

    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white text-slate-900 border border-slate-200 dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Replacement Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-200">Replacement Barcode (IMEI/Serial) *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Scan or enter IMEI / Serial Number"
                value={barcode}
                onChange={(event) => {
                  setBarcode(event.target.value);
                  setLookupError("");
                  setResolvedItem(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleLookup();
                  }
                }}
                className="flex-1 bg-white text-slate-900 border-slate-300 dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800"
              />
              <Button type="button" onClick={handleLookup} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400">
                Lookup
              </Button>
            </div>

            {lookupError && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            {resolvedItem && (
              <div className="rounded-lg border p-3 space-y-1 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                    Item Found
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <strong>IMEI1:</strong> {resolvedItem.imei1 || "-"} | <strong>IMEI2:</strong> {resolvedItem.imei2 || "-"} | <strong>SN:</strong> {resolvedItem.serial_number || "-"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-200">Remarks</Label>
            <Textarea
              placeholder="Enter remarks about the replacement..."
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={3}
              className="bg-white text-slate-900 border-slate-300 dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-200">Validated By *</Label>
            <Combobox
              value={validatedBy}
              onValueChange={setValidatedBy}
              options={employeeOptions}
              placeholder="Select employee..."
              searchPlaceholder="Search employees..."
              emptyText="No employee found"
              className="w-full h-9 text-xs bg-white text-slate-900 border border-slate-300 dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-200">Supporting Documents (up to 5)</Label>

            {supportingDocs.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded px-3 py-2 border bg-slate-50 border-slate-200 dark:bg-[#020617] dark:border-slate-800">
                {doc.type?.startsWith("image") ? (
                  <Image className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                )}
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">{doc.name}</span>
                <button type="button" onClick={() => setSupportingDocs((previous) => previous.filter((_, itemIndex) => itemIndex !== idx))} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {supportingDocs.length < 5 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="w-full text-xs border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800/40">
                  {uploading ? "Uploading..." : (
                    <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5" /> Upload File</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800/40">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!resolvedItem || !validatedBy} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-500">
            Confirm Replacement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
