import React, { useState, useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Barcode, QrCode, Warehouse, Pencil, Upload, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useInventoryData } from "@/components/inventory/hooks/useInventoryData";
import { useBatchWarehouseUpdate } from "@/components/inventory/hooks/useBatchWarehouseUpdate";
import { BatchWarehouseDialog } from "@/components/inventory/dialogs/BatchWarehouseDialog";
import { useBatchUpdate } from "@/components/inventory/hooks/useBatchUpdate";
import { BatchUpdateDialog } from "@/components/inventory/dialogs/BatchUpdateDialog";
import { useBatchDelete } from "@/components/inventory/hooks/useBatchDelete";
import { BatchDeleteDialog } from "@/components/inventory/dialogs/BatchDeleteDialog";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { InventoryKPIs } from "@/components/inventory/InventoryKPIs";
import { InventoryTanstackTable } from "@/components/inventory/InventoryTanstackTable";
import InventoryItemDetailsDialog from "@/components/inventory/InventoryItemDetailsDialog";
import { printInventoryBarcodes, printInventoryQRStickers } from "@/components/inventory/services/inventoryPrintService";
import { exportInventoryCSV } from "@/components/inventory/services/inventoryExportService";
import { ImportInventoryItemsDialog } from "@/components/inventory/dialogs/ImportInventoryItemsDialog";
import { createDefaultInventoryFilters } from "@/components/inventory/services/inventoryQueryService";

export default function Inventory() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBatchWarehouseDialog, setShowBatchWarehouseDialog] = useState(false);
  const [showBatchUpdateDialog, setShowBatchUpdateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [filters, setFilters] = useState(createDefaultInventoryFilters);
  const effectiveFilters = useMemo(() => filters, [filters]);

  const {
    inventory,
    localInventory,
    productMasters,
    variants,
    warehouses,
    brands,
    categories,
    subcategories,
    isLoading,
    isSearchingFullInventory,
    exactLookupActive,
    exactLookupFoundCount,
  } = useInventoryData(effectiveFilters);

  const batchWarehouse = useBatchWarehouseUpdate({
    onSuccess: () => setSelectedItems([]),
  });

  const batchUpdate = useBatchUpdate({
    onSuccess: () => setSelectedItems([]),
  });

  const batchDelete = useBatchDelete({
    onSuccess: () => setSelectedItems([]),
  });

  // Build variant map for batch update (variant_id -> variant object)
  const variantMap = useMemo(() => {
    const m = new Map();
    variants.forEach((v) => m.set(v.id, v));
    return m;
  }, [variants]);

  const isWarehouseUser = currentUser?.department_role === "Warehouse" || currentUser?.department_role === "System Admin";

  // Build lookup maps for export
  const exportLookups = useMemo(() => {
    const pmMap = new Map();
    productMasters.forEach((p) => pmMap.set(p.id, p));
    const variantMap = new Map();
    variants.forEach((v) => variantMap.set(v.id, v));
    const warehouseMap = new Map();
    warehouses.forEach((w) => warehouseMap.set(w.id, w));
    const brandMap = new Map();
    brands.forEach((b) => brandMap.set(b.id, b));
    const categoryMap = new Map();
    categories.forEach((c) => categoryMap.set(c.id, c));
    const subcategoryMap = new Map();
    (subcategories || []).forEach((s) => subcategoryMap.set(s.id, s));
    return { pmMap, variantMap, warehouseMap, brandMap, categoryMap, subcategoryMap };
  }, [productMasters, variants, warehouses, brands, categories, subcategories]);

  const viewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
  };

  const exportToCSV = () => {
    exportInventoryCSV(inventory, exportLookups);
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  const getProductName = (item) => {
    const pm = productMasters.find((p) => p.id === item.product_master_id);
    const variant = variants.find((v) => v.id === item.variant_id);
    const brand = brands.find((b) => b.id === pm?.brand_id);
    return `${brand?.name || ""} ${pm?.model || ""} ${variant?.variant_name || ""}`.trim();
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    return warehouse?.name || "N/A";
  };

  const selectedProductName = selectedItem ? getProductName(selectedItem) : "";
  const selectedWarehouseName = selectedItem ? getWarehouseName(selectedItem.warehouse_id) : "";

  const getSelectedInventoryItems = () => {
    return inventory.filter(item => selectedItems.includes(item.id));
  };

  // Only "available" (active) items eligible for batch warehouse move
  const getAvailableSelectedItems = () => {
    return inventory.filter(item => selectedItems.includes(item.id) && item.status === "available");
  };

  const handlePrintBarcodes = () => {
    const items = getSelectedInventoryItems();
    printInventoryBarcodes({ items, variants, productMasters, brands, categories });
  };

  const handlePrintQRCodes = async () => {
    const items = getSelectedInventoryItems();
    await printInventoryQRStickers({ items, variants, productMasters, brands, categories });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Inventory Management
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Track and manage all inventory items
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <>
              <Button
                onClick={handlePrintBarcodes}
                variant="outline"
                className="gap-2 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Barcode className="w-4 h-4" />
                Print Barcodes ({selectedItems.length})
              </Button>

              <Button
                onClick={handlePrintQRCodes}
                variant="outline"
                className="gap-2 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <QrCode className="w-4 h-4" />
                Print QR Codes ({selectedItems.length})
              </Button>

              {currentUser?.role === "admin" && getAvailableSelectedItems().length > 0 && (
                <Button
                  onClick={() => {
                    batchWarehouse.reset();
                    setShowBatchWarehouseDialog(true);
                  }}
                  variant="outline"
                  className="gap-2 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Warehouse className="w-4 h-4" />
                  Move Warehouse ({getAvailableSelectedItems().length})
                </Button>
              )}

              {isWarehouseUser && (
                <Button
                  onClick={() => {
                    batchUpdate.reset();
                    setShowBatchUpdateDialog(true);
                  }}
                  variant="outline"
                  className="gap-2 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Pencil className="w-4 h-4" />
                  Batch Update ({selectedItems.length})
                </Button>
              )}

              {currentUser?.role === "admin" && (
                <Button
                  onClick={() => {
                    batchDelete.reset();
                    setShowBatchDeleteDialog(true);
                  }}
                  variant="outline"
                  className="gap-2 border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedItems.length})
                </Button>
              )}
            </>
          )}

          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="gap-2 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Upload className="w-4 h-4" />
            Import Inventory Items
          </Button>

          <Button
            onClick={exportToCSV}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <InventoryKPIs />

      <Card className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <CardContent className="p-4">
          <InventoryTanstackTable
            items={inventory}
            localItems={localInventory}
            productMasters={productMasters}
            variants={variants}
            warehouses={warehouses}
            brands={brands}
            categories={categories}
            onViewDetails={viewDetails}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            filters={filters}
            onFiltersChange={setFilters}
            isSearchingFullInventory={isSearchingFullInventory}
            exactLookupActive={exactLookupActive}
            exactLookupFoundCount={exactLookupFoundCount}
          />
        </CardContent>
      </Card>

      <InventoryItemDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        item={selectedItem}
        productMasters={productMasters}
        variants={variants}
        brands={brands}
        categories={categories}
        subcategories={subcategories}
      />

      <ImportInventoryItemsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={handleImportSuccess}
      />

      <BatchWarehouseDialog
        open={showBatchWarehouseDialog}
        onOpenChange={setShowBatchWarehouseDialog}
        selectedInventoryItems={getAvailableSelectedItems()}
        warehouses={warehouses}
        onConfirm={(itemIds, targetWarehouseId) =>
          batchWarehouse.execute({ itemIds, targetWarehouseId })
        }
        isUpdating={batchWarehouse.isUpdating}
        result={batchWarehouse.result}
        onReset={batchWarehouse.reset}
      />

      <BatchDeleteDialog
        open={showBatchDeleteDialog}
        onOpenChange={setShowBatchDeleteDialog}
        selectedCount={selectedItems.length}
        onConfirm={() => batchDelete.execute({ itemIds: selectedItems })}
        isDeleting={batchDelete.isDeleting}
        result={batchDelete.result}
        onReset={batchDelete.reset}
      />

      <BatchUpdateDialog
        open={showBatchUpdateDialog}
        onOpenChange={setShowBatchUpdateDialog}
        selectedCount={selectedItems.length}
        selectedItemIds={selectedItems}
        selectedInventoryItems={getSelectedInventoryItems()}
        variants={variants}
        warehouses={warehouses}
        onConfirm={(itemIds, updateFields) =>
          batchUpdate.execute({ itemIds, updateFields, options: { variantMap } })
        }
        isUpdating={batchUpdate.isUpdating}
        result={batchUpdate.result}
        onReset={batchUpdate.reset}
      />

    </div>
  );
}