import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";

export default function ProductSearch({
  searchTerm,
  setSearchTerm,
  searchInputRef,
  selectedWarehouse,
  warehouses,
  availableInventory,
  variants,
  productMasters,
  brands,
}) {
  const filteredInventory = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const searchLower = searchTerm.toLowerCase();
    return availableInventory
      .filter((item) => {
        const variant = variants.find((v) => v.id === item.variant_id);
        const product = productMasters.find((p) => p.id === item.product_master_id);
        const brand = brands.find((b) => b.id === product?.brand_id);

        return (
          item.imei1?.toLowerCase().includes(searchLower) ||
          item.imei2?.toLowerCase().includes(searchLower) ||
          item.serial_number?.toLowerCase().includes(searchLower) ||
          item.warranty_description?.toLowerCase().includes(searchLower) ||
          item.package?.toLowerCase().includes(searchLower) ||
          item.item_description?.toLowerCase().includes(searchLower) ||
          variant?.condition?.toLowerCase().includes(searchLower) ||
          variant?.variant_sku?.toLowerCase().includes(searchLower) ||
          variant?.variant_name?.toLowerCase().includes(searchLower) ||
          product?.name?.toLowerCase().includes(searchLower) ||
          product?.master_sku?.toLowerCase().includes(searchLower) ||
          brand?.name?.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 10);
  }, [searchTerm, availableInventory, variants, productMasters, brands]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          Search Products
          {selectedWarehouse && (
            <Badge variant="outline" className="ml-2">
              {warehouses.find((w) => w.id === selectedWarehouse)?.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search by IMEI, Serial Number, SKU, or Product Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
            disabled={!selectedWarehouse}
          />
        </div>

        {!selectedWarehouse && (
          <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
            <Package className="w-4 h-4 inline mr-1" />
            Please wait for warehouse to be set from active session...
          </div>
        )}

        {searchTerm && filteredInventory.length === 0 && selectedWarehouse && (
          <div className="mt-4 text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No products found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}