import React from "react";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

const INVENTORY_STATUSES = [
  "available", "reserved", "reserved_for_transfer", "sold", "sold_as_replacement",
  "qc_pending", "rma", "for_return_to_supplier", "on_hold", "damaged",
  "stolen_lost", "scrap", "in_transit", "bundled",
];

const PURCHASE_FILE_DATA_FIELDS = [
  { key: "imei3", label: "IMEI 3" },
  { key: "model_code", label: "Model Code" },
  { key: "submodel", label: "Submodel" },
  { key: "ram_type", label: "RAM Type" },
  { key: "rom_type", label: "ROM Type" },
  { key: "ram_slots", label: "RAM Slots" },
  { key: "sim_slot", label: "SIM Slot" },
  { key: "network_1", label: "Network 1" },
  { key: "network_2", label: "Network 2" },
  { key: "network_type", label: "Network Type" },
  { key: "product_type", label: "Product Type" },
  { key: "with_charger", label: "With Charger" },
  { key: "code", label: "Code" },
  { key: "country_model", label: "Country Model" },
  { key: "os", label: "OS" },
  { key: "software", label: "Software" },
  { key: "resolution", label: "Resolution" },
  { key: "condition", label: "Condition" },
  { key: "intro", label: "Intro" },
  { key: "details", label: "Details" },
  { key: "product_details", label: "Product Details" },
];

function FieldRow({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
        {label}
      </Label>
      {children}
    </div>
  );
}

const inputCls =
  "h-8 text-xs border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

export default function BatchUpdateFieldForm({
  fields,
  onChange,
  variantOptions,
  warehouseOptions,
}) {
  const statusOptions = INVENTORY_STATUSES.map((s) => ({
    value: s,
    label: s === "available" ? "active" : s.replace(/_/g, " "),
  }));

  const handleChange = (key, value) => {
    onChange({ ...fields, [key]: value });
  };

  const handlePurchaseFileDataChange = (subKey, value) => {
    const current = fields.purchase_file_data || {};
    onChange({
      ...fields,
      purchase_file_data: { ...current, [subKey]: value },
    });
  };

  return (
    <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2">
      {/* Core Fields */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Core Fields
        </h4>

        <FieldRow label="Product Variant">
          <Combobox
            options={variantOptions}
            value={fields.variant_id || ""}
            onValueChange={(v) => handleChange("variant_id", v)}
            placeholder="Select variant..."
            className={`w-full ${inputCls}`}
          />
        </FieldRow>

        <FieldRow label="IMEI 1">
          <Input
            value={fields.imei1 || ""}
            onChange={(e) => handleChange("imei1", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="IMEI 2">
          <Input
            value={fields.imei2 || ""}
            onChange={(e) => handleChange("imei2", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Serial Number">
          <Input
            value={fields.serial_number || ""}
            onChange={(e) => handleChange("serial_number", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Location">
          <Combobox
            options={warehouseOptions}
            value={fields.warehouse_id || ""}
            onValueChange={(v) => handleChange("warehouse_id", v)}
            placeholder="Select warehouse..."
            className={`w-full ${inputCls}`}
          />
        </FieldRow>

        <FieldRow label="Status">
          <Combobox
            options={statusOptions}
            value={fields.status || ""}
            onValueChange={(v) => handleChange("status", v)}
            placeholder="Select status..."
            className={`w-full ${inputCls}`}
          />
        </FieldRow>

        <FieldRow label="Encoded Date">
          <Input
            type="date"
            value={fields.encoded_date || ""}
            onChange={(e) => handleChange("encoded_date", e.target.value)}
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Warranty">
          <Input
            value={fields.warranty_description || ""}
            onChange={(e) => handleChange("warranty_description", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Pricing
        </h4>

        <FieldRow label="Cost Price">
          <Input
            type="number"
            step="0.01"
            value={fields.cost_price ?? ""}
            onChange={(e) => handleChange("cost_price", e.target.value ? Number(e.target.value) : "")}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Cash Price">
          <Input
            type="number"
            step="0.01"
            value={fields.cash_price ?? ""}
            onChange={(e) => handleChange("cash_price", e.target.value ? Number(e.target.value) : "")}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="SRP">
          <Input
            type="number"
            step="0.01"
            value={fields.srp ?? ""}
            onChange={(e) => handleChange("srp", e.target.value ? Number(e.target.value) : "")}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>
      </div>

      {/* Technical */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Technical & Reference
        </h4>

        <FieldRow label="CPU">
          <Input
            value={fields.cpu || ""}
            onChange={(e) => handleChange("cpu", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="GPU">
          <Input
            value={fields.gpu || ""}
            onChange={(e) => handleChange("gpu", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Package">
          <Input
            value={fields.package || ""}
            onChange={(e) => handleChange("package", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="GRN Number">
          <Input
            value={fields.grn_number || ""}
            onChange={(e) => handleChange("grn_number", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Purchase">
          <Input
            value={fields.purchase || ""}
            onChange={(e) => handleChange("purchase", e.target.value)}
            placeholder="Leave blank to skip"
            className={inputCls}
          />
        </FieldRow>
      </div>

      {/* Purchase File Data */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Purchase File Data
        </h4>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Fills provided fields replace the entire purchase_file_data object. Leave all blank to skip.
        </p>

        {PURCHASE_FILE_DATA_FIELDS.map(({ key, label }) => (
          <FieldRow key={key} label={label}>
            <Input
              value={fields.purchase_file_data?.[key] || ""}
              onChange={(e) => handlePurchaseFileDataChange(key, e.target.value)}
              placeholder="Leave blank to skip"
              className={inputCls}
            />
          </FieldRow>
        ))}
      </div>
    </div>
  );
}