import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Download, CalendarIcon } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import DocumentScanner from "@/components/shared/DocumentScanner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CSV_TEMPLATE_HEADERS = [
  "Model", "Barcode", "Serial Number", "IMEI 1", "IMEI 2", "IMEI 3", "Model Code", "SKU Code",
  "Submodel", "Ram Capacity", "Ram Type", "Rom Capacity", "Rom Type", "Ram Slots", "Color",
  "Sim Slot", "Network 1", "Network 2", "Network Type", "Product Type", "With Charger", "Package",
  "Code", "Country Model", "CPU", "GPU", "OS", "Software", "Resolution", "Warranty", "Cost",
  "Cash Price", "SRP", "12 Months CC", "3 Months CC", "DP 30%", "Condition", "Intro", "Details",
  "Product Details"
];

const CSV_SAMPLE_ROW = [
  "iPhone 16 Pro Max", "IP16PM-DT-256", "", "350000000000001", "350000000000002", "", "A3293", "",
  "", "8GB", "LPDDR5", "256GB", "NVMe", "", "Desert Titanium",
  "Nano + eSIM", "5G", "5G", "5G", "Smartphone", "Yes", "Complete",
  "", "PH", "", "", "iOS 18", "", "2796x1290", "1 Year Apple Warranty", "65000",
  "72000", "79990", "83990", "75990", "85990", "Brand New", "", "", ""
];

function downloadCSVTemplate() {
  const csvContent = [CSV_TEMPLATE_HEADERS.join(","), CSV_SAMPLE_ROW.join(",")].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "purchase_file_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function to12Hour(h24) {
  const h = parseInt(h24);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12: h12.toString(), period };
}

function to24Hour(h12, period) {
  let h = parseInt(h12);
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return h;
}

function ArrivalDateTimePicker({ value, onChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateObj = value ? new Date(value) : null;
  const h24 = dateObj ? dateObj.getHours().toString().padStart(2, "0") : "08";
  const minutes = dateObj ? dateObj.getMinutes().toString().padStart(2, "0") : "00";
  const { hour12, period } = to12Hour(h24);

  const handleDateSelect = (date) => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setHours(parseInt(h24), parseInt(minutes), 0, 0);
    onChange(newDate.toISOString());
    setCalendarOpen(false);
  };

  const handleHourChange = (val) => {
    const base = dateObj ? new Date(dateObj) : new Date();
    base.setHours(to24Hour(val, period), parseInt(minutes), 0, 0);
    onChange(base.toISOString());
  };

  const handleMinuteChange = (val) => {
    const base = dateObj ? new Date(dateObj) : new Date();
    base.setMinutes(parseInt(val));
    onChange(base.toISOString());
  };

  const handlePeriodChange = (val) => {
    const base = dateObj ? new Date(dateObj) : new Date();
    base.setHours(to24Hour(hour12, val), parseInt(minutes), 0, 0);
    onChange(base.toISOString());
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className="flex items-center gap-2">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex-1 justify-start text-left bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {dateObj ? format(dateObj, "MMM dd, yyyy") : "Select date..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="start">
          <Calendar
            mode="single"
            selected={dateObj || undefined}
            onSelect={handleDateSelect}
            className="bg-popover text-popover-foreground"
          />
        </PopoverContent>
      </Popover>
      <Select value={hour12} onValueChange={handleHourChange}>
        <SelectTrigger className="w-[68px] bg-background border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">
          {hourOptions.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-bold">:</span>
      <Select value={minutes} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-[68px] bg-background border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">
          {minuteOptions.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[68px] bg-background border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border text-popover-foreground">
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function AddPurchaseFormStep({
  formData,
  updateFormData,
  suppliers,
  onValidateCSV,
  onClose,
}) {
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const csvInputRef = useRef(null);

  const supplierOptions = suppliers.map((s) => ({
    value: String(s.id),
    label: s.master_profile?.trade_name || s.master_profile?.legal_business_name || s.supplier_code,
  }));

  const handleCSVSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    updateFormData("purchaseFile", file);

    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const canSubmit =
    formData.supplierId &&
    formData.arrivalDate &&
    formData.dateEncoded &&
    formData.encodedBy &&
    formData.drNumber &&
    formData.drDocumentUrl &&
    csvText;

  const handleSubmit = () => {
    onValidateCSV(csvText);
  };

  return (
    <div className="space-y-5">
      {/* Supplier */}
      <div className="space-y-2">
        <Label className="text-foreground">Supplier *</Label>
        <Combobox
          options={supplierOptions}
          value={formData.supplierId}
          onValueChange={(val) => updateFormData("supplierId", val)}
          placeholder="Select supplier..."
          searchPlaceholder="Search suppliers..."
          emptyText="No suppliers found."
        />
      </div>

      {/* Arrival Date & Time */}
      <div className="space-y-2">
        <Label className="text-foreground">Arrival Date & Time *</Label>
        <ArrivalDateTimePicker
          value={formData.arrivalDate}
          onChange={(val) => updateFormData("arrivalDate", val)}
        />
      </div>

      {/* Date Encoded */}
      <div className="space-y-2">
        <Label className="text-foreground">Date Encoded *</Label>
        <ArrivalDateTimePicker
          value={formData.dateEncoded}
          onChange={(val) => updateFormData("dateEncoded", val)}
        />
      </div>

      {/* Encoded By */}
      <div className="space-y-2">
        <Label className="text-foreground">Encoded By *</Label>
        <Input
          placeholder="Enter encoder name"
          value={formData.encodedBy || ""}
          onChange={(e) => updateFormData("encodedBy", e.target.value)}
          className="bg-background border-border text-foreground"
        />
      </div>

      {/* DR Number */}
      <div className="space-y-2">
        <Label className="text-foreground">DR Number *</Label>
        <Input
          placeholder="Enter DR number"
          value={formData.drNumber}
          onChange={(e) => updateFormData("drNumber", e.target.value)}
          className="bg-background border-border text-foreground"
        />
      </div>

      {/* DR Document Upload */}
      <div className="space-y-2">
        <Label className="text-foreground">DR Document *</Label>
        <div className="flex items-center gap-2">
          <DocumentScanner
            onFileCapture={(url) => updateFormData("drDocumentUrl", url)}
            buttonLabel="Scan / Upload DR"
          />
          {formData.drDocumentUrl && (
            <span className="text-xs text-[hsl(var(--success))] flex items-center gap-1">
              <FileText className="w-3 h-3" /> Uploaded
              <button onClick={() => updateFormData("drDocumentUrl", "")} className="ml-1">
                <X className="w-3 h-3 text-[hsl(var(--destructive))] hover:opacity-80" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Waybill Upload (Optional) */}
      <div className="space-y-2">
        <Label className="text-foreground">Waybill <span className="text-muted-foreground">(optional)</span></Label>
        <div className="flex items-center gap-2">
          <DocumentScanner
            onFileCapture={(url) => updateFormData("waybillUrl", url)}
            buttonLabel="Scan / Upload Waybill"
          />
          {formData.waybillUrl && (
            <span className="text-xs text-[hsl(var(--success))] flex items-center gap-1">
              <FileText className="w-3 h-3" /> Uploaded
              <button onClick={() => updateFormData("waybillUrl", "")} className="ml-1">
                <X className="w-3 h-3 text-[hsl(var(--destructive))] hover:opacity-80" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Tracking Number */}
      <div className="space-y-2">
        <Label className="text-foreground">Tracking Number</Label>
        <Input
          placeholder="Enter tracking number"
          value={formData.trackingNumber}
          onChange={(e) => updateFormData("trackingNumber", e.target.value)}
          className="bg-background border-border text-foreground"
        />
      </div>

      {/* Purchase File CSV */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-foreground">Purchase File (CSV) *</Label>
          <button
            type="button"
            onClick={downloadCSVTemplate}
            className="text-xs text-primary hover:opacity-80 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download Template
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => csvInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Select CSV
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleCSVSelect}
          />
          {csvFileName && (
            <span className="text-xs text-[hsl(var(--success))] flex items-center gap-1">
              <FileText className="w-3 h-3" /> {csvFileName}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose} className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
          Cancel
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Validate & Continue
        </Button>
      </div>
    </div>
  );
}
