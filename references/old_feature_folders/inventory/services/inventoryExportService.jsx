/**
 * Inventory CSV Export Service
 * Exports inventory items with full detail columns, pulling from purchase_file_data
 * with fallback to ProductMaster fixed_specifications.
 */

const CSV_HEADERS = [
  "ID",
  "Barcode",
  "Serial Number",
  "IMEI 1",
  "IMEI 2",
  "IMEI 3",
  "Brand",
  "Model",
  "Submodel",
  "Category",
  "Subcategory",
  "SKU Code",
  "SRP",
  "Cash",
  "Cost",
  "RAM Capacity",
  "ROM Capacity",
  "RAM Type",
  "ROM Type",
  "RAM Slot",
  "Warehouse",
  "Encoder",
  "Purchase",
  "Date Encoded",
  "Time Encoded",
  "Product Type",
  "Condition",
  "Code",
  "Country Model",
  "Warranty",
  "GPU",
  "CPU",
  "Screen Size",
  "Screen Type",
  "Screen Refresh Rate",
  "Resolution",
  "Operating System",
  "Softwares",
  "Front Camera",
  "Main Camera",
  "Battery",
  "Color",
  "With Charger",
  "Package",
  "SIM Slot",
  "Network 1",
  "Network 2",
  "Network Type",
  "12 Months Credit Card",
  "3 Months Credit Card",
  "30% Downpayment",
  "Introduction",
  "Details",
  "Product Details",
  "Status",
];

/**
 * Get a value from purchase_file_data first, then fallback to fixed_specifications.
 */
function getField(item, pm, pfdKey, specsKey) {
  const pfd = item.purchase_file_data;
  if (pfd && pfd[pfdKey] != null && pfd[pfdKey] !== "") return pfd[pfdKey];
  const specs = pm?.fixed_specifications;
  if (specs && specsKey && specs[specsKey] != null && specs[specsKey] !== "") return specs[specsKey];
  return "";
}

function escapeCSVCell(value) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Build a single CSV row array from an inventory item.
 */
function buildRow(item, lookups) {
  const { pmMap, variantMap, warehouseMap, brandMap, categoryMap, subcategoryMap } = lookups;
  const pm = pmMap.get(item.product_master_id);
  const variant = variantMap.get(item.variant_id);
  const warehouse = warehouseMap.get(item.warehouse_id);
  const brand = brandMap.get(pm?.brand_id);
  const category = categoryMap.get(pm?.category_id);
  const subcategory = subcategoryMap.get(pm?.subcategory_id);
  const pfd = item.purchase_file_data || {};
  const specs = pm?.fixed_specifications || {};
  const attrs = variant?.attributes || {};

  return [
    item.id || "",
    item.imei1 || item.serial_number || "",
    item.serial_number || "",
    item.imei1 || "",
    item.imei2 || "",
    pfd.imei3 || "",
    brand?.name || "",
    pm?.model || "",
    pfd.submodel || "",
    category?.name || "",
    subcategory?.name || "",
    variant?.variant_sku || "",
    item.srp || 0,
    item.cash_price || 0,
    item.cost_price || 0,
    attrs.ram || attrs.RAM || pfd.ram_capacity || "",
    attrs.rom || attrs.ROM || attrs.storage || pfd.rom_capacity || "",
    pfd.ram_type || specs.laptop_ram_type || "",
    pfd.rom_type || specs.laptop_ssd_type || "",
    pfd.ram_slots || specs.laptop_ram_upgradeable || "",
    warehouse?.name || "",
    item.encoder || "",
    item.purchase || "",
    item.date_encoded || "",
    item.time_encoded || "",
    pfd.product_type || "",
    variant?.condition || "",
    pfd.code || "",
    pfd.country_model || "",
    item.warranty_description || "",
    item.gpu || getField(item, pm, "gpu", "platform_gpu") || specs.laptop_gpu_dedicated || "",
    item.cpu || getField(item, pm, "cpu", "platform_cpu") || specs.laptop_processor_model || "",
    specs.display_size || "",
    specs.display_type || "",
    specs.display_refresh_rate || "",
    pfd.resolution || specs.display_resolution || "",
    pfd.os || specs.platform_os || "",
    pfd.software || "",
    specs.front_camera_specs || "",
    specs.rear_camera_specs || "",
    specs.battery_capacity || "",
    attrs.color || attrs.Color || "",
    pfd.with_charger || "",
    item.package || "",
    pfd.sim_slot || specs.body_sim_type || "",
    pfd.network_1 || "",
    pfd.network_2 || "",
    pfd.network_type || "",
    item["12_months_cc"] || 0,
    item["3_months_cc"] || 0,
    item.dp_30 || 0,
    pfd.intro || "",
    pfd.details || "",
    pfd.product_details || "",
    item.status || "",
  ];
}

/**
 * Export filtered inventory items to CSV.
 */
export function exportInventoryCSV(items, lookups) {
  const rows = items.map((item) => buildRow(item, lookups));

  const csvContent = [
    CSV_HEADERS.map(escapeCSVCell).join(","),
    ...rows.map((row) => row.map(escapeCSVCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `inventory_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}