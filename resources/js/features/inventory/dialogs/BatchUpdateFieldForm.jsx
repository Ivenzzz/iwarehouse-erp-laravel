import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";

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

export default function BatchUpdateFieldForm({
  fields,
  onChange,
  variantOptions,
  warehouseOptions,
  variantSearchValue,
  onVariantSearchChange,
  onVariantLoadMore,
  canLoadMoreVariants,
  isVariantLoading,
}) {
  const handleChange = (key, value) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Variant</span>
        <Combobox
          value={fields.variant_id || ""}
          onValueChange={(value) => handleChange("variant_id", value || "")}
          options={variantOptions}
          placeholder="Leave unchanged"
          searchPlaceholder="Search variants..."
          loading={isVariantLoading}
          onSearchChange={onVariantSearchChange}
          searchValue={variantSearchValue}
          debounceMs={250}
          footer={canLoadMoreVariants ? (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={onVariantLoadMore}>
              Load More Variants
            </Button>
          ) : null}
          className="h-9"
        />
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

      <TextField label="Warranty" value={fields.warranty_description} onChange={(value) => handleChange("warranty_description", value)} />
    </div>
  );
}
