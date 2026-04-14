export const getSupplierDisplayName = (supplier) =>
  supplier?.master_profile?.trade_name ||
  supplier?.master_profile?.legal_business_name ||
  supplier?.supplier_code ||
  "Unknown";
