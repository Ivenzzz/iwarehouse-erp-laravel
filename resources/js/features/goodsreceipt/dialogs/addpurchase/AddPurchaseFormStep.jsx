import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Download, CalendarIcon } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import DocumentScanner from "@/components/shared/DocumentScanner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CSV_TEMPLATE_HEADERS = [
  "Model",
  "Barcode",
  "Serial Number",
  "IMEI 1",
  "IMEI 2",
  "IMEI 3",
  "Model Code",
  "SKU Code",
  "Submodel",
  "Ram Capacity",
  "Ram Type",
  "Rom Capacity",
  "Rom Type",
  "Ram Slots",
  "Color",
  "Sim Slot",
  "Network 1",
  "Network 2",
  "Network Type",
  "Product Type",
  "With Charger",
  "Package",
  "Code",
  "Country Model",
  "CPU",
  "GPU",
  "OS",
  "Software",
  "Resolution",
  "Warranty",
  "Cost",
  "Cash Price",
  "SRP",
  "12 Months CC",
  "3 Months CC",
  "DP 30%",
  "Condition",
  "Intro",
  "Details",
  "Product Details",
];

const CSV_SAMPLE_ROW = [
  "iPhone 16 Pro Max",
  "IP16PM-DT-256",
  "",
  "350000000000001",
  "350000000000002",
  "",
  "A3293",
  "",
  "",
  "8GB",
  "LPDDR5",
  "256GB",
  "NVMe",
  "",
  "Desert Titanium",
  "Nano + eSIM",
  "5G",
  "5G",
  "5G",
  "Smartphone",
  "Yes",
  "Complete",
  "",
  "PH",
  "",
  "",
  "iOS 18",
  "",
  "2796x1290",
  "1 Year Apple Warranty",
  "65000",
  "72000",
  "79990",
  "83990",
  "75990",
  "85990",
  "Brand New",
  "",
  "",
  "",
];

function downloadCSVTemplate() {
  const csvContent = [
    CSV_TEMPLATE_HEADERS.join(","),
    CSV_SAMPLE_ROW.join(","),
  ].join("\n");

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
  const h = parseInt(h24, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

  return {
    hour12: h12.toString(),
    period,
  };
}

function to24Hour(h12, period) {
  let h = parseInt(h12, 10);

  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;

  return h;
}

const labelClass = "text-foreground";

const inputClass =
  "bg-background border-border text-foreground placeholder:text-muted-foreground " +
  "focus-visible:ring-ring focus-visible:ring-offset-background";

const outlineButtonClass =
  "border-border bg-background text-foreground " +
  "hover:bg-accent hover:text-accent-foreground " +
  "focus-visible:ring-ring focus-visible:ring-offset-background";

const helperTextClass = "text-xs text-muted-foreground";

const successTextClass =
  "flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400";

const dangerIconClass =
  "h-3 w-3 text-destructive transition-opacity hover:opacity-80";

const pickerTriggerClass =
  "border-border bg-background text-foreground shadow-sm " +
  "hover:bg-accent hover:text-accent-foreground " +
  "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

const pickerContentClass =
  "z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-md";

const pickerItemClass =
  "cursor-pointer text-popover-foreground " +
  "focus:bg-accent focus:text-accent-foreground " +
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground " +
  "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

function ArrivalDateTimePicker({ value, onChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateObj = value ? new Date(value) : null;

  const h24 = dateObj
    ? dateObj.getHours().toString().padStart(2, "0")
    : "08";

  const minutes = dateObj
    ? dateObj.getMinutes().toString().padStart(2, "0")
    : "00";

  const { hour12, period } = to12Hour(h24);

  const handleDateSelect = (date) => {
    if (!date) return;

    const newDate = new Date(date);
    newDate.setHours(parseInt(h24, 10), parseInt(minutes, 10), 0, 0);

    onChange(newDate.toISOString());
    setCalendarOpen(false);
  };

  const handleHourChange = (val) => {
    const base = dateObj ? new Date(dateObj) : new Date();
    base.setHours(to24Hour(val, period), parseInt(minutes, 10), 0, 0);
    onChange(base.toISOString());
  };

  const handleMinuteChange = (val) => {
    const base = dateObj ? new Date(dateObj) : new Date();
    base.setMinutes(parseInt(val, 10));
    onChange(base.toISOString());
  };

  const handlePeriodChange = (val) => {
    const base = dateObj ? new Date(dateObj) : new Date();
    base.setHours(to24Hour(hour12, val), parseInt(minutes, 10), 0, 0);
    onChange(base.toISOString());
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-start text-left sm:flex-1 ${pickerTriggerClass}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />

            <span
              className={dateObj ? "text-foreground" : "text-muted-foreground"}
            >
              {dateObj ? format(dateObj, "MMM dd, yyyy") : "Select date..."}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className={`w-auto p-0 ${pickerContentClass}`}
        >
          <Calendar
            mode="single"
            selected={dateObj || undefined}
            onSelect={handleDateSelect}
            className="bg-popover text-popover-foreground"
            classNames={{
              months: "bg-popover text-popover-foreground",
              month: "bg-popover text-popover-foreground",
              caption: "bg-popover text-popover-foreground",
              caption_label: "text-foreground",
              nav: "space-x-1 flex items-center",
              nav_button:
                "h-7 w-7 border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
              table: "w-full border-collapse bg-popover text-popover-foreground",
              head_row: "flex",
              head_cell:
                "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
              row: "mt-2 flex w-full",
              cell:
                "relative h-9 w-9 p-0 text-center text-sm text-foreground focus-within:relative focus-within:z-20",
              day:
                "h-9 w-9 rounded-md p-0 font-normal text-foreground hover:bg-accent hover:text-accent-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_outside:
                "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle:
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Select value={hour12} onValueChange={handleHourChange}>
          <SelectTrigger className={`w-[68px] ${pickerTriggerClass}`}>
            <SelectValue />
          </SelectTrigger>

          <SelectContent
            position="popper"
            className={`${pickerContentClass} max-h-48 overflow-y-auto`}
          >
            {hourOptions.map((h) => (
              <SelectItem key={h} value={h} className={pickerItemClass}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="font-bold text-muted-foreground">:</span>

        <Select value={minutes} onValueChange={handleMinuteChange}>
          <SelectTrigger className={`w-[68px] ${pickerTriggerClass}`}>
            <SelectValue />
          </SelectTrigger>

          <SelectContent
            position="popper"
            className={`${pickerContentClass} max-h-48 overflow-y-auto`}
          >
            {minuteOptions.map((m) => (
              <SelectItem key={m} value={m} className={pickerItemClass}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className={`w-[68px] ${pickerTriggerClass}`}>
            <SelectValue />
          </SelectTrigger>

          <SelectContent position="popper" className={pickerContentClass}>
            <SelectItem value="AM" className={pickerItemClass}>
              AM
            </SelectItem>
            <SelectItem value="PM" className={pickerItemClass}>
              PM
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
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
    label:
      s.master_profile?.trade_name ||
      s.master_profile?.legal_business_name ||
      s.supplier_code,
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
    <div className="space-y-5 text-foreground">
      {/* Supplier */}
      <div className="space-y-2">
        <Label className={labelClass}>Supplier *</Label>
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
        <Label className={labelClass}>Arrival Date & Time *</Label>
        <ArrivalDateTimePicker
          value={formData.arrivalDate}
          onChange={(val) => updateFormData("arrivalDate", val)}
        />
      </div>

      {/* Date Encoded */}
      <div className="space-y-2">
        <Label className={labelClass}>Date Encoded *</Label>
        <ArrivalDateTimePicker
          value={formData.dateEncoded}
          onChange={(val) => updateFormData("dateEncoded", val)}
        />
      </div>

      {/* Encoded By */}
      <div className="space-y-2">
        <Label className={labelClass}>Encoded By *</Label>
        <Input
          placeholder="Enter encoder name"
          value={formData.encodedBy || ""}
          onChange={(e) => updateFormData("encodedBy", e.target.value)}
          className={inputClass}
        />
      </div>

      {/* DR Number */}
      <div className="space-y-2">
        <Label className={labelClass}>DR Number *</Label>
        <Input
          placeholder="Enter DR number"
          value={formData.drNumber}
          onChange={(e) => updateFormData("drNumber", e.target.value)}
          className={inputClass}
        />
      </div>

      {/* DR Document Upload */}
      <div className="space-y-2">
        <Label className={labelClass}>DR Document *</Label>

        <div className="flex flex-wrap items-center gap-2">
          <DocumentScanner
            onFileCapture={(url) => updateFormData("drDocumentUrl", url)}
            buttonLabel="Scan / Upload DR"
          />

          {formData.drDocumentUrl && (
            <span className={successTextClass}>
              <FileText className="h-3 w-3" />
              Uploaded

              <button
                type="button"
                onClick={() => updateFormData("drDocumentUrl", "")}
                className="ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Remove DR document"
              >
                <X className={dangerIconClass} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Waybill Upload Optional */}
      <div className="space-y-2">
        <Label className={labelClass}>
          Waybill <span className="text-muted-foreground">(optional)</span>
        </Label>

        <div className="flex flex-wrap items-center gap-2">
          <DocumentScanner
            onFileCapture={(url) => updateFormData("waybillUrl", url)}
            buttonLabel="Scan / Upload Waybill"
          />

          {formData.waybillUrl && (
            <span className={successTextClass}>
              <FileText className="h-3 w-3" />
              Uploaded

              <button
                type="button"
                onClick={() => updateFormData("waybillUrl", "")}
                className="ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Remove waybill document"
              >
                <X className={dangerIconClass} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Tracking Number */}
      <div className="space-y-2">
        <Label className={labelClass}>Tracking Number</Label>
        <Input
          placeholder="Enter tracking number"
          value={formData.trackingNumber}
          onChange={(e) => updateFormData("trackingNumber", e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Purchase File CSV */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label className={labelClass}>Purchase File (CSV) *</Label>

          <button
            type="button"
            onClick={downloadCSVTemplate}
            className="flex items-center gap-1 text-xs text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Download className="h-3 w-3" />
            Download Template
          </button>
        </div>

        <p className={helperTextClass}>
          Each data row needs at least one of: Serial Number, IMEI 1, IMEI 2,
          or Barcode. Barcode fills IMEI 1 when IMEI 1 is empty.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={outlineButtonClass}
            onClick={() => csvInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
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
            <span className={successTextClass}>
              <FileText className="h-3 w-3" />
              {csvFileName}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className={outlineButtonClass}
        >
          Cancel
        </Button>

        <Button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          Validate & Continue
        </Button>
      </div>
    </div>
  );
}