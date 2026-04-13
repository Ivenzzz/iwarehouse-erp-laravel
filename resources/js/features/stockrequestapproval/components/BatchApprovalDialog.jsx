import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Infinity as InfinityIcon,
  Layers,
  Package,
  ShoppingCart,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "batch_approval_consolidated_items";

const getDaysOfInventory = (soh, ads) => {
  if (!ads || ads <= 0) return Number.POSITIVE_INFINITY;
  return soh / ads;
};

const getLastSaleLabel = (ads) => {
  if (!ads || ads <= 0) {
    return {
      title: "No recent sales",
      detail: "No movement in the last 2 weeks",
    };
  }

  if (ads < 0.5) {
    return {
      title: "Slow movement",
      detail: "Recent demand is very limited",
    };
  }

  if (ads < 1.5) {
    return {
      title: "Steady movement",
      detail: "Demand is moderate and stable",
    };
  }

  return {
    title: "Active selling",
    detail: "Recent demand supports replenishment",
  };
};

const getRecommendationState = (data, itemValid) => {
  const approvedQty = Number(data.approvedQty || 0);
  const requestedQty = Number(data.requestedQty || 0);
  const recommendedLimit = Number(data.recommendedLimit || 0);
  const ads = Number(data.branchADS || 0);

  if (!itemValid) {
    return {
      tone:
        "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200",
      icon: AlertTriangle,
      title: "Allocation mismatch",
      reason: "Transfer plus RFQ must equal the approved quantity.",
    };
  }

  if (ads <= 0) {
    return {
      tone:
        "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200",
      icon: AlertTriangle,
      title: "Do Not Approve: No Recent Sales",
      reason: "No sales signal in the current demand window.",
    };
  }

  if (approvedQty > recommendedLimit && recommendedLimit > 0) {
    return {
      tone:
        "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200",
      icon: AlertTriangle,
      title: "Overstock Risk",
      reason: `Approved qty is above the ${recommendedLimit}-unit demand cover.`,
    };
  }

  if (approvedQty < requestedQty) {
    return {
      tone:
        "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200",
      icon: AlertTriangle,
      title: "Adjusted Approval",
      reason: "Approved quantity has been reduced from the original request.",
    };
  }

  return {
    tone:
      "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200",
    icon: CheckCircle2,
    title: "Safe To Approve",
    reason: "Demand, stock position, and allocation are aligned.",
  };
};

const formatDaysOfInventory = (daysOfInventory, ads) => {
  if (!ads || ads <= 0 || !Number.isFinite(daysOfInventory)) {
    return {
      value: null,
      detail: "No Sales",
      tone: "text-red-600 dark:text-red-400",
      isInfinite: true,
    };
  }

  const rounded = daysOfInventory < 10 ? daysOfInventory.toFixed(1) : Math.round(daysOfInventory);

  if (daysOfInventory > 21) {
    return {
      value: rounded,
      detail: "High Cover",
      tone: "text-amber-600 dark:text-amber-400",
      isInfinite: false,
    };
  }

  if (daysOfInventory < 7) {
    return {
      value: rounded,
      detail: "Low Cover",
      tone: "text-emerald-600 dark:text-emerald-400",
      isInfinite: false,
    };
  }

  return {
    value: rounded,
    detail: "Balanced",
    tone: "text-slate-700 dark:text-slate-300",
    isInfinite: false,
  };
};

const NumberSpinnerInput = ({
  value,
  onChange,
  min = 0,
  max,
  className = "",
}) => {
  const numericValue = Number(value || 0);

  const updateValue = (nextValue) => {
    let parsed = Number.parseInt(nextValue, 10);
    if (Number.isNaN(parsed)) parsed = min;
    parsed = Math.max(min, parsed);
    if (typeof max === "number") {
      parsed = Math.min(max, parsed);
    }
    onChange(String(parsed));
  };

  return (
    <div
      className={`flex h-11 overflow-hidden rounded-xl border border-input bg-background text-foreground shadow-sm ${className}`}
    >
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full border-0 bg-transparent text-center text-xl font-semibold text-foreground shadow-none focus-visible:ring-0"
      />
      <div className="flex w-10 flex-col border-l border-input">
        <button
          type="button"
          onClick={() => updateValue(String(numericValue + 1))}
          className="flex flex-1 items-center justify-center text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronDown className="h-4 w-4 rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => updateValue(String(numericValue - 1))}
          className="flex flex-1 items-center justify-center border-t border-input text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const badgeClassName = "text-[10px] px-1.5 h-5";

const getConditionBadgeClassName = (condition) => {
  const isCPO = condition === "Certified Pre-Owned";
  return `${badgeClassName} ${
    isCPO
      ? "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
      : "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20"
  }`;
};

export function BatchApprovalDialog({
  open,
  onOpenChange,
  stockRequests,
  allocationData,
  onConfirm,
  onDecline,
}) {
  const [allocations, setAllocations] = useState([]);
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [originalAllocations, setOriginalAllocations] = useState([]);

  useEffect(() => {
    if (open && stockRequests && allocationData) {
      const storedData = localStorage.getItem(STORAGE_KEY);

      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const currentSrIds = allocationData.map((d) => d.srId).sort().join(",");
          if (parsed.srIds === currentSrIds && parsed.consolidated) {
            setAllocations(parsed.allocations);
            setOriginalAllocations(parsed.originalAllocations);
            setIsConsolidated(true);
            return;
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      const initialAllocations = allocationData.map((data) => ({
        ...data,
        approvedQty: data.requestedQty,
        transferQty: data.defaultTransfer,
        rfqQty: data.defaultRFQ,
      }));
      setAllocations(initialAllocations);
      setOriginalAllocations(initialAllocations);
      setIsConsolidated(false);
    }
  }, [open, stockRequests, allocationData]);

  const saveToLocalStorage = (consolidated, allocs, origAllocs) => {
    const srIds = allocationData?.map((d) => d.srId).sort().join(",") || "";
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        srIds,
        consolidated,
        allocations: allocs,
        originalAllocations: origAllocs,
      })
    );
  };

  const handleConsolidate = () => {
    if (isAnimating || isConsolidated) return;

    setIsAnimating(true);

    setTimeout(() => {
      const consolidated = {};

      allocations.forEach((item) => {
        const key = item.groupKey || item.variantId || item.productMasterId;
        if (!consolidated[key]) {
          consolidated[key] = {
            ...item,
            groupKey: key,
            srNumbers: [item.srNumber],
            branchNames: [item.branchName],
            srIds: [item.srId],
            originalItems: [item],
          };
        } else {
          consolidated[key].requestedQty += item.requestedQty;
          consolidated[key].approvedQty += item.approvedQty;
          consolidated[key].transferQty += item.transferQty;
          consolidated[key].rfqQty += item.rfqQty;
          consolidated[key].branchADS += item.branchADS;
          consolidated[key].recommendedLimit += item.recommendedLimit;
          consolidated[key].srNumbers.push(item.srNumber);
          consolidated[key].branchNames.push(item.branchName);
          consolidated[key].srIds.push(item.srId);
          consolidated[key].originalItems.push(item);
        }
      });

      const consolidatedArray = Object.values(consolidated).map((item) => ({
        ...item,
        srNumber: item.srNumbers.join(", "),
        branchName: `${item.branchNames.length} branches`,
      }));

      setAllocations(consolidatedArray);
      setIsConsolidated(true);
      setIsAnimating(false);
      saveToLocalStorage(true, consolidatedArray, originalAllocations);
    }, 800);
  };

  const handleRevert = () => {
    setAllocations(originalAllocations);
    setIsConsolidated(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleClose = (isOpen) => {
    onOpenChange(isOpen);
  };

  const handleApprovedQtyChange = (index, value) => {
    const approved = Math.max(0, parseInt(value, 10) || 0);
    const data = allocations[index];
    const newTransfer = Math.min(data.mainWarehouseStock, approved);
    const newRFQ = Math.max(0, approved - newTransfer);

    const newAllocations = [...allocations];
    newAllocations[index] = {
      ...data,
      approvedQty: approved,
      transferQty: newTransfer,
      rfqQty: newRFQ,
    };
    setAllocations(newAllocations);
  };

  const handleTransferQtyChange = (index, value) => {
    const transfer = Math.max(0, parseInt(value, 10) || 0);
    const data = allocations[index];
    const cappedTransfer = Math.min(transfer, data.mainWarehouseStock);
    const newRFQ = Math.max(0, data.approvedQty - cappedTransfer);

    const newAllocations = [...allocations];
    newAllocations[index] = {
      ...data,
      transferQty: cappedTransfer,
      rfqQty: newRFQ,
    };
    setAllocations(newAllocations);
  };

  const handleRfqQtyChange = (index, value) => {
    const rfq = Math.max(0, parseInt(value, 10) || 0);
    const newAllocations = [...allocations];
    newAllocations[index] = {
      ...newAllocations[index],
      rfqQty: rfq,
    };
    setAllocations(newAllocations);
  };

  const isValid = allocations.every(
    (alloc) => Number(alloc.transferQty) + Number(alloc.rfqQty) === Number(alloc.approvedQty)
  );

  const totalApproved = allocations.reduce(
    (sum, item) => sum + Number(item.approvedQty || 0),
    0
  );
  const totalTransfer = allocations.reduce(
    (sum, item) => sum + Number(item.transferQty || 0),
    0
  );
  const totalRFQ = allocations.reduce((sum, item) => sum + Number(item.rfqQty || 0), 0);

  const handleConfirm = () => {
    if (!isValid) return;

    let finalAllocations = allocations;
    if (isConsolidated) {
      finalAllocations = [];
      allocations.forEach((consolidatedItem) => {
        if (consolidatedItem.originalItems && consolidatedItem.originalItems.length > 1) {
          const totalOriginalRequested = consolidatedItem.originalItems.reduce(
            (sum, oi) => sum + oi.requestedQty,
            0
          );
          consolidatedItem.originalItems.forEach((origItem) => {
            const ratio = origItem.requestedQty / totalOriginalRequested;
            finalAllocations.push({
              ...origItem,
              approvedQty: Math.round(consolidatedItem.approvedQty * ratio),
              transferQty: Math.round(consolidatedItem.transferQty * ratio),
              rfqQty: Math.round(consolidatedItem.rfqQty * ratio),
            });
          });
        } else {
          finalAllocations.push(consolidatedItem);
        }
      });
    }

    localStorage.removeItem(STORAGE_KEY);
    onConfirm(finalAllocations);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="grid max-h-[92vh] w-[min(96vw,96rem)] max-w-none overflow-hidden border-border bg-card p-0 text-card-foreground shadow-2xl">
        <DialogHeader className="min-w-0 border-b border-border bg-card px-6 py-5">
          <DialogTitle className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[28px] font-semibold leading-none tracking-tight text-foreground">
                  Batch Stock Allocation & Review ({allocations.length} Item{allocations.length !== 1 ? "s" : ""})
                </p>
              </div>
            </div>
            {!isConsolidated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConsolidate}
                disabled={isAnimating || allocations.length <= 1}
                className="h-12 shrink-0 self-start rounded-xl border-border bg-background px-5 text-sm font-medium text-primary hover:bg-accent hover:text-primary"
              >
                <Layers className="mr-2 h-4 w-4" />
                Consolidate Transfers
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevert}
                className="h-12 shrink-0 self-start rounded-xl border-border bg-background px-5 text-sm font-medium text-amber-700 hover:bg-accent hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Revert View
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isAnimating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary"
                      >
                        <Package className="h-5 w-5 text-primary-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Consolidating items...
                </p>
              </div>
            </div>
          )}

        <div className="min-h-0 min-w-0 overflow-hidden px-5 py-5">
          {isConsolidated && (
            <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              Items are consolidated by product spec. Quantities will be redistributed back to the original requests on confirm.
            </div>
          )}

          <div className="min-w-0 overflow-hidden rounded-[22px] border border-border bg-background shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
            <div className="max-h-[62vh] min-w-0 overflow-x-auto overflow-y-auto">
              <table className="min-w-[1400px] border-collapse">
                <thead className="sticky top-0 z-20 bg-muted/60 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/50">
                  <tr className="border-b border-border text-left text-[13px] font-semibold text-foreground">
                    <th className="px-5 py-4">Item / Spec</th>
                    <th className="px-4 py-4 text-center">Requested</th>
                    <th className="px-4 py-4 text-center">SOH</th>
                    <th className="px-4 py-4 text-center">Main Warehouse</th>
                    <th className="px-4 py-4 text-center">Days of Inv.</th>
                    <th className="px-4 py-4 text-center">ADS (7 Days)</th>
                    <th className="px-4 py-4 text-center">Last Sale</th>
                    <th className="px-4 py-4">Recommendation</th>
                    <th className="px-4 py-4 text-center">Approved Qty</th>
                    <th className="px-4 py-4 text-center">Transfer From</th>
                    <th className="px-4 py-4 text-center">RFQ</th>
                  </tr>
                </thead>
                <tbody className="bg-background">
                  {allocations.map((data, index) => {
                    const totalAllocated =
                      Number(data.transferQty || 0) + Number(data.rfqQty || 0);
                    const itemValid = totalAllocated === Number(data.approvedQty || 0);
                    const recommendation = getRecommendationState(data, itemValid);
                    const RecommendationIcon = recommendation.icon;
                    const daysOfInventory = getDaysOfInventory(data.branchSOH || 0, data.branchADS || 0);
                    const daysDisplay = formatDaysOfInventory(daysOfInventory, data.branchADS || 0);
                    const lastSale = getLastSaleLabel(data.branchADS || 0);
                    const overstock = Number(data.approvedQty || 0) > Number(data.recommendedLimit || 0);
                    const itemDisplay = data.itemDisplay || {};
                    const itemTitle = [itemDisplay.title || data.itemName, itemDisplay.modelCode]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <tr
                        key={`${data.groupKey || data.variantId || data.productMasterId}-${index}`}
                        className="border-b border-border align-top last:border-b-0"
                      >
                        <td className="px-5 py-5">
                          <div className="space-y-2">
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium leading-5 text-foreground">
                                  {itemTitle}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {itemDisplay.condition && (
                                    <Badge variant="outline" className={getConditionBadgeClassName(itemDisplay.condition)}>
                                      {itemDisplay.condition === "Certified Pre-Owned" ? "CPO" : itemDisplay.condition}
                                    </Badge>
                                  )}
                                  {itemDisplay.ram && (
                                    <Badge variant="outline" className={`${badgeClassName} bg-violet-100/50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20`}>
                                      {itemDisplay.ram}
                                    </Badge>
                                  )}
                                  {itemDisplay.rom && (
                                    <Badge variant="outline" className={`${badgeClassName} bg-sky-100/50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20`}>
                                      {itemDisplay.rom}
                                    </Badge>
                                  )}
                                  {itemDisplay.color && (
                                    <Badge variant="outline" className={`${badgeClassName} bg-pink-100/50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20`}>
                                      {itemDisplay.color}
                                    </Badge>
                                  )}
                                  {itemDisplay.cpu && (
                                    <Badge variant="outline" className={`${badgeClassName} bg-indigo-100/50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20`}>
                                      {itemDisplay.cpu}
                                    </Badge>
                                  )}
                                  {itemDisplay.gpu && (
                                    <Badge variant="outline" className={`${badgeClassName} bg-cyan-100/50 text-cyan-700 border-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-400 dark:border-cyan-400/20`}>
                                      {itemDisplay.gpu}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {data.srNumber} | {data.branchName}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {overstock && (
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                                  Overstock Risk
                                </span>
                              )}
                              {data.originalItems && data.originalItems.length > 1 && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                  <Layers className="h-3 w-3" />
                                  {data.originalItems.length} Combined
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center text-[18px] font-semibold text-foreground">
                          {data.requestedQty}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span
                            className={`text-[18px] font-semibold ${
                              Number(data.branchSOH || 0) === 0
                                ? "text-red-600"
                                : Number(data.branchSOH || 0) < Number(data.requestedQty || 0)
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {data.branchSOH || 0}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-center text-[18px] font-semibold text-foreground">
                          {data.mainWarehouseStock}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className={`text-[18px] font-semibold ${daysDisplay.tone}`}>
                            {daysDisplay.isInfinite ? (
                              <InfinityIcon className="mx-auto h-5 w-5" />
                            ) : (
                              daysDisplay.value
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">({daysDisplay.detail})</div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="text-[18px] font-semibold text-foreground">
                            {Number(data.branchADS || 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Limit {data.recommendedLimit}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="text-[15px] font-semibold text-foreground">
                            {lastSale.title}
                          </div>
                          <div className="text-xs text-muted-foreground">{lastSale.detail}</div>
                        </td>
                        <td className="px-4 py-5">
                          <div
                            className={`rounded-xl border px-4 py-3 ${recommendation.tone}`}
                          >
                            <div className="flex items-start gap-2">
                              <RecommendationIcon className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold">{recommendation.title}</p>
                                <p className="text-xs opacity-80">{recommendation.reason}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <NumberSpinnerInput
                            value={data.approvedQty}
                            onChange={(value) => handleApprovedQtyChange(index, value)}
                          />
                        </td>
                        <td className="px-4 py-5">
                          <div className="space-y-2">
                            <NumberSpinnerInput
                              value={data.transferQty}
                              max={data.mainWarehouseStock}
                              onChange={(value) => handleTransferQtyChange(index, value)}
                            />
                            <div className="flex h-11 items-center justify-between rounded-xl border border-input bg-background px-4 text-sm text-foreground shadow-sm">
                              <div className="flex items-center gap-2 truncate">
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                <span>Main Warehouse ({data.mainWarehouseStock} Available)</span>
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="space-y-2">
                            <NumberSpinnerInput
                              value={data.rfqQty}
                              onChange={(value) => handleRfqQtyChange(index, value)}
                            />
                            <div
                              className={`rounded-xl border px-3 py-2 text-center text-xs font-medium ${
                                Number(data.rfqQty || 0) > 0
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-input bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              {Number(data.rfqQty || 0) > 0
                                ? `${data.rfqQty} units to RFQ`
                                : "No RFQ needed"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="min-w-0 flex items-center justify-between border-t border-border bg-muted/30 px-5 py-4 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 shrink-0 rounded-xl border-border bg-transparent px-8 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
            <div className="hidden shrink-0 rounded-xl border border-border bg-background px-4 py-2 text-right text-xs text-muted-foreground md:block">
              <div>Approved: {totalApproved}</div>
              <div>Transfer: {totalTransfer} | RFQ: {totalRFQ}</div>
            </div>

            <Button
              variant="destructive"
              onClick={onDecline}
              className="h-12 shrink-0 rounded-xl px-6 text-base font-medium"
            >
              Decline
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid}
              className="h-12 shrink-0 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:bg-primary/40 disabled:text-primary-foreground/70"
            >
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
