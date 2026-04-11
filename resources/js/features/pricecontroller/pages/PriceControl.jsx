import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import { DollarSign } from "lucide-react";

import PriceConfirmDialog from "@/features/pricecontroller/PriceConfirmDialog";
import PriceControllerSearchBar from "@/features/pricecontroller/PriceControllerSearchBar";
import PriceControllerTable from "@/features/pricecontroller/PriceControllerTable";
import PriceUpdatePanel from "@/features/pricecontroller/PriceUpdatePanel";
import { printInventoryQRStickers } from "@/features/inventory/services/inventoryPrintService";
import { toast } from "@/shared/hooks/use-toast";
import AppShell from "@/shared/layouts/AppShell";

const RELOAD_PROPS = ["inventory", "filters", "hasSearched", "selectedVariant", "warehouses", "statusOptions", "perPageOptions"];

export default function PriceControl({
  inventory,
  filters,
  hasSearched,
  selectedVariant,
  warehouses,
  statusOptions,
  perPageOptions,
}) {
  const inventoryItems = inventory?.data ?? [];
  const [variantOptions, setVariantOptions] = useState(selectedVariant ? [selectedVariant] : []);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState({
    newCashPrice: null,
    newSrp: null,
    newCashPriceFormatted: null,
    newSrpFormatted: null,
  });
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setSelectedIds([]);
  }, [
    inventory?.current_page,
    filters.mode,
    filters.variant_id,
    filters.product_master_id,
    filters.variant_ram,
    filters.variant_rom,
    filters.condition,
    filters.identifier,
    filters.warehouse,
    filters.status,
    filters.sort,
    filters.direction,
    filters.perPage,
  ]);

  useEffect(() => {
    if (selectedVariant) {
      setVariantOptions((current) => {
        const withoutSelected = current.filter((variant) => variant.id !== selectedVariant.id);
        return [selectedVariant, ...withoutSelected].slice(0, 15);
      });
    }
  }, [selectedVariant]);

  const pagination = useMemo(() => ({
    currentPage: inventory?.current_page ?? 1,
    from: inventory?.from,
    lastPage: inventory?.last_page ?? 1,
    perPage: inventory?.per_page ?? filters.perPage,
    to: inventory?.to,
    total: inventory?.total ?? 0,
  }), [filters.perPage, inventory]);

  const visitPriceControl = useCallback((params = {}) => {
    const valueFor = (key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? params[key] : filters[key]
    );

    router.get(route("price-control.index"), {
      mode: valueFor("mode"),
      variant_id: valueFor("variant_id"),
      product_master_id: valueFor("product_master_id"),
      variant_ram: valueFor("variant_ram"),
      variant_rom: valueFor("variant_rom"),
      condition: valueFor("condition"),
      identifier: valueFor("identifier"),
      warehouse: valueFor("warehouse"),
      status: valueFor("status"),
      sort: valueFor("sort"),
      direction: valueFor("direction"),
      perPage: valueFor("perPage"),
      page: params.page,
    }, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => setIsSearching(true),
      onFinish: () => setIsSearching(false),
    });
  }, [filters]);

  const handleVariantQueryChange = useCallback(async (query) => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setVariantOptions(selectedVariant ? [selectedVariant] : []);
      return;
    }

    setIsLoadingVariants(true);

    try {
      const response = await axios.get(route("price-control.variants"), {
        params: { search: trimmed, limit: 15 },
      });
      setVariantOptions(response.data.variants ?? []);
    } catch (error) {
      toast({
        variant: "destructive",
        description: error.response?.data?.message || error.message || "Variant search failed.",
      });
    } finally {
      setIsLoadingVariants(false);
    }
  }, [selectedVariant]);

  const handleSearchByVariant = useCallback((variant) => {
    visitPriceControl({
      mode: "variant",
      variant_id: null,
      product_master_id: variant.product_master_id,
      variant_ram: variant.variant_ram || "",
      variant_rom: variant.variant_rom || "",
      condition: variant.condition || "",
      identifier: "",
      page: undefined,
    });
  }, [visitPriceControl]);

  const handleSearchByIdentifier = useCallback((identifier) => {
    visitPriceControl({
      mode: "identifier",
      variant_id: null,
      product_master_id: null,
      variant_ram: "",
      variant_rom: "",
      condition: "",
      identifier,
      page: undefined,
    });
  }, [visitPriceControl]);

  const handleToggleItem = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleToggleAll = useCallback((checked) => {
    setSelectedIds((prev) => {
      const visibleIds = inventoryItems.map((item) => item.id);

      if (checked) {
        return [...new Set([...prev, ...visibleIds])];
      }

      return prev.filter((id) => !visibleIds.includes(id));
    });
  }, [inventoryItems]);

  const handleApply = useCallback(async ({ newCashPrice, newSrp }) => {
    setIsUpdating(true);

    try {
      const response = await axios.post(route("price-control.preview"), {
        itemIds: selectedIds,
        newCashPrice,
        newSrp,
      });
      const nextPreview = response.data;

      if ((nextPreview.eligibleCount ?? 0) === 0) {
        toast({
          variant: "destructive",
          description: "No eligible selected items were found for this price update.",
        });
        return;
      }

      setPreview(nextPreview);
      setPendingUpdate({
        newCashPrice: nextPreview.newCashPrice,
        newSrp: nextPreview.newSrp,
        newCashPriceFormatted: nextPreview.newCashPriceFormatted,
        newSrpFormatted: nextPreview.newSrpFormatted,
      });
      setConfirmOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        description: error.response?.data?.message || error.message || "Price update preview failed.",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedIds]);

  const handleConfirm = useCallback(async () => {
    setIsUpdating(true);

    try {
      const response = await axios.patch(route("price-control.prices"), {
        itemIds: selectedIds,
        newCashPrice: pendingUpdate.newCashPrice,
        newSrp: pendingUpdate.newSrp,
      });
      const succeededCount = response.data.succeeded?.length ?? 0;

      setConfirmOpen(false);
      setPreview(null);
      setSelectedIds([]);

      router.reload({
        only: RELOAD_PROPS,
        preserveScroll: true,
        preserveState: true,
      });

      toast({
        description: `Successfully updated ${succeededCount} item${succeededCount !== 1 ? "s" : ""}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: error.response?.data?.message || error.message || "Price update failed.",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [pendingUpdate, selectedIds]);

  const handleExport = useCallback(() => {
    window.location.href = route("price-control.export", {
      mode: filters.mode,
      variant_id: filters.variant_id,
      product_master_id: filters.product_master_id,
      variant_ram: filters.variant_ram,
      variant_rom: filters.variant_rom,
      condition: filters.condition,
      identifier: filters.identifier,
      warehouse: filters.warehouse,
      status: filters.status,
      sort: filters.sort,
      direction: filters.direction,
    });
  }, [filters]);

  const handlePrintQr = useCallback(async () => {
    const selectedItems = inventoryItems.filter((item) => selectedIds.includes(item.id));
    await printInventoryQRStickers({ items: selectedItems });
  }, [inventoryItems, selectedIds]);

  return (
    <AppShell title="Price Control">
      <Head title="Price Control" />

      <div className="p-4 md:p-6 max-w-full mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Price Controller</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Batch update Cash Price and SRP for inventory items
            </p>
          </div>
        </div>

        <PriceControllerSearchBar
          variantOptions={variantOptions}
          selectedVariant={selectedVariant}
          onVariantQueryChange={handleVariantQueryChange}
          onSearchByVariant={handleSearchByVariant}
          onSearchByIdentifier={handleSearchByIdentifier}
          isSearching={isSearching}
          isLoadingVariants={isLoadingVariants}
        />

        {hasSearched && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isSearching
                  ? "Searching..."
                  : `${pagination.total} item${pagination.total !== 1 ? "s" : ""} found`}
              </p>
              {selectedIds.length > 0 && (
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {selectedIds.length} selected
                </p>
              )}
            </div>

            <PriceControllerTable
              items={inventoryItems}
              selectedIds={selectedIds}
              onToggleItem={handleToggleItem}
              onToggleAll={handleToggleAll}
              filters={filters}
              warehouses={warehouses}
              statusOptions={statusOptions}
              pagination={pagination}
              perPageOptions={perPageOptions}
              onVisit={visitPriceControl}
              onPrintQr={handlePrintQr}
              onExport={handleExport}
            />

            <PriceUpdatePanel
              selectedCount={selectedIds.length}
              onApply={handleApply}
              isUpdating={isUpdating}
            />
          </>
        )}

        <PriceConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          selectedCount={preview?.eligibleCount ?? selectedIds.length}
          skippedCount={preview?.skippedCount ?? 0}
          newCashPrice={pendingUpdate.newCashPrice}
          newSrp={pendingUpdate.newSrp}
          newCashPriceFormatted={pendingUpdate.newCashPriceFormatted}
          newSrpFormatted={pendingUpdate.newSrpFormatted}
          onConfirm={handleConfirm}
          isUpdating={isUpdating}
        />
      </div>
    </AppShell>
  );
}
