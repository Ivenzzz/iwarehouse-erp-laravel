const STATUS_OPTIONS = [
  "available",
  "reserved",
  "reserved_for_transfer",
  "sold",
  "qc_pending",
  "rma",
  "for_return_to_supplier",
  "on_hold",
  "damaged",
  "stolen_lost",
  "scrap",
  "in_transit",
  "bundled",
];

function TextField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950" />
    </label>
  );
}

export default function BatchUpdateFieldForm({ fields, onChange, variantOptions, warehouseOptions }) {
  const handleChange = (key, value) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Variant</span>
        <select value={fields.variant_id || ""} onChange={(event) => handleChange("variant_id", event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">Leave unchanged</option>
          {variantOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Warehouse</span>
        <select value={fields.warehouse_id || ""} onChange={(event) => handleChange("warehouse_id", event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">Leave unchanged</option>
          {warehouseOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
        <select value={fields.status || ""} onChange={(event) => handleChange("status", event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">Leave unchanged</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>

      <TextField label="Encoded Date" value={fields.encoded_date} onChange={(value) => handleChange("encoded_date", value)} placeholder="2026-04-08 10:00:00" />
      <TextField label="IMEI 1" value={fields.imei1} onChange={(value) => handleChange("imei1", value)} />
      <TextField label="IMEI 2" value={fields.imei2} onChange={(value) => handleChange("imei2", value)} />
      <TextField label="Serial Number" value={fields.serial_number} onChange={(value) => handleChange("serial_number", value)} />
      <TextField label="Warranty" value={fields.warranty_description} onChange={(value) => handleChange("warranty_description", value)} />
      <TextField label="Cost Price" value={fields.cost_price} onChange={(value) => handleChange("cost_price", value)} />
      <TextField label="Cash Price" value={fields.cash_price} onChange={(value) => handleChange("cash_price", value)} />
      <TextField label="SRP" value={fields.srp} onChange={(value) => handleChange("srp", value)} />
      <TextField label="Package" value={fields.package} onChange={(value) => handleChange("package", value)} />
      <TextField label="CPU" value={fields.cpu} onChange={(value) => handleChange("cpu", value)} />
      <TextField label="GPU" value={fields.gpu} onChange={(value) => handleChange("gpu", value)} />
      <TextField label="GRN Number" value={fields.grn_number} onChange={(value) => handleChange("grn_number", value)} />
      <TextField label="Purchase Reference" value={fields.purchase} onChange={(value) => handleChange("purchase", value)} />
    </div>
  );
}
