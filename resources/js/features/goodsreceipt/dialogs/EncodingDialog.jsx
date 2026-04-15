import React, { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ScanBarcode,
  Trash2,
  PackageCheck,
  ChevronRight,
  FileSpreadsheet,
  Palette,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PurchaseFileImportTab from "@/features/goodsreceipt/components/PurchaseFileImportTab";

const PACKAGE_OPTIONS = ['Unit', 'Charger', 'Box', 'Case', 'Tempered Glass'];
const WARRANTY_OPTIONS = [
  '7 Days Replacement & 1 Year Warranty',
  '3 Days for LCD & 7 Days Other Parts Replacement & 30 Days Warranty'
];

const normalizeId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
};

const idEquals = (left, right) => normalizeId(left) !== "" && normalizeId(left) === normalizeId(right);

const inferColorFromVariantName = (variantName) => {
  const parts = String(variantName || "")
    .split(/[/-]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";
  return parts[parts.length - 1];
};

const getDeclaredItemDisplayTitle = (item, productMasters = []) => {
  if (!item) return "Unknown Product";
  if (!item.allocation_required) return item.variant_name || item.product_name || "Unknown Product";

  const productMaster = productMasters.find((entry) => idEquals(entry.id, item.product_master_id));
  const productLabel =
    productMaster?.name ||
    productMaster?.model ||
    item.product_name ||
    "Unknown Product";
  const specLabel = [
    item.product_spec?.ram,
    item.product_spec?.rom,
    item.product_spec?.condition,
  ].filter(Boolean).join(" ");

  return [productLabel, specLabel].filter(Boolean).join(" ").trim() || "Unknown Product";
};

const getUnallocatedProductText = (item, productMasters = []) => {
  if (!item) return "Unknown Product";

  const productMaster = productMasters.find((entry) => idEquals(entry.id, item.product_master_id));
  const resolvedBrand =
    productMaster?.brand_id?.name ||
    productMaster?.brand_id?.ProductBrand?.name ||
    productMaster?.brand ||
    item.brand ||
    "";
  const model =
    item.model ||
    productMaster?.model ||
    productMaster?.name ||
    item.product_name ||
    "Unknown Product";

  return [resolvedBrand, model].filter(Boolean).join(" ").trim() || "Unknown Product";
};

const getVariantAttributeValue = (variant, keys = []) => {
  const attributes = variant?.attributes || {};

  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

export default function EncodingDialog({
  open,
  onOpenChange,
  selectedDR,
  declaredItemsList,
  selectedDeclaredItem,
  onSelectDeclaredItem,
  masterPattern,
  setMasterPattern,
  encodedItems,
  setEncodedItems,
  onSaveColorAllocation,
  resolveDeclaredItemForVariant,
  onSubmitGRN,
  isSubmitting,
  productMasters,
  variants,
}) {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("scan"); // 'scan' | 'purchasefile'
  const [scanInput, setScanInput] = useState("");
  const [flashMessage, setFlashMessage] = useState(null);
  const [allocationDraft, setAllocationDraft] = useState({});
  const [showAllocationEditor, setShowAllocationEditor] = useState(false);
  const [showBatchSetup, setShowBatchSetup] = useState(true);

  const inputRef = useRef(null);

  // Derived state for the currently selected item's progress
  const currentProgress = useMemo(() => {
    if (!selectedDeclaredItem) return { encoded: 0, target: 0, percent: 0 };
    const encodedCount = selectedDeclaredItem.encoded_count || 0;
    const target = selectedDeclaredItem.declared_quantity || 0;
    const percent = target > 0 ? Math.min(100, Math.round((encodedCount / target) * 100)) : 0;

    return { encoded: encodedCount, target, percent };
  }, [selectedDeclaredItem]);

  // Check if ALL declared items have been fully encoded
  const allItemsComplete = useMemo(() => {
    if (!declaredItemsList || declaredItemsList.length === 0) return false;

    return declaredItemsList.every(item => {
      return (item.encoded_count || 0) >= (item.declared_quantity || 0);
    });
  }, [declaredItemsList]);

  // Calculate total encoded vs total declared
  const totalProgress = useMemo(() => {
    const totalDeclared = declaredItemsList.reduce((sum, item) => sum + (item.declared_quantity || 0), 0);
    const totalEncoded = encodedItems.length;
    return { totalDeclared, totalEncoded };
  }, [declaredItemsList, encodedItems]);

  const currentScannedItems = useMemo(() => {
    if (!selectedDeclaredItem?.variant_id) return [];
    return encodedItems.filter(
      item => item._declared_item_key === selectedDeclaredItem.declared_item_key &&
        idEquals(item.variant_id, selectedDeclaredItem.variant_id)
    ).reverse();
  }, [selectedDeclaredItem, encodedItems]);

  const allocationTarget = selectedDeclaredItem?.declared_quantity || 0;
  const allocationTotal = useMemo(
    () => Object.values(allocationDraft).reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0),
    [allocationDraft]
  );
  const allocationRequired = !!selectedDeclaredItem?.allocation_required;
  const allocationLocked = !!selectedDeclaredItem?.allocation_locked;
  const allocationEditing =
    activeTab === "scan" && !!selectedDeclaredItem && (allocationRequired || showAllocationEditor);
  const allocationReady = allocationTarget > 0 && allocationTotal === allocationTarget;

  // Focus Effect
  useEffect(() => {
    if (open && activeTab === "scan" && !allocationEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, activeTab, allocationEditing]);

  useEffect(() => {
    if (!selectedDeclaredItem) {
      setAllocationDraft({});
      setShowAllocationEditor(false);
      setShowBatchSetup(true);
      return;
    }

    const nextDraft = {};
    (selectedDeclaredItem.matching_variants || []).forEach((variant) => {
      const savedValue = selectedDeclaredItem.saved_allocation?.[variant.id];
      nextDraft[variant.id] = savedValue && Number(savedValue) > 0 ? String(savedValue) : "";
    });
    setAllocationDraft(nextDraft);
    setShowAllocationEditor(!!selectedDeclaredItem.allocation_required);
    setShowBatchSetup(true);
  }, [selectedDeclaredItem]);

  useEffect(() => {
    if (!selectedDeclaredItem?.variant_id) return;

    const selectedVariant = variants?.find((variant) => idEquals(variant.id, selectedDeclaredItem.variant_id));
    if (!selectedVariant?.attributes) return;

    const attributeDefaults = {
      cpu: getVariantAttributeValue(selectedVariant, ["CPU", "cpu"]),
      gpu: getVariantAttributeValue(selectedVariant, ["GPU", "gpu"]),
      model_code: getVariantAttributeValue(selectedVariant, ["Model Code", "model_code", "Model code"]),
      ram_type: getVariantAttributeValue(selectedVariant, ["RAM Type", "ram_type", "Ram Type"]),
      rom_type: getVariantAttributeValue(selectedVariant, ["ROM Type", "rom_type", "Rom Type"]),
      os: getVariantAttributeValue(selectedVariant, ["Operating System", "OS", "os"]),
      screen: getVariantAttributeValue(selectedVariant, ["Screen", "screen"]),
    };

    setMasterPattern((prev) => {
      let hasChanges = false;
      const nextPattern = { ...prev };

      Object.entries(attributeDefaults).forEach(([field, value]) => {
        if (!value || String(prev?.[field] || "").trim() !== "") return;
        nextPattern[field] = value;
        hasChanges = true;
      });

      return hasChanges ? nextPattern : prev;
    });
  }, [selectedDeclaredItem, variants, setMasterPattern]);

  // --- LOGIC: Configuration & Validation ---
  const handleConfigChange = (field, value) => {
    setMasterPattern({ ...masterPattern, [field]: value });
  };

  const handlePackageClick = (option) => {
    let current = masterPattern.package || "";
    let parts = current.split(',').map(p => p.trim()).filter(p => p !== "");

    if (parts.includes(option)) {
      parts = parts.filter(p => p !== option);
    } else {
      parts.push(option);
    }
    handleConfigChange('package', parts.join(', '));
  };

  const handleWarrantyClick = (option) => {
    handleConfigChange('warranty', option);
  };

  const isBatchConfigValid = () => {
    const required = ['package', 'warranty', 'cost_price'];
    return required.every(field => masterPattern[field] !== "" && masterPattern[field] !== null && masterPattern[field] !== 0);
  };

  const triggerFeedback = (type, msg) => {
    setFlashMessage({ type, msg });
    setTimeout(() => setFlashMessage(null), 3000);
  };

  // --- LOGIC: Fast Scan Mode ---
  const handleScan = (e) => {
    if (e.key === 'Enter') {
      if (!isBatchConfigValid()) {
        triggerFeedback("error", "⚠️ Fill Pricing & Warranty first!");
        return;
      }

      if (allocationEditing) {
        triggerFeedback("error", "Complete the color quantity allocation first.");
        return;
      }

      const val = scanInput.trim();
      if (!val) return;

      if (encodedItems.some(i => i.imei1 === val || i.serial_number === val)) {
        triggerFeedback("error", "❌ Duplicate Item Scanned!");
        setScanInput("");
        return;
      }

      if (currentProgress.encoded >= currentProgress.target) {
        triggerFeedback("error", "⚠️ Declared quantity reached!");
        return;
      }

      const newItem = {
        ...masterPattern,
        product_master_id: selectedDeclaredItem.product_master_id,
        variant_id: selectedDeclaredItem.variant_id,
        _declared_item_key: selectedDeclaredItem.declared_item_key,
        product_spec: selectedDeclaredItem.product_spec,
        imei1: masterPattern.trackingMode === 'IMEI' ? val : "",
        serial_number: masterPattern.trackingMode === 'Serial' ? val : "",
        imei2: "",
        cpu: masterPattern.cpu || "",
        gpu: masterPattern.gpu || "",
        model_code: masterPattern.model_code || "",
        submodel: masterPattern.submodel || "",
        ram_type: masterPattern.ram_type || "",
        rom_type: masterPattern.rom_type || "",
        ram_slots: masterPattern.ram_slots || "",
        product_type: masterPattern.product_type || "Standard",
        country_model: masterPattern.country_model || "",
        os: masterPattern.os || "",
        screen: masterPattern.screen || "",
        with_charger: !!masterPattern.with_charger,
        resolution: masterPattern.resolution || "",
        item_notes: masterPattern.item_notes || "",
        condition: selectedDeclaredItem.condition || "good",
        mode: "Scan",
        timestamp: new Date().toLocaleTimeString(),
      };

      setEncodedItems(prev => [...prev, newItem]);
      triggerFeedback("success", `Captured: ${val}`);
      setScanInput("");
    }
  };

  // --- LOGIC: Purchase File adds items to encodedItems ---
  const handlePurchaseFileAddToEncoded = (validatedRows) => {
    const newItems = validatedRows.map((row) => {
      const declaredItem = resolveDeclaredItemForVariant(row.variant_id, row.product_master_id);

      return {
        product_master_id: row.product_master_id,
        variant_id: row.variant_id,
        _declared_item_key: declaredItem?.declared_item_key || "",
        product_spec: declaredItem?.product_spec || selectedDeclaredItem?.product_spec,
        imei1: row.imei1 || "",
        imei2: row.imei2 || "",
        serial_number: row.serial_number || "",
        package: row.package || "",
        warranty: row.warranty || "",
        cost_price: row.cost_price || 0,
        cash_price: row.cash_price || 0,
        srp: row.srp || 0,
        "12_months_cc": row["12_months_cc"] || 0,
        "3_months_cc": row["3_months_cc"] || 0,
        dp_30: row.dp_30 || 0,
        cpu: row.cpu || "",
        gpu: row.gpu || "",
        submodel: row.submodel || "",
        ram_type: row.ram_type || "",
        rom_type: row.rom_type || "",
        ram_slots: row.ram_slots || "",
        product_type: row.product_type || "Standard",
        country_model: row.country_model || "",
        with_charger: !!row.with_charger,
        resolution: row.resolution || "",
        item_notes: row.item_notes || "",
        condition: row.condition || "",
        mode: "CSV",
        timestamp: new Date().toLocaleTimeString(),
        _purchaseFileData: row,
      };
    });

    setEncodedItems(prev => [...prev, ...newItems]);
    triggerFeedback("success", `Added ${newItems.length} items from CSV`);
    setActiveTab('scan');
  };

  const handleRemoveItem = (itemToRemove) => {
    setEncodedItems(prev => prev.filter(i => i !== itemToRemove));
  };

  const handleAllocationChange = (variantId, value) => {
    const normalizedValue = value === "" ? "" : String(Math.max(0, parseInt(value, 10) || 0));
    setAllocationDraft((prev) => ({
      ...prev,
      [variantId]: normalizedValue,
    }));
  };

  const handleSaveAllocation = () => {
    if (!selectedDeclaredItem || !allocationReady || allocationLocked) return;
    onSaveColorAllocation(selectedDeclaredItem, allocationDraft);
    setShowAllocationEditor(false);
    triggerFeedback("success", "Color quantities allocated.");
  };

  const getColorLabel = (variant) =>
    variant?.attributes?.Color ||
    variant?.attributes?.color ||
    inferColorFromVariantName(variant?.variant_name) ||
    "Unspecified";

  const formatMoney = (value) => `P${value || 0}`;
  const batchConfigReady = isBatchConfigValid();
  const setupStatusText = allocationEditing
    ? "Finish the color split to unlock scanning."
    : batchConfigReady
      ? `Ready to scan by ${masterPattern.trackingMode || "IMEI"}.`
      : "Complete batch setup before scanning.";
  const scanHelperText = allocationEditing
    ? "Color allocation must be completed before scanning can start."
    : batchConfigReady
      ? `Scanner ready for ${masterPattern.trackingMode || "IMEI"}.`
      : "Finish package and warranty setup to enable fast scanning.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
        max-w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden
        bg-background text-foreground
        flex flex-col md:flex-row
        border border-border
      "
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Encode Goods Receipt Items</DialogTitle>
        </DialogHeader>
        {/* --- LEFT PANEL: ITEMS LIST --- */}
        <div
          className="
          w-full md:w-1/3
          bg-card
          border-r border-border
          flex flex-col z-10 h-full
          shadow-[0_0_28px_rgba(0,0,0,0.35)]
        "
        >
          <div className="p-5 border-b border-border bg-background flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-foreground">Incoming: {selectedDR?.dr_number}</h1>
              <p className="text-xs text-muted-foreground">Select an item to start encoding</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">{encodedItems.length}</span>
              <span className="text-xs block text-muted-foreground">Total Units</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
            <div className="space-y-2">
              {declaredItemsList.map((item, idx) => {
                const itemTarget = item.declared_quantity;
                const itemEncodedCount = item.encoded_count || 0;
                const pct = itemTarget > 0 ? Math.min(100, Math.round((itemEncodedCount / itemTarget) * 100)) : 0;
                const isSelected = selectedDeclaredItem?.row_key === item.row_key;
                const itemDisplayTitle = getDeclaredItemDisplayTitle(item, productMasters);
                const unallocatedProductText = getUnallocatedProductText(item, productMasters);
                const unallocatedSpecs = [
                  item.product_spec?.ram,
                  item.product_spec?.rom,
                  item.product_spec?.condition,
                ].filter(Boolean);

                return (
                  <div
                    key={`${item.row_key}-${idx}`}
                    onClick={() => onSelectDeclaredItem(item)}
                    className={`
                    cursor-pointer p-4 rounded-lg border transition-all relative overflow-hidden group
                    ${isSelected
                        ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                        : "bg-background border-border hover:bg-accent/40 hover:border-border"
                      }
                  `}
                  >
                    <div
                      className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${pct >= 100 ? "bg-[hsl(var(--success))]" : "bg-primary"
                        }`}
                      style={{ width: `${pct}%` }}
                    ></div>

                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <div>
                        <h3 className={`font-semibold text-sm ${isSelected ? "text-foreground" : "text-foreground"}`}>
                          {item.allocation_required ? unallocatedProductText : itemDisplayTitle}
                        </h3>
                        {item.allocation_required && unallocatedSpecs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {unallocatedSpecs.map((spec) => (
                              <Badge
                                key={`${item.row_key}-${spec}`}
                                variant="outline"
                                className="bg-background border-border text-[10px] text-muted-foreground"
                              >
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {item.resolved_color && (
                          <p className="text-[10px] text-[hsl(var(--info))] mt-0.5">{item.resolved_color}</p>
                        )}
                        {item.variant_sku && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.variant_sku}</p>
                        )}
                        {item.allocation_required && (
                          <p className="text-[10px] text-[hsl(var(--warning))] mt-0.5">Color allocation required</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`
                          px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${pct >= 100
                              ? "bg-success/10 text-[hsl(var(--success))] border-success/20"
                              : "bg-muted text-muted-foreground border-border"
                            }
                        `}
                        >
                          {itemEncodedCount} / {itemTarget}
                        </span>
                        {isSelected && <ChevronRight className="w-4 h-4 text-primary animate-pulse" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {allocationEditing && selectedDeclaredItem && (
              <div className="rounded-xl border border-info/20 bg-card p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Allocate Quantity by Color</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Split {allocationTarget} unit{allocationTarget === 1 ? "" : "s"} across matching color variants before scanning.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${allocationReady ? "border-success/20 text-[hsl(var(--success))]" : "border-warning/20 text-[hsl(var(--warning))]"} bg-background`}
                  >
                    {allocationTotal} / {allocationTarget}
                  </Badge>
                </div>

                {selectedDeclaredItem.is_partitioned && selectedDeclaredItem.can_edit_allocation && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllocationEditor(false)}
                      className="h-7 bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <Palette className="w-3 h-3 mr-1" />
                      Close Color Split
                    </Button>
                  </div>
                )}

                <div className="grid gap-3">
                  {(selectedDeclaredItem.matching_variants || []).map((variant) => (
                    <div
                      key={variant.id}
                      className="grid grid-cols-[1fr_110px] gap-3 items-center rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{variant.variant_name}</div>
                        <div className="text-xs text-[hsl(var(--info))]">{getColorLabel(variant)}</div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={allocationDraft[variant.id] ?? ""}
                        onChange={(e) => handleAllocationChange(variant.id, e.target.value)}
                        readOnly={allocationLocked}
                        className="h-9 text-right bg-background border-border text-foreground"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {allocationLocked
                      ? "Color allocation is locked because items are already encoded for this product. Remove them first to repartition."
                      : "The total allocated quantity must exactly match the declared quantity."}
                  </p>
                  <div className="flex gap-2">
                    {!allocationRequired && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAllocationEditor(false)}
                        className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSaveAllocation}
                      disabled={!allocationReady || allocationLocked}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                    >
                      Confirm Allocation
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!allocationEditing && selectedDeclaredItem?.is_partitioned && selectedDeclaredItem?.can_edit_allocation && (
              <div className="rounded-xl border border-info/20 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Color Split Saved</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Edit the color allocation from the left panel before encoding more units.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllocationEditor(true)}
                    className="h-7 bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Palette className="w-3 h-3 mr-1" />
                    Edit Color Split
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-background space-y-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab("purchasefile")}
              className="w-full bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground gap-2 text-xs"
            >
              <FileSpreadsheet size={14} /> Upload Purchase File (All Items)
            </Button>
            {!allItemsComplete && encodedItems.length > 0 && (
              <div className="text-xs text-[hsl(var(--info))] bg-info/10 border border-info/25 rounded-md p-2 text-center">
                ⚠️ {totalProgress.totalEncoded} of {totalProgress.totalDeclared} items scanned. Complete all items to submit.
              </div>
            )}

            <Button
              onClick={onSubmitGRN}
              disabled={isSubmitting || encodedItems.length === 0 || !allItemsComplete}
              className="
              w-full
              bg-success/10 text-[hsl(var(--success))]
              border border-success/25
              hover:bg-success/15
              disabled:bg-muted disabled:text-muted-foreground disabled:border-border
            "
            >
              <PackageCheck size={16} />
              {isSubmitting ? "Submitting..." : `Add Items (${totalProgress.totalEncoded}/${totalProgress.totalDeclared})`}
            </Button>
          </div>
        </div>

        {/* --- RIGHT PANEL: CONFIG & SCAN --- */}
        {(selectedDeclaredItem || activeTab === "purchasefile") ? (
          <div className="w-full md:w-2/3 flex flex-col relative bg-background h-full min-h-0 overflow-y-auto">
            {/* Header */}
            <div className="bg-card px-6 py-5 border-b border-border shrink-0">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-foreground">
                    {selectedDeclaredItem ? getDeclaredItemDisplayTitle(selectedDeclaredItem, productMasters) : "Import File"}
                  </h2>
                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-2">
                    {selectedDeclaredItem ? (
                      <>
                        <Badge variant="outline" className="bg-background border-border text-foreground">
                          {selectedDeclaredItem.condition || "Brand New"}
                        </Badge>
                        {selectedDeclaredItem.resolved_color && (
                          <Badge variant="outline" className="bg-background border-info/20 text-[hsl(var(--info))]">
                            {selectedDeclaredItem.resolved_color}
                          </Badge>
                        )}
                        <span>{setupStatusText}</span>
                      </>
                    ) : (
                      <span>Import items for all declared products at once via CSV.</span>
                    )}
                  </div>
                </div>

                {selectedDeclaredItem && (
                  <div className="w-full md:w-56 rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Encoding Progress</span>
                      <span>{currentProgress.percent}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${currentProgress.percent >= 100 ? "bg-[hsl(var(--success))]" : "bg-primary"}`}
                        style={{ width: `${currentProgress.percent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{currentProgress.encoded} of {currentProgress.target} encoded</span>
                      <span>{Math.max(currentProgress.target - currentProgress.encoded, 0)} left</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- 1. MANDATORY BATCH CONFIGURATION (only for scan mode) --- */}
            {selectedDeclaredItem && activeTab === "scan" && (
              <div className="px-6 py-5 border-b border-border bg-primary/5 shrink-0">
                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">Batch Setup</h3>
                        <Badge
                          variant="outline"
                          className={batchConfigReady ? "border-success/20 text-[hsl(var(--success))] bg-success/10" : "border-warning/20 text-[hsl(var(--warning))] bg-warning/10"}
                        >
                          {batchConfigReady ? "Complete" : "Required before scanning"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {batchConfigReady
                          ? "Setup is saved. You can scan now or reopen this section to make changes."
                          : "Confirm warranty and package details before encoding units."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBatchSetup((prev) => !prev)}
                      className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      {showBatchSetup ? "Minimize Setup" : "Edit Setup"}
                    </Button>
                  </div>

                  <div className="border-t border-border px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-background border-border text-muted-foreground font-mono">
                        Cost: {formatMoney(masterPattern.cost_price)}
                      </Badge>
                      <Badge variant="outline" className="bg-background border-border text-muted-foreground font-mono">
                        Cash: {formatMoney(masterPattern.cash_price)}
                      </Badge>
                      <Badge variant="outline" className="bg-background border-border text-muted-foreground font-mono">
                        SRP: {formatMoney(masterPattern.srp)}
                      </Badge>
                    </div>
                  </div>

                  {showBatchSetup && (
                    <div className="border-t border-border px-5 py-5">
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Warranty</label>
                          <div className="flex flex-wrap gap-1.5 mb-2 mt-2">
                            {WARRANTY_OPTIONS.map((opt) => {
                              const isSelected = masterPattern.warranty === opt;
                              return (
                                <span
                                  key={opt}
                                  onClick={() => handleWarrantyClick(opt)}
                                  className={`
                                  text-[10px] px-2 py-1 rounded-md cursor-pointer border transition-colors select-none
                                  whitespace-normal h-auto text-left leading-tight
                                  ${isSelected
                                      ? "bg-primary/10 border-primary/20 text-primary"
                                      : "bg-background border-border text-muted-foreground hover:bg-accent"
                                    }
                                `}
                                  title={opt}
                                >
                                  {opt}
                                </span>
                              );
                            })}
                          </div>
                          <Input
                            type="text"
                            value={masterPattern.warranty}
                            onChange={(e) => handleConfigChange("warranty", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                            placeholder="e.g. 1 Year Service"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Package</label>
                          <div className="flex flex-wrap gap-1.5 mb-2 mt-2">
                            {PACKAGE_OPTIONS.map((opt) => {
                              const isSelected = (masterPattern.package || "").includes(opt);
                              return (
                                <span
                                  key={opt}
                                  onClick={() => handlePackageClick(opt)}
                                  className={`
                                  text-[10px] px-2 py-1 rounded-full cursor-pointer border transition-colors select-none
                                  ${isSelected
                                      ? "bg-primary/10 border-primary/20 text-primary"
                                      : "bg-background border-border text-muted-foreground hover:bg-accent"
                                    }
                                `}
                                >
                                  {opt}
                                </span>
                              );
                            })}
                          </div>
                          <Input
                            type="text"
                            value={masterPattern.package}
                            onChange={(e) => handleConfigChange("package", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                            placeholder="e.g. Unit, Charger"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">CPU</label>
                          <Input
                            type="text"
                            value={masterPattern.cpu || ""}
                            onChange={(e) => handleConfigChange("cpu", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. Intel i7"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">GPU</label>
                          <Input
                            type="text"
                            value={masterPattern.gpu || ""}
                            onChange={(e) => handleConfigChange("gpu", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. RTX 4060"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Submodel</label>
                          <Input
                            type="text"
                            value={masterPattern.submodel || ""}
                            onChange={(e) => handleConfigChange("submodel", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. Intel i7-13700H, Snapdragon 8 Gen 2"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Model Code</label>
                          <Input
                            type="text"
                            value={masterPattern.model_code || ""}
                            onChange={(e) => handleConfigChange("model_code", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. AL14-32P-34RE OPI"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Product Type</label>
                          <Input
                            type="text"
                            value={masterPattern.product_type || "Standard"}
                            onChange={(e) => handleConfigChange("product_type", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. Standard"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">RAM Type</label>
                          <Input
                            type="text"
                            value={masterPattern.ram_type || ""}
                            onChange={(e) => handleConfigChange("ram_type", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. LPDDR5, DDR5"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">ROM Type</label>
                          <Input
                            type="text"
                            value={masterPattern.rom_type || ""}
                            onChange={(e) => handleConfigChange("rom_type", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. UFS 4.0, NVMe SSD"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Operating System</label>
                          <Input
                            type="text"
                            value={masterPattern.os || ""}
                            onChange={(e) => handleConfigChange("os", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. Windows 11 Home"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">RAM Slots</label>
                          <Input
                            type="text"
                            value={masterPattern.ram_slots || ""}
                            onChange={(e) => handleConfigChange("ram_slots", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. 2 Slots, Soldered"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Screen</label>
                          <Input
                            type="text"
                            value={masterPattern.screen || ""}
                            onChange={(e) => handleConfigChange("screen", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. 14.0-inch IPS display"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Country Model</label>
                          <Input
                            type="text"
                            value={masterPattern.country_model || ""}
                            onChange={(e) => handleConfigChange("country_model", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. HK, US, NTC"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Resolution</label>
                          <Input
                            type="text"
                            value={masterPattern.resolution || ""}
                            onChange={(e) => handleConfigChange("resolution", e.target.value)}
                            className="h-10 text-sm bg-background border-border text-foreground focus-visible:ring-ring"
                            placeholder="e.g. 720 x 1080p"
                          />
                        </div>

                        <div className="flex items-end">
                          <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 w-full cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!masterPattern.with_charger}
                              onChange={(e) => handleConfigChange("with_charger", e.target.checked)}
                            />
                            <div>
                              <div className="text-sm font-medium text-foreground">With Charger</div>
                              <div className="text-[11px] text-muted-foreground">Include charger status in the received item details.</div>
                            </div>
                          </label>
                        </div>

                        <div className="xl:col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Item Notes</label>
                          <textarea
                            value={masterPattern.item_notes || ""}
                            onChange={(e) => handleConfigChange("item_notes", e.target.value)}
                            className="mt-2 min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                            placeholder="Optional notes for all scanned items in this batch"
                          />
                        </div>

                        <div className="xl:col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Tracking Mode</label>
                          <div className="mt-2 inline-flex rounded-xl border border-border bg-background p-1">
                            {["IMEI", "Serial"].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => handleConfigChange("trackingMode", mode)}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${masterPattern.trackingMode === mode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedDeclaredItem && activeTab === "scan" && (
              <div className="px-6 pt-5 pb-3 shrink-0">
                <div className="rounded-2xl border border-primary/15 bg-card shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Fast Scan</h3>
                      <p className="text-xs text-muted-foreground mt-1">{scanHelperText}</p>
                    </div>
                    <Badge variant="outline" className="bg-background border-border text-muted-foreground">
                      {masterPattern.trackingMode || "IMEI"}
                    </Badge>
                  </div>

                  {!allocationEditing ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          ref={inputRef}
                          type="text"
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          onKeyDown={handleScan}
                          className={`
                          w-full text-xl h-16 pl-14 pr-4 rounded-2xl border-2 shadow-sm focus-visible:ring-0 font-mono transition-all
                          bg-background text-foreground placeholder:text-muted-foreground
                          ${flashMessage?.type === "success"
                              ? "border-success/40 bg-success/10"
                              : "border-primary/30"
                            }
                        `}
                          placeholder={masterPattern.trackingMode === "IMEI" ? "Scan IMEI..." : "Scan Serial Number..."}
                        />
                        <ScanBarcode className="absolute left-5 top-5 text-muted-foreground" />
                      </div>

                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <p className="text-xs text-muted-foreground">
                          {batchConfigReady
                            ? `Scanner ready for ${masterPattern.trackingMode || "IMEI"} input.`
                            : "Scanning unlocks once the required setup details are complete."}
                        </p>
                        {flashMessage && (
                          <p className={`text-xs font-medium ${flashMessage?.type === "success" ? "text-[hsl(var(--success))]" : "text-primary"}`}>
                            {flashMessage.msg}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
                      Color allocation is still in progress. Finish the split on the left panel before scanning the first unit.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- 2. TABS: SCAN VS PURCHASE FILE --- */}
            <div className="px-6 pb-4 shrink-0">
              <div className="inline-flex w-full md:w-auto rounded-2xl border border-border bg-card p-1 gap-1">
              {selectedDeclaredItem && (
                <button
                  onClick={() => setActiveTab("scan")}
                  className={`min-w-[200px] rounded-xl px-4 py-3 text-left transition-colors ${activeTab === "scan" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ScanBarcode size={16} /> Fast Scan
                  </div>
                  <div className="mt-1 text-[11px] leading-tight text-current/80">
                    Encode one unit at a time
                  </div>
                </button>
              )}

              <button
                onClick={() => setActiveTab("purchasefile")}
                className={`min-w-[200px] rounded-xl px-4 py-3 text-left transition-colors ${activeTab === "purchasefile" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileSpreadsheet size={16} /> Import File
                </div>
                <div className="mt-1 text-[11px] leading-tight text-current/80">
                  Add multiple units from CSV
                </div>
              </button>
              </div>
            </div>

            {/* --- 3. DYNAMIC CONTENT AREA --- */}
            <div className="flex-1 min-h-0 flex flex-col px-6 pb-6 bg-background">
              {/* VIEW: FAST SCAN (requires selected item) */}
              {activeTab === "scan" && selectedDeclaredItem && (
                <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Live Table Component */}
                  <div className="bg-card rounded-2xl border border-border flex flex-col shadow-sm">
                    <div className="bg-muted/60 border-b border-border px-5 py-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Encoding Queue</h4>
                        <p className="text-xs text-muted-foreground">Recent scans for this declared item.</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentScannedItems.length} item{currentScannedItems.length === 1 ? "" : "s"} in this queue
                      </div>
                    </div>

                    <div>
                      {currentScannedItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <ScanBarcode size={32} className="opacity-50" />
                          </div>
                          <p className="text-base font-semibold text-foreground">No units encoded yet</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Scan the first {masterPattern.trackingMode === "Serial" ? "serial number" : "IMEI"} to start building this batch.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          <div className="hidden md:grid grid-cols-[120px_minmax(0,1.4fr)_140px_90px_44px] gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-background">
                            <div>IMEI/SN</div>
                            <div>Product</div>
                            <div>Price Summary</div>
                            <div>Method</div>
                            <div className="text-center">Del</div>
                          </div>
                        {currentScannedItems.map((scan, idx) => {
                          const variant = variants?.find(v => idEquals(v.id, scan.variant_id));
                          return (
                            <div
                              key={idx}
                              className={`grid grid-cols-1 md:grid-cols-[120px_minmax(0,1.4fr)_140px_90px_44px] gap-3 px-5 py-4 text-xs hover:bg-accent/30 animate-in slide-in-from-top-1 duration-200 ${idx === 0 ? "bg-primary/5" : "bg-card"}`}
                            >
                              <div className="font-mono text-foreground font-semibold truncate">
                                {scan.imei1 || scan.serial_number}
                                {scan.imei2 && <span className="text-muted-foreground ml-1">/ {scan.imei2}</span>}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-foreground font-medium truncate" title={variant?.variant_name || '-'}>
                                    {variant?.variant_name || '-'}
                                  </p>
                                  {idx === 0 && (
                                    <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10">
                                      Latest
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                  {scan.package && (
                                    <Badge variant="outline" className="bg-background border-border text-muted-foreground">
                                      {scan.package}
                                    </Badge>
                                  )}
                                  {scan.warranty && (
                                    <span className="truncate max-w-[320px]" title={scan.warranty}>
                                      {scan.warranty}
                                    </span>
                                  )}
                                  {(scan.cpu || scan.gpu) && (
                                    <span>{scan.cpu || '-'} / {scan.gpu || '-'}</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-muted-foreground font-mono">
                                <div>{formatMoney(scan.cost_price)}</div>
                                <div>{formatMoney(scan.cash_price)}</div>
                                <div>{formatMoney(scan.srp)}</div>
                              </div>

                              <div className="text-muted-foreground italic text-[11px] md:self-center">{scan.mode || "Scan"}</div>

                              <div className="text-left md:text-center">
                                <button
                                  onClick={() => handleRemoveItem(scan)}
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: PURCHASE FILE UPLOAD — covers ALL declared items */}
              {activeTab === "purchasefile" && (
                <PurchaseFileImportTab
                  productMasters={productMasters || []}
                  variants={variants || []}
                  declaredItemsList={declaredItemsList}
                  onImportReady={handlePurchaseFileAddToEncoded}
                />
              )}

              {/* No item selected + scan tab = prompt to select */}
              {activeTab === "scan" && !selectedDeclaredItem && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                  <PackageCheck size={48} className="opacity-30" />
                  <p className="text-sm font-semibold text-foreground">Select an item from the left list to start scanning</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex w-2/3 items-center justify-center bg-background flex-col text-muted-foreground gap-4">
            <div className="w-20 h-20 bg-card border border-border rounded-full flex items-center justify-center">
              <PackageCheck size={40} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Select an item from the left list to begin</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
