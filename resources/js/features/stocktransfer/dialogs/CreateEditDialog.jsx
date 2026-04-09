import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trash2, ChevronDown, ChevronUp, Package, Search, 
  ArrowRight, CheckSquare, MapPin, 
  AlertTriangle, Edit2, X, AlertCircle, Ban, Filter
} from "lucide-react";
import { calculateStockAge } from "../services/transferService";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 250;

const getInventoryAgeDate = (item) => item?.created_date || item?.created_at;

export default function CreateEditDialog({
  open,
  onOpenChange,
  editingTransfer,
  transferForm,
  setTransferForm,
  onSubmit,
  warehouses,
  searchTransferProducts,
  fetchTransferProductInventory,
}) {
  // --- LOCAL UI STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [lastSuccessfulProducts, setLastSuccessfulProducts] = useState([]);
  const [productSearchState, setProductSearchState] = useState({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
  });
  const [productInventoryState, setProductInventoryState] = useState({
    data: [],
    isLoading: false,
  });

  // Selection State
  const [activeProduct, setActiveProduct] = useState(null); 
  const [selectedImeis, setSelectedImeis] = useState([]); 
  const [quickQty, setQuickQty] = useState(""); 
  
  // Warning State (FIFO Validation)
  const [fifoWarning, setFifoWarning] = useState(null);

  // Staging List (Expanded rows)
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const usedImeiIds = useMemo(() => {
    const ids = new Set();
    transferForm.product_lines.forEach((line) => {
      if (activeProduct?.isEditing && line.variant_id === activeProduct.id) return;
      (line.serial_numbers || []).forEach((sn) => {
        if (sn.inventory_id) ids.add(sn.inventory_id);
      });
    });
    return ids;
  }, [activeProduct, transferForm.product_lines]);

  useEffect(() => {
    let active = true;

    const shouldFetch =
      open &&
      !activeProduct &&
      Boolean(transferForm.source_location_id && debouncedSearchQuery);

    if (!shouldFetch) {
      setProductSearchState((current) => ({
        ...current,
        data: [],
        isLoading: false,
        isFetching: false,
        isError: false,
      }));
      return () => {
        active = false;
      };
    }

    setProductSearchState((current) => ({
      ...current,
      isLoading: current.data.length === 0,
      isFetching: true,
      isError: false,
    }));

    searchTransferProducts({
      sourceLocationId: transferForm.source_location_id,
      query: debouncedSearchQuery,
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setProductSearchState({
          data,
          isLoading: false,
          isFetching: false,
          isError: false,
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setProductSearchState({
          data: [],
          isLoading: false,
          isFetching: false,
          isError: true,
        });
      });

    return () => {
      active = false;
    };
  }, [
    activeProduct,
    debouncedSearchQuery,
    open,
    searchTransferProducts,
    transferForm.source_location_id,
  ]);

  useEffect(() => {
    let active = true;

    if (!(open && activeProduct?.id && transferForm.source_location_id)) {
      setProductInventoryState({ data: [], isLoading: false });
      return () => {
        active = false;
      };
    }

    setProductInventoryState((current) => ({
      ...current,
      isLoading: true,
    }));

    fetchTransferProductInventory({
      sourceLocationId: transferForm.source_location_id,
      variantId: activeProduct.id,
    })
      .then((data) => {
        if (active) {
          setProductInventoryState({
            data,
            isLoading: false,
          });
        }
      })
      .catch(() => {
        if (active) {
          setProductInventoryState({
            data: [],
            isLoading: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [activeProduct, fetchTransferProductInventory, open, transferForm.source_location_id]);

  const filteredProducts = useMemo(
    () =>
      (productSearchState.data || []).map((product) => ({
        ...product,
        fullName: [product.product_name, product.variant_name].filter(Boolean).join(" ").trim() || product.variant_name || "Unknown Product",
        brandName: product.brand_name || "",
      })),
    [productSearchState.data]
  );

  useEffect(() => {
    if (!productSearchState.isError) {
      setLastSuccessfulProducts(filteredProducts);
    }
  }, [filteredProducts, productSearchState.isError]);

  const displayedProducts =
    productSearchState.isFetching && debouncedSearchQuery ? lastSuccessfulProducts : filteredProducts;

  const showEmptyState =
    Boolean(searchQuery) &&
    !productSearchState.isLoading &&
    !productSearchState.isFetching &&
    !productSearchState.isError &&
    displayedProducts.length === 0;

  const availableImeisForActiveProduct = useMemo(() => {
    const relevantInventory = productInventoryState.data || [];

    return relevantInventory
      .filter((item) => !usedImeiIds.has(item.id))
      .map((item) => ({
        ...item,
        age: calculateStockAge(getInventoryAgeDate(item)),
      }))
      .sort((a, b) => b.age - a.age);
  }, [productInventoryState.data, usedImeiIds]);

  // --- HANDLERS ---

  // FIFO Validation Check
  useEffect(() => {
    if (!activeProduct || selectedImeis.length === 0) {
      setFifoWarning(null);
      return;
    }

    const allAvailable = availableImeisForActiveProduct.filter(i => i.status === 'available');
    if(allAvailable.length === 0) return;

    const oldestUnselected = allAvailable.find(i => !selectedImeis.some(s => s.id === i.id));
    const sortedSelected = [...selectedImeis].sort((a, b) => a.age - b.age);
    const newestSelected = sortedSelected[0]; 

    if (oldestUnselected && newestSelected && newestSelected.age < oldestUnselected.age) {
       setFifoWarning(`Warning: You are picking stock received ${newestSelected.age} days ago, but older stock (${oldestUnselected.age} days) is available.`);
    } else {
      setFifoWarning(null);
    }
  }, [selectedImeis, availableImeisForActiveProduct, activeProduct]);

  const handleFromLocationChange = (val) => {
    if (transferForm.product_lines.length > 0) {
      if(!window.confirm("Changing the 'From Location' will clear your current transfer list. Continue?")) return;
    }
    setTransferForm({ 
      ...transferForm, 
      source_location_id: val, 
      destination_location_id: "", 
      product_lines: [] 
    });
    setActiveProduct(null);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setLastSuccessfulProducts([]);
  };

  const handleProductSelect = (product) => {
    if (product.total_stock <= 0) return;

    setActiveProduct(product);
    setSearchQuery(""); 
    setDebouncedSearchQuery("");
    setIsDropdownOpen(false);
    setSelectedImeis([]); 
    setQuickQty("");
  };

  const toggleImeiSelection = (item) => {
    if (item.status !== 'available') return;
    if (selectedImeis.find(i => i.id === item.id)) {
      setSelectedImeis(selectedImeis.filter(i => i.id !== item.id));
    } else {
      setSelectedImeis([...selectedImeis, item]);
    }
  };

  const selectTopOldest = () => {
    const qty = parseInt(quickQty);
    if (!qty || qty <= 0) return;
    const availableOnly = availableImeisForActiveProduct.filter(i => i.status === 'available');
    const toSelect = availableOnly.slice(0, qty);
    setSelectedImeis(toSelect);
  };

  const confirmAddToTransfer = () => {
    if (selectedImeis.length === 0) return;

    const newLine = {
      product_master_id: activeProduct.product_master_id,
      variant_id: activeProduct.id,
      product_name: activeProduct.product_name,
      brand_name: activeProduct.brand_name,
      variant_name: activeProduct.variant_name,
      sku: activeProduct.sku,
      condition: activeProduct.condition,
      attributes: activeProduct.attributes || {},
      quantity_demanded: selectedImeis.length,
      quantity_reserved: 0,
      quantity_done: 0,
      serial_numbers: selectedImeis.map(item => ({
        id: item.id,
        inventory_id: item.id,
        identifier: item.identifier,
        product_master_id: item.product_master_id,
        variant_id: item.variant_id,
        serial_number: item.serial_number,
        imei1: item.imei1,
        imei2: item.imei2,
        status: item.status,
        created_date: item.created_date,
        encoded_date: item.encoded_date,
        received: false,
        missing: false
      })),
      tempId: Date.now()
    };

    let updatedLines = transferForm.product_lines;
    if (activeProduct.isEditing) {
      updatedLines = updatedLines.filter(l => l.variant_id !== activeProduct.id);
    }

    setTransferForm({
      ...transferForm,
      product_lines: [newLine, ...updatedLines]
    });

    setActiveProduct(null);
    setSelectedImeis([]);
    setQuickQty("");
  };

  const handleEditLine = (line) => {
    const fullName = [line.product_name, line.variant_name].filter(Boolean).join(" ").trim();

    const existingSelectedImeis = (line.serial_numbers || []).map((sn) => ({
      ...sn,
      id: sn.inventory_id || sn.id,
      age: calculateStockAge(getInventoryAgeDate(sn)),
    })).filter((item) => item.id);

    setActiveProduct({
      id: line.variant_id,
      product_master_id: line.product_master_id,
      variant_name: line.variant_name,
      product_name: line.product_name,
      brand_name: line.brand_name,
      sku: line.sku,
      condition: line.condition,
      attributes: line.attributes || {},
      fullName,
      brandName: line.brand_name,
      isEditing: true 
    });
    setSelectedImeis(existingSelectedImeis);
  };

  const handleRemoveLine = (tempId, variantId) => {
    if(window.confirm("Remove this line item?")) {
      const newLines = transferForm.product_lines.filter(l => l.tempId !== tempId && l.variant_id !== variantId);
      setTransferForm({ ...transferForm, product_lines: newLines });
    }
  };

  const handleFinalSubmit = () => {
    setIsConfirmModalOpen(false);
    onSubmit(); 
  };

  const getStockBadgeStyle = (qty) => {
    if (qty <= 0) return "bg-muted text-muted-foreground border-border";
    if (qty < 5) return "bg-destructive-muted text-destructive-muted-foreground border-destructive/20";
    if (qty <= 20) return "bg-warning-muted text-warning-muted-foreground border-warning/20";
    return "bg-success-muted text-success-muted-foreground border-success/20";
  };

  const inputSurfaceClass = "h-9 border-border bg-background text-foreground";
  const subtleLabelClass = "flex items-center text-xs font-bold uppercase text-muted-foreground";
  const productConditionClass = (condition) =>
    condition === "Brand New"
      ? "border-success/20 bg-success-muted text-success-muted-foreground"
      : "border-warning/20 bg-warning-muted text-warning-muted-foreground";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[95vh] w-full max-w-[95vw] flex-col gap-0 overflow-hidden border-border bg-background p-0 text-foreground shadow-2xl">
          
          {/* HEADER */}
          <DialogHeader className="shrink-0 border-b border-border bg-card px-6 py-4 text-card-foreground">
            <div className="flex justify-between items-center">
              <DialogTitle>{editingTransfer ? "Edit Stock Transfer" : "Create Stock Transfer"}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            
            {/* 1. SETTINGS CARD */}
            <div className="grid shrink-0 content-start grid-cols-1 gap-4 border-b border-border bg-muted/40 p-4 md:grid-cols-3">
              <div className="space-y-1">
                 <Label className={subtleLabelClass}>
                   <MapPin className="w-3 h-3 mr-1" /> From Location
                 </Label>
                 <Select value={transferForm.source_location_id} onValueChange={handleFromLocationChange}>
                    <SelectTrigger className={inputSurfaceClass}><SelectValue placeholder="Select Origin" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>

              <div className="space-y-1">
                 <Label className={subtleLabelClass}>
                   <MapPin className="w-3 h-3 mr-1" /> To Location
                 </Label>
                 <Select 
                    value={transferForm.destination_location_id} 
                    onValueChange={(val) => setTransferForm({...transferForm, destination_location_id: val})}
                    disabled={!transferForm.source_location_id}
                  >
                    <SelectTrigger className={cn(
                      inputSurfaceClass,
                      !transferForm.destination_location_id && "border-destructive/40 bg-destructive-muted/40 text-foreground"
                    )}>
                      <SelectValue placeholder="Select Dest." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.filter(w => String(w.id) !== String(transferForm.source_location_id)).map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
              </div>

              <div className="space-y-1">
                 <Label className={subtleLabelClass}>Ref / Notes</Label>
                 <Input 
                   className={inputSurfaceClass}
                   placeholder="PO# or Notes..." 
                   value={transferForm.reference}
                   onChange={(e) => setTransferForm({...transferForm, reference: e.target.value})}
                 />
              </div>
            </div>

            {/* 2. MAIN CONTENT SPLIT */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT: PICKER (65%) */}
              <div className="w-2/3 border-r border-border flex flex-col bg-card overflow-hidden">
                
                {/* Search & Filter Area */}
                {!activeProduct && (
                  <div className="flex-1 p-6 bg-muted/30 flex flex-col min-h-0">
                    <div className="flex items-center gap-4 w-full mb-4 flex-shrink-0">
                      
                      {/* Icon */}
                      <div className="rounded-full bg-info-muted p-2 text-info flex-shrink-0">
                        <Search className="h-6 w-6 text-info" />
                      </div>
                      
                      {/* Title */}
                      <h2 className="text-lg font-bold text-foreground whitespace-nowrap hidden md:block">Find a Product</h2>
                      
                      {/* Inputs Container */}
                      <div className="flex-1 flex gap-2 items-center overflow-x-auto no-scrollbar">
                        {/* Search Input */}
                        <div className="relative min-w-[240px] max-w-sm flex-shrink-0">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="pl-10 h-10 shadow-sm bg-background border-border"
                            placeholder="Type variant, brand, or model..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                            onFocus={() => setIsDropdownOpen(true)}
                            disabled={!transferForm.source_location_id}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dropdown Results */}
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                      <div className="flex shrink-0 justify-between border-b border-border bg-muted/40 p-2 text-xs font-medium text-muted-foreground">
                         <span>Search Results ({displayedProducts.length})</span>
                         {!transferForm.source_location_id && <span className="text-destructive">Select Location first</span>}
                      </div>
                      
                      <div className="overflow-y-auto flex-1 p-0">
                         {!searchQuery && displayedProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                               <Search className="w-12 h-12 mb-3 opacity-20" />
                               <p className="text-sm">Start typing to search for products...</p>
                            </div>
                         )}

                         {searchQuery && (productSearchState.isLoading || productSearchState.isFetching) && (
                            <div className="p-8 text-center text-muted-foreground">
                               <p>Searching products...</p>
                            </div>
                         )}

                         {searchQuery && productSearchState.isError && (
                            <div className="p-8 text-center text-destructive">
                               <p>Search failed. Please try again.</p>
                            </div>
                         )}

                         {showEmptyState && (
                            <div className="p-8 text-center text-muted-foreground">
                               <p>No products found matching criteria.</p>
                            </div>
                         )}

                         {isDropdownOpen && displayedProducts.map(product => {
                              const isOutOfStock = product.total_stock <= 0;
                              return (
                                <div key={product.id} 
                                  onClick={() => handleProductSelect(product)}
                                  className={`p-3 border-b last:border-0 transition-colors flex justify-between items-center
                                    ${isOutOfStock 
                                      ? "cursor-not-allowed bg-muted/70 text-muted-foreground opacity-60" 
                                      : "cursor-pointer bg-card hover:bg-accent"}`}
                                >
                                  <div className="flex-1 min-w-0 mr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`font-medium truncate text-sm ${isOutOfStock ? "text-muted-foreground" : "text-foreground"}`}>
                                        {product.fullName}
                                      </span>
                                      {/* Condition Badge */}
                                      {product.condition && (
                                        <Badge variant="outline" className={`h-5 border px-1.5 py-0 text-[10px] ${productConditionClass(product.condition)}`}>
                                          {product.condition}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Attribute Tags (RAM, Color, etc) */}
                                    <div className="flex flex-wrap gap-1">
                                       {product.attributes && Object.entries(product.attributes).map(([k, v]) => (
                                         <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                            {k}: {v}
                                         </span>
                                       ))}
                                       <span className="text-[10px] text-muted-foreground flex items-center ml-1">{product.sku}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Stock Badge with Feature 2: Color Coding */}
                                  <Badge 
                                    variant="outline" 
                                    className={`flex-shrink-0 ${getStockBadgeStyle(product.total_stock)}`}
                                  >
                                    {product.total_stock} Units
                                  </Badge>
                                </div>
                              );
                            })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Product Picker */}
                {activeProduct && (
                  <div className="flex flex-col h-full">
                    {/* Picker Header */}
                    <div className="z-10 flex items-end justify-between border-b border-border bg-card p-4 shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setActiveProduct(null)}>
                             <X className="w-4 h-4" />
                           </Button>
                           <div className="flex items-center gap-2">
                              <h3 className="font-bold text-foreground text-lg">{activeProduct.fullName}</h3>
                              {activeProduct.condition && (
                                <Badge variant="outline" className={`h-5 border px-1.5 py-0 text-[10px] ${productConditionClass(activeProduct.condition)}`}>
                                  {activeProduct.condition}
                                </Badge>
                              )}
                           </div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">SKU: {activeProduct.sku}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-1 text-foreground">
                        <span className="text-xs font-semibold px-2">FIFO Auto:</span>
                        <Input 
                          type="number" 
                          placeholder="Qty" 
                          className="h-7 w-16 border-border bg-background text-center"
                          value={quickQty}
                          onChange={(e) => setQuickQty(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && selectTopOldest()}
                        />
                        <Button size="sm" variant="ghost" className="h-7 text-xs bg-background border border-border" onClick={selectTopOldest}>Select Oldest</Button>
                      </div>
                    </div>

                    {/* FIFO Warning */}
                    {fifoWarning && (
                      <div className="bg-warning-muted border-b border-warning/20 px-4 py-2 flex items-center text-warning-muted-foreground text-xs font-medium">
                         <AlertTriangle className="w-4 h-4 mr-2" />
                         {fifoWarning}
                      </div>
                    )}

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto bg-muted/30">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted sticky top-0 z-10 text-xs text-muted-foreground uppercase">
                          <tr>
                            <th className="px-4 py-2 text-left w-12">Select</th>
                            <th className="px-4 py-2 text-left">Serial / IMEI</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Stock Age</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {productInventoryState.isLoading && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                Loading available units...
                              </td>
                            </tr>
                          )}
                          {availableImeisForActiveProduct.map((item) => {
                            const isSelected = selectedImeis.some(i => i.id === item.id);
                            const isAvail = item.status === 'available';
                            const ageColor = item.age > 90 ? "bg-destructive-muted text-destructive" : item.age > 60 ? "bg-warning-muted text-warning-muted-foreground" : "bg-success-muted text-success-muted-foreground";

                            return (
                              <tr 
                                key={item.id} 
                                onClick={() => toggleImeiSelection(item)}
                                className={`transition-colors ${!isAvail ? 'bg-muted/70 opacity-60' : isSelected ? 'bg-info-muted text-foreground' : 'cursor-pointer hover:bg-accent'}`}
                              >
                                <td className="px-4 py-2">
                                  {isAvail ? (
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                                      {isSelected && <CheckSquare className="w-3 h-3 text-primary-foreground" />}
                                    </div>
                                  ) : <Ban className="w-4 h-4 text-muted-foreground" />}
                                </td>
                                <td className="px-4 py-2 font-mono">{item.identifier || item.imei1 || item.imei2 || item.serial_number}</td>
                                <td className="px-4 py-2"><Badge variant="outline" className="text-[10px]">{item.status}</Badge></td>
                                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${isAvail ? ageColor : ''}`}>{item.age} Days</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-border bg-card flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{selectedImeis.length} units selected</span>
                      <div className="flex gap-2">
                        {selectedImeis.length > 0 && <Button variant="ghost" onClick={() => {setSelectedImeis([]); setQuickQty("");}}>Clear</Button>}
                        <Button onClick={confirmAddToTransfer} disabled={selectedImeis.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          {activeProduct.isEditing ? "Update Line" : "Add to Transfer"} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: STAGING LIST (35%) */}
              <div className="flex w-1/3 flex-col bg-muted/30">
                <div className="flex items-center justify-between border-b border-border bg-card p-4 shadow-sm">
                  <h3 className="font-bold text-foreground flex items-center"><Package className="w-4 h-4 mr-2" /> Staged Items</h3>
                  <Badge variant="secondary">{transferForm.product_lines.reduce((a,c) => a + c.quantity_demanded, 0)} Total</Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {transferForm.product_lines.length === 0 && (
                    <div className="text-center mt-20 text-muted-foreground">
                      <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">List is empty</p>
                    </div>
                  )}
                  
                  {transferForm.product_lines.map((item, idx) => (
                    <div key={item.tempId || idx} className="group rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-sm line-clamp-1">{item.product_name} {item.variant_name}</div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary" onClick={() => handleEditLine(item)}><Edit2 className="w-3 h-3" /></Button>
                           <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleRemoveLine(item.tempId, item.variant_id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                        <Badge variant="outline" className="font-bold">Qty: {item.quantity_demanded}</Badge>
                      </div>
                      
                      {/* Collapsible Serials */}
                      <div className="border-t pt-2">
                        <button 
                          onClick={() => setExpandedRow(expandedRow === (item.tempId || idx) ? null : (item.tempId || idx))}
                          className="flex items-center text-[10px] text-primary w-full"
                        >
                          {expandedRow === (item.tempId || idx) ? <ChevronUp className="w-3 h-3 mr-1"/> : <ChevronDown className="w-3 h-3 mr-1"/>}
                          {expandedRow === (item.tempId || idx) ? "Hide Details" : "View Serials"}
                        </button>
                        {expandedRow === (item.tempId || idx) && (
                          <div className="mt-2 space-y-1 rounded bg-muted p-2 text-[10px]">
                            {item.serial_numbers.map((sn, i) => (
                              <div key={i} className="flex justify-between font-mono text-muted-foreground">
                                <span>{sn.identifier || sn.imei1 || sn.serial_number}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <DialogFooter className="px-6 py-4 border-t border-border bg-card flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button 
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={transferForm.product_lines.length === 0 || !transferForm.destination_location_id}
                className="bg-success hover:bg-success/90 text-success-foreground"
              >
                Create Transfer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
           <DialogContent className="max-w-md border-border bg-background text-foreground">
              <DialogHeader>
                <DialogTitle className="flex items-center text-primary"><AlertCircle className="w-5 h-5 mr-2" /> Confirm Transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground my-2">
                 <p>You are about to move stock:</p>
                 <div className="bg-muted p-3 rounded border border-border">
                   <div className="flex justify-between mb-1">
                     <span>From:</span> <span className="font-bold text-foreground">{warehouses.find(w => String(w.id) === String(transferForm.source_location_id))?.name}</span>
                   </div>
                   <div className="flex justify-between mb-1">
                     <span>To:</span> <span className="font-bold text-foreground">{warehouses.find(w => String(w.id) === String(transferForm.destination_location_id))?.name}</span>
                   </div>
                   <div className="flex justify-between border-t pt-2 mt-2">
                     <span>Total Items:</span> <span className="font-bold text-primary">{transferForm.product_lines.reduce((a,c)=>a+c.quantity_demanded,0)} Units</span>
                   </div>
                 </div>
                 <p className="text-xs text-muted-foreground">Please ensure physical goods are ready.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Back</Button>
                <Button onClick={handleFinalSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90">Confirm & Submit</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>
      )}
    </>
  );
}
