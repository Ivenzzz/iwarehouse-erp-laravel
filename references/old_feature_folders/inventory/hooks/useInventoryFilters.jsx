import { useState, useMemo } from "react";

export function useInventoryFilters(inventory, productMasters, variants, warehouses, brands, categories, suppliers) {
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sortField, setSortField] = useState("encoded_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const filteredAndSortedInventory = useMemo(() => {
    let filtered = inventory.filter((item) => {
      const productMaster = productMasters.find((pm) => pm.id === item.product_master_id);
      const variant = variants.find((v) => v.id === item.variant_id);
      const warehouse = warehouses.find((w) => w.id === item.warehouse_id);
      const brand = brands.find((b) => b.id === productMaster?.brand_id);
      const category = categories.find((c) => c.id === productMaster?.category_id);

      const matchesSearch =
        !searchTerm ||
        productMaster?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        productMaster?.master_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variant?.variant_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.imei1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.imei2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWarehouse = warehouseFilter === "all" || item.warehouse_id === warehouseFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || productMaster?.category_id === categoryFilter;
      const matchesBrand = brandFilter === "all" || productMaster?.brand_id === brandFilter;
      const matchesCondition = conditionFilter === "all" || variant?.condition === conditionFilter;
      const matchesSupplier = supplierFilter === "all" || item.supplier_id === supplierFilter;

      return (
        matchesSearch &&
        matchesWarehouse &&
        matchesStatus &&
        matchesCategory &&
        matchesBrand &&
        matchesCondition &&
        matchesSupplier
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;

      if (sortField === "encoded_date") {
        aValue = a.encoded_date ? new Date(a.encoded_date).getTime() : 0;
        bValue = b.encoded_date ? new Date(b.encoded_date).getTime() : 0;
      } else if (sortField === "cash_price") {
        aValue = a.cash_price || 0;
        bValue = b.cash_price || 0;
      } else if (sortField === "cost_price") {
        aValue = a.cost_price || 0;
        bValue = b.cost_price || 0;
      } else {
        return 0;
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [
    inventory,
    productMasters,
    variants,
    warehouses,
    brands,
    categories,
    searchTerm,
    warehouseFilter,
    statusFilter,
    categoryFilter,
    brandFilter,
    conditionFilter,
    supplierFilter,
    sortField,
    sortDirection,
  ]);

  return {
    searchTerm,
    setSearchTerm,
    warehouseFilter,
    setWarehouseFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    brandFilter,
    setBrandFilter,
    conditionFilter,
    setConditionFilter,
    supplierFilter,
    setSupplierFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredAndSortedInventory,
  };
}