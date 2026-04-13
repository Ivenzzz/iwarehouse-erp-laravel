import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Search, Send, MapPin, Calendar, FileText, X } from "lucide-react";
import { addDays, format } from "date-fns";
import ProductSearchItem from "./ProductSearchItem";
import SelectedItemsList from "./SelectedItemsList";

function getInitialFormData() {
  return {
    warehouse_id: "",
    required_date: format(new Date(), "yyyy-MM-dd"),
    purpose: "Replenishment",
    notes: "",
    items: [],
  };
}

export default function CreateRequestModal({ open, onOpenChange, onSubmit, warehouses = [], purposes = [] }) {
  const [formData, setFormData] = useState(getInitialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const latestCatalogRequestRef = useRef(0);

  const warehouseOptions = warehouses.map((w) => ({ value: String(w.id), label: w.name }));

  const loadCatalog = async (query) => {
    if (!formData.warehouse_id) {
      return;
    }

    const requestId = latestCatalogRequestRef.current + 1;
    latestCatalogRequestRef.current = requestId;

    setLoadingCatalog(true);
    try {
      const response = await axios.get(route("stock-requests.catalog"), {
        params: { search: query, limit: 50, warehouse_id: Number(formData.warehouse_id) },
      });
      if (requestId !== latestCatalogRequestRef.current) {
        return;
      }
      setCatalog(response.data?.items || []);
    } finally {
      if (requestId === latestCatalogRequestRef.current) {
        setLoadingCatalog(false);
      }
    }
  };

  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (!formData.warehouse_id || trimmed.length < 2) {
      latestCatalogRequestRef.current += 1;
      setLoadingCatalog(false);
      setCatalog([]);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      loadCatalog(trimmed);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [formData.warehouse_id, searchTerm]);

  const filteredVariants = useMemo(() => catalog, [catalog]);

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
            brand: variant.brand || "",
            model: variant.model || "",
            variant_sku: variant.variant_sku || "",
            variant_name: variant.variant_name || "",
            condition: variant.condition || "Brand New",
            variant_attributes: variant.variant_attributes || {},
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

  const resetState = () => {
    setFormData(getInitialFormData());
    setSearchTerm("");
    setCatalog([]);
  };

  const handleSubmit = () => {
    const requiredAt = new Date(`${formData.required_date}T00:00:00`).toISOString();

    onSubmit({
      warehouse_id: Number(formData.warehouse_id),
      required_at: requiredAt,
      purpose: formData.purpose,
      notes: formData.notes,
      items: formData.items.map((item) => ({
        variant_id: Number(item.variant_id),
        quantity: Number(item.quantity),
        reason: item.reason,
      })),
    });

    onOpenChange(false);
    resetState();
  };

  const purposeOptions = purposes.length > 0 ? purposes : ["Replenishment"];

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
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin size={12} /> Store / Branch</Label>
              <Combobox
                options={warehouseOptions}
                value={String(formData.warehouse_id || "")}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, warehouse_id: value }));
                  setCatalog([]);
                }}
                placeholder="Select Branch"
                className="h-9 bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Calendar size={12} /> Required Date</Label>
              <div className="flex gap-2">
                <Input type="date" className="h-9 bg-white text-gray-900 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 flex-1" value={formData.required_date} onChange={(e) => setFormData((prev) => ({ ...prev, required_date: e.target.value }))} />
              </div>
              <div className="flex gap-1 mt-1">
                <button onClick={() => setDateQuick("today")} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">Today</button>
                <button onClick={() => setDateQuick("tomorrow")} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">Tomorrow</button>
                <button onClick={() => setDateQuick("nextWeek")} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">Next Week</button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1"><FileText size={12} /> Request Purpose (Default)</Label>
              <Select value={formData.purpose} onValueChange={(value) => setFormData((prev) => ({ ...prev, purpose: value }))}>
                <SelectTrigger className="h-9 bg-white text-gray-900 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
                  {purposeOptions.map((purpose) => <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>)}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="pl-9 bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!formData.warehouse_id ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500"><p>Please select a branch first to view catalog.</p></div>
              ) : loadingCatalog ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500"><p>Loading catalog...</p></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                  {filteredVariants.map((variant) => (
                    <ProductSearchItem key={variant.id} variant={variant} onAdd={() => handleAddItem(variant)} cartQty={getCatalogItemCartQty(variant)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-[35%] bg-white dark:bg-gray-800 flex flex-col shadow-xl z-10 h-full border-l border-gray-200 dark:border-gray-700">
            <SelectedItemsList items={formData.items} onUpdate={updateCartItem} onRemove={removeCartItem} globalPurpose={formData.purpose} />

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 shrink-0">
              <div className="flex justify-between items-center mb-4 text-sm text-gray-600 dark:text-gray-300">
                <span>Total Items: {formData.items.length}</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{formData.items.reduce((acc, item) => acc + (item.quantity || 0), 0)} Units</span>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 w-full" onClick={handleSubmit} disabled={formData.items.length === 0 || !formData.warehouse_id}>
                <Send className="w-4 h-4 mr-2" /> Submit Request
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
