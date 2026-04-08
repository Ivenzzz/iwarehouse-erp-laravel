import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Barcode, Download, Pencil, QrCode, Trash2, Upload, Warehouse as WarehouseIcon } from "lucide-react";
import { Head, router, usePage } from "@inertiajs/react";

import InventoryKPIs from "@/features/inventory/components/InventoryKPIs";
import InventoryItemDetailsDialog from "@/features/inventory/components/InventoryItemDetailsDialog";
import InventoryTable from "@/features/inventory/components/InventoryTable";
import BatchDeleteDialog from "@/features/inventory/dialogs/BatchDeleteDialog";
import BatchUpdateDialog from "@/features/inventory/dialogs/BatchUpdateDialog";
import BatchWarehouseDialog from "@/features/inventory/dialogs/BatchWarehouseDialog";
import ImportInventoryItemsDialog from "@/features/inventory/dialogs/ImportInventoryItemsDialog";
import { printInventoryBarcodes, printInventoryQRStickers } from "@/features/inventory/services/inventoryPrintService";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { usePageToasts } from "@/shared/hooks/use-page-toasts";
import { toast } from "@/shared/hooks/use-toast";
import AppShell from "@/shared/layouts/AppShell";

const RELOAD_PROPS = [
  "inventory",
  "filters",
  "perPageOptions",
  "exactLookup",
  "productMasters",
  "variants",
  "warehouses",
  "brands",
  "categories",
  "subcategories",
];

export default function InventoryPage({
  inventory,
  filters,
  perPageOptions,
  exactLookup,
  productMasters,
  variants,
  warehouses,
  brands,
  categories,
  subcategories,
}) {
  const { errors } = usePage().props;
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [batchWarehouseOpen, setBatchWarehouseOpen] = useState(false);
  const [batchUpdateOpen, setBatchUpdateOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchWarehouseState, setBatchWarehouseState] = useState({ isLoading: false, result: null });
  const [batchUpdateState, setBatchUpdateState] = useState({ isLoading: false, result: null });
  const [batchDeleteState, setBatchDeleteState] = useState({ isLoading: false, result: null });
  const [refreshToken, setRefreshToken] = useState(0);

  const visibleItems = inventory.data ?? [];

  usePageToasts([errors?.file, errors?.importToken], "destructive");

  useEffect(() => {
    setSelectedItems([]);
  }, [
    inventory.current_page,
    inventory.per_page,
    filters.search,
    filters.location,
    filters.status,
    filters.brand,
    filters.category,
    filters.stockAge,
    filters.sort,
    filters.direction,
  ]);

  const visitInventory = (params = {}) => {
    router.get(route("inventory.index"), {
      search: params.search ?? filters.search,
      location: params.location ?? filters.location,
      status: params.status ?? filters.status,
      brand: params.brand ?? filters.brand,
      category: params.category ?? filters.category,
      stockAge: params.stockAge ?? filters.stockAge,
      sort: params.sort ?? filters.sort,
      direction: params.direction ?? filters.direction,
      perPage: params.perPage ?? filters.perPage,
      page: params.page,
    }, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  const refreshInventoryData = () => {
    router.reload({
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
    });
    setRefreshToken((current) => current + 1);
  };

  const getSelectedInventoryItems = () => visibleItems.filter((item) => selectedItems.includes(item.id));
  const getAvailableSelectedItems = () => visibleItems.filter((item) => selectedItems.includes(item.id) && item.status === "available");

  const exportInventory = () => {
    window.location.href = route("inventory.export", {
      search: filters.search,
      location: filters.location,
      status: filters.status,
      brand: filters.brand,
      category: filters.category,
      stockAge: filters.stockAge,
      sort: filters.sort,
      direction: filters.direction,
      perPage: filters.perPage,
    });
  };

  const handleBatchWarehouse = async (itemIds, targetWarehouseId) => {
    setBatchWarehouseState({ isLoading: true, result: null });

    try {
      const response = await axios.post(route("inventory.batch.warehouse"), {
        itemIds,
        targetWarehouseId,
      });
      setBatchWarehouseState({ isLoading: false, result: response.data });
      setSelectedItems([]);
      refreshInventoryData();
      toast({ description: `${response.data.succeeded?.length || 0} item(s) moved successfully.` });
    } catch (error) {
      setBatchWarehouseState({ isLoading: false, result: { succeeded: [], failed: [{ id: 0, error: error.response?.data?.message || error.message || "Warehouse move failed." }] } });
      toast({ variant: "destructive", description: error.response?.data?.message || error.message || "Warehouse move failed." });
    }
  };

  const handleBatchUpdate = async (itemIds, updateFields) => {
    setBatchUpdateState({ isLoading: true, result: null });

    try {
      const response = await axios.post(route("inventory.batch.update"), {
        itemIds,
        updateFields,
      });
      setBatchUpdateState({ isLoading: false, result: response.data });
      setSelectedItems([]);
      refreshInventoryData();
      toast({ description: `${response.data.succeeded?.length || 0} item(s) updated successfully.` });
    } catch (error) {
      setBatchUpdateState({ isLoading: false, result: { succeeded: [], failed: [{ id: 0, error: error.response?.data?.message || error.message || "Batch update failed." }], skippedConflicts: [] } });
      toast({ variant: "destructive", description: error.response?.data?.message || error.message || "Batch update failed." });
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleteState({ isLoading: true, result: null });

    try {
      const response = await axios.delete(route("inventory.batch.delete"), {
        data: { itemIds: selectedItems },
      });
      setBatchDeleteState({ isLoading: false, result: response.data });
      setSelectedItems([]);
      refreshInventoryData();
      toast({ description: `${response.data.deleted || 0} item(s) deleted successfully.` });
    } catch (error) {
      setBatchDeleteState({ isLoading: false, result: { deleted: 0, failed: 1, errors: [{ id: 0, reason: error.response?.data?.message || error.message || "Batch delete failed." }] } });
      toast({ variant: "destructive", description: error.response?.data?.message || error.message || "Batch delete failed." });
    }
  };

  const tablePagination = useMemo(() => ({
    currentPage: inventory.current_page,
    from: inventory.from,
    lastPage: inventory.last_page,
    links: inventory.links,
    perPage: inventory.per_page,
    to: inventory.to,
    total: inventory.total,
  }), [inventory]);

  return (
    <AppShell title="Inventory">
      <Head title="Inventory" />

      <ImportInventoryItemsDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={refreshInventoryData} />
      <InventoryItemDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        item={selectedItem}
        productMasters={productMasters}
        variants={variants}
        brands={brands}
        categories={categories}
        subcategories={subcategories}
        warehouses={warehouses}
      />
      <BatchWarehouseDialog
        open={batchWarehouseOpen}
        onOpenChange={setBatchWarehouseOpen}
        selectedInventoryItems={getAvailableSelectedItems()}
        warehouses={warehouses}
        onConfirm={handleBatchWarehouse}
        isUpdating={batchWarehouseState.isLoading}
        result={batchWarehouseState.result}
        onReset={() => setBatchWarehouseState({ isLoading: false, result: null })}
      />
      <BatchUpdateDialog
        open={batchUpdateOpen}
        onOpenChange={setBatchUpdateOpen}
        selectedCount={selectedItems.length}
        selectedItemIds={selectedItems}
        variants={variants}
        warehouses={warehouses}
        onConfirm={handleBatchUpdate}
        isUpdating={batchUpdateState.isLoading}
        result={batchUpdateState.result}
        onReset={() => setBatchUpdateState({ isLoading: false, result: null })}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        selectedCount={selectedItems.length}
        onConfirm={handleBatchDelete}
        isDeleting={batchDeleteState.isLoading}
        result={batchDeleteState.result}
        onReset={() => setBatchDeleteState({ isLoading: false, result: null })}
      />

      <div className="mx-auto flex w-full flex-col gap-6">
        <section className="rounded-xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:bg-slate-950">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Inventory</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track and manage inventory items under the Warehouse section.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedItems.length > 0 ? (
                <>
                  <Button variant="outline" onClick={() => printInventoryBarcodes({ items: getSelectedInventoryItems(), variants, productMasters, brands, categories })}>
                    <Barcode className="size-4" />
                    Print Barcodes ({selectedItems.length})
                  </Button>
                  <Button variant="outline" onClick={() => printInventoryQRStickers({ items: getSelectedInventoryItems(), variants, productMasters, brands, categories })}>
                    <QrCode className="size-4" />
                    Print QR Codes ({selectedItems.length})
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setBatchWarehouseOpen(true);
                    setBatchWarehouseState({ isLoading: false, result: null });
                  }}>
                    <WarehouseIcon className="size-4" />
                    Move Warehouse ({getAvailableSelectedItems().length})
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setBatchUpdateOpen(true);
                    setBatchUpdateState({ isLoading: false, result: null });
                  }}>
                    <Pencil className="size-4" />
                    Batch Update ({selectedItems.length})
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    setBatchDeleteOpen(true);
                    setBatchDeleteState({ isLoading: false, result: null });
                  }}>
                    <Trash2 className="size-4" />
                    Delete ({selectedItems.length})
                  </Button>
                </>
              ) : null}

              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="size-4" />
                Import Inventory Items
              </Button>
              <Button onClick={exportInventory}>
                <Download className="size-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <InventoryKPIs refreshToken={refreshToken} />

            <Card className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <CardContent className="p-4">
                <InventoryTable
                  items={visibleItems}
                  filters={filters}
                  warehouses={warehouses}
                  brands={brands}
                  categories={categories}
                  pagination={tablePagination}
                  perPageOptions={perPageOptions}
                  exactLookup={exactLookup}
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  onViewDetails={(item) => {
                    setSelectedItem(item);
                    setDetailsOpen(true);
                  }}
                  onVisit={visitInventory}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
