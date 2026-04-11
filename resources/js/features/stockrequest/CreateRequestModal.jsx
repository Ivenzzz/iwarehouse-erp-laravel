import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Search, Send, MapPin, Calendar, FileText, X, Filter } from "lucide-react";
import { format, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import { useStockData } from "./useStockData";
import ProductSearchItem from "./ProductSearchItem";
import SelectedItemsList from "./SelectedItemsList";
import {
  buildRequestedSpecFromVariant,
  formatRequestedSpec,
  getVariantCondition,
  getVariantRam,
  getVariantRom,
} from "./stockRequestItemUtils";

const PURPOSE_OPTIONS = [
  "Replenishment",
  "Display Refill",
  "Fast-Moving Refill",
  "Customer Reservation",
  "Pre-Event Stock",
  "New Store Opening",
  "Other",
];

function getInitialFormData() {
  return {
    branch_id: "",
    required_date: format(new Date(), "yyyy-MM-dd"),
    purpose: "Replenishment",
    items: [],
  };
}


// MODAL
export default function CreateRequestModal({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState(getInitialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouse.list(),
    initialData: [],
  });

  const { data: productMasters = [] } = useQuery({
    queryKey: ["productMasters"],
    queryFn: () => base44.entities.ProductMaster.list(),
    initialData: [],
  });

  const { data: productVariants = [] } = useQuery({
    queryKey: ["productVariants"],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.ProductBrand.list(),
    initialData: [],
  });

  const stockData = useStockData(formData.branch_id);
  const mainWarehouse = warehouses.find((w) => w.warehouse_type === "main_warehouse");

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: w.name,
  }));

  const variantCatalog = useMemo(() => {
    return productVariants
      .map((variant) => {
        const requestedSpec = buildRequestedSpecFromVariant(variant);
        const productMaster = productMasters.find((product) => product.id === variant.product_master_id);
        const brand = brands.find((entry) => entry.id === productMaster?.brand_id);

        return {
          ...variant,
          requested_spec: requestedSpec,
          display_label: formatRequestedSpec(requestedSpec) || variant.variant_name || variant.variant_sku,
          productMaster,
          brand,
          search_text: [
            brand?.name || "",
            productMaster?.name || "",
            productMaster?.model || "",
            variant.variant_name || "",
            variant.variant_sku || "",
            getVariantRam(variant),
            getVariantRom(variant),
            getVariantCondition(variant),
            getVariantCondition(variant) === "Brand New" ? "bn" : "",
            getVariantCondition(variant) === "Certified Pre-Owned" ? "cpo" : "",
          ]
            .join(" ")
            .toLowerCase(),
        };
      })
      .filter((variant) => variant.productMaster);
  }, [productVariants, productMasters, brands]);

  const filteredVariants = useMemo(() => {
    let results = [...variantCatalog];

    if (searchTerm) {
      const processedTerm = searchTerm.toLowerCase().replace(/gb/g, "").replace(/\//g, " ");
      const searchTokens = processedTerm.split(" ").filter((token) => token.length > 0);

      results = results.filter((catalogItem) =>
        searchTokens.every((token) => catalogItem.search_text.includes(token))
      );
    }

    if (selectedFilter !== "All" && formData.branch_id) {
      results = results.filter((catalogItem) => {
        const currentStock = stockData.getAggregateVariantStock([catalogItem.id], formData.branch_id);
        const whStock = stockData.getAggregateVariantStock([catalogItem.id], mainWarehouse?.id);
        const adsMetrics = stockData.getAggregateADSMetrics([catalogItem.id], formData.branch_id);
        const avgADS = (adsMetrics.ads7 + adsMetrics.ads14) / 2;
        const sampleVariantName = `${catalogItem.variant_name || ""}`.toLowerCase();

        switch (selectedFilter) {
          case "Fast Moving":
            return avgADS >= 1.0;
          case "Slow Moving":
            return avgADS < 0.5;
          case "Zero Stock at Branch":
            return currentStock === 0;
          case "Low Stock at Warehouse":
            return whStock <= 10;
          case "Low Stock at Branch":
            return currentStock <= 5;
          case "High Value Items":
            return (
              catalogItem.productMaster?.category_id === "High-value Items" ||
              sampleVariantName.includes("pro") ||
              sampleVariantName.includes("ultra")
            );
          default:
            return true;
        }
      });
    }

    results.sort((a, b) => {
      const isBrandNewA = (a.requested_spec?.condition || "Brand New") === "Brand New";
      const isBrandNewB = (b.requested_spec?.condition || "Brand New") === "Brand New";

      if (isBrandNewA && !isBrandNewB) return -1;
      if (!isBrandNewA && isBrandNewB) return 1;
      return (a.display_label || "").localeCompare(b.display_label || "");
    });

    return results.slice(0, 50);
  }, [searchTerm, selectedFilter, variantCatalog, formData.branch_id, stockData, mainWarehouse?.id]);

  const setDateQuick = (type) => {
    let date = new Date();
    if (type === "tomorrow") date = addDays(date, 1);
    if (type === "nextWeek") date = addDays(date, 7);
    setFormData((prev) => ({ ...prev, required_date: format(date, "yyyy-MM-dd") }));
  };

  const handleAddItem = (variant) => {
    setFormData((prev) => {
      const existingIndex = prev.items.findIndex((item) => item.variant_id === variant.id);

      if (existingIndex > -1) {
        const updatedItems = [...prev.items];
        updatedItems[existingIndex].quantity += 1;
        return { ...prev, items: updatedItems };
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            variant_id: variant.id,
            brand: variant.brand?.name || variant.brand_name || '',
            model: variant.productMaster?.model || variant.model || '',
            variant_sku: variant.variant_sku || '',
            variant_name: variant.variant_name || '',
            condition: getVariantCondition(variant),
            variant_attributes: variant.attributes || {},
            quantity: 1,
            reason: prev.purpose,
          },
        ],
      };
    });
  };

  const updateCartItem = (index, updates) => {
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], ...updates };
      return { ...prev, items: updatedItems };
    });
  };

  const removeCartItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const getCatalogItemCartQty = (variant) => {
    const cartItem = formData.items.find((item) => item.variant_id === variant.id);
    return cartItem?.quantity || 0;
  };

  const handleSubmit = () => {
    const requiredDateIso = new Date(`${formData.required_date}T00:00:00`).toISOString();
    onSubmit({
      ...formData,
      required_date: requiredDateIso,
      status: "pending",
    });
    onOpenChange(false);
    setFormData(getInitialFormData());
    setSearchTerm("");
    setSelectedFilter("All");
  };

  const filterOptions = [
    "All",
    "Fast Moving",
    "Slow Moving",
    "Zero Stock at Branch",
    "Low Stock at Branch",
    "Low Stock at Warehouse",
    "High Value Items",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm z-20 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Create Stock Request</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MapPin size={12} /> Store / Branch
              </Label>
              <Combobox
                options={warehouseOptions}
                value={formData.branch_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, branch_id: value }))}
                placeholder="Select Branch"
                className="h-9 bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Calendar size={12} /> Required Date
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  className="h-9 bg-white text-gray-900 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 flex-1"
                  value={formData.required_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, required_date: e.target.value }))}
                />
              </div>
              <div className="flex gap-1 mt-1">
                <button onClick={() => setDateQuick("today")} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">Today</button>
                <button onClick={() => setDateQuick("tomorrow")} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">Tomorrow</button>
                <button onClick={() => setDateQuick("nextWeek")} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">Next Week</button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FileText size={12} /> Request Purpose (Default)
              </Label>
              <Select value={formData.purpose} onValueChange={(value) => setFormData((prev) => ({ ...prev, purpose: value }))}>
                <SelectTrigger className="h-9 bg-white text-gray-900 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
                  {PURPOSE_OPTIONS.map((purpose) => (
                    <SelectItem key={purpose} value={purpose}>
                      {purpose}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden h-full relative">
          <div className="w-[65%] flex flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-900/40 h-full overflow-hidden">
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  placeholder="Search SKU, Name, Brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400"
                />
              </div>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-[200px] bg-white text-gray-900 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                  <div className="flex items-center gap-2 truncate">
                    <Filter size={14} className="text-gray-500 dark:text-gray-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
                  {filterOptions.map((filterName) => (
                    <SelectItem key={filterName} value={filterName}>
                      {filterName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!formData.branch_id ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <p>Please select a branch first to view stock data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                  {filteredVariants.map((variant) => (
                    <ProductSearchItem
                      key={variant.id}
                      variant={variant}
                      productMaster={variant.productMaster}
                      brand={variant.brand}
                      branchId={formData.branch_id}
                      warehouses={warehouses}
                      stockData={stockData}
                      onAdd={() => handleAddItem(variant)}
                      cartQty={getCatalogItemCartQty(variant)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-[35%] bg-white dark:bg-gray-800 flex flex-col shadow-xl z-10 h-full border-l border-gray-200 dark:border-gray-700">
            <SelectedItemsList
              items={formData.items}
              onUpdate={updateCartItem}
              onRemove={removeCartItem}
              globalPurpose={formData.purpose}
            />

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 shrink-0">
              <div className="flex justify-between items-center mb-4 text-sm text-gray-600 dark:text-gray-300">
                <span>Total Items: {formData.items.length}</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  {formData.items.reduce((acc, item) => acc + item.quantity, 0)} Units
                </span>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 w-full"
                onClick={handleSubmit}
                disabled={formData.items.length === 0 || !formData.branch_id}
              >
                <Send className="w-4 h-4 mr-2" /> Submit Request
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}