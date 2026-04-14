import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X } from "lucide-react";

const SEARCH_MIN_CHARS = 2;
const SEARCH_LIMIT = 25;
const buildSpecSummary = ({ requestedRam, requestedRom, requestedCondition }) =>
  [requestedRam, requestedRom, requestedCondition].filter(Boolean).join(" / ");

function DRItemsSection({
  formData,
  brands = [],
  productMasters,
  productSearchOpen,
  setProductSearchOpen,
  onAddItem,
  onItemChange,
  onRemoveItem,
  isManualDR = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const productMasterById = useMemo(
    () => new Map(productMasters.map((productMaster) => [productMaster.id, productMaster])),
    [productMasters]
  );

  const brandById = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand])),
    [brands]
  );

  const variantOptions = useMemo(() => {
    if (productSearchOpen["new"] !== true || debouncedSearchTerm.length < SEARCH_MIN_CHARS) return [];
    const searchTokens = debouncedSearchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    return productMasters
      .map((product) => {
        const brandName = brandById.get(product.brand_id)?.name || product?.model?.brand?.name || "";
        const productName = product.product_name || product.name || "";
        const productModel = product.model?.model_name || product.model || productName || "Unknown Product";
        const searchableText = [brandName, productName, productModel, product.master_sku].filter(Boolean).join(" ").toLowerCase();
        if (!searchTokens.every((token) => searchableText.includes(token))) return null;
        return {
          id: `pm-${product.id}`,
          value: searchableText,
          label: [brandName, productModel].filter(Boolean).join(" ") || productModel,
          subtitle: buildSpecSummary({ requestedRam: "", requestedRom: "", requestedCondition: "" }) || "No spec",
          product_master_id: product.id,
          product_name: productName,
          product_model: productModel,
          brand_name: brandName,
          requested_ram: "",
          requested_rom: "",
          requested_condition: "",
        };
      })
      .filter(Boolean)
      .slice(0, SEARCH_LIMIT);
  }, [brandById, debouncedSearchTerm, productMasters, productSearchOpen]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-lg font-semibold text-card-foreground">Received Items</h3>

        <div className="flex gap-2">
          <Popover
            open={productSearchOpen["new"]}
            onOpenChange={(open) => {
              setProductSearchOpen((prev) => ({ ...prev, new: open }));
              if (!open) {
                setSearchTerm("");
                setDebouncedSearchTerm("");
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="mr-2 h-4 w-4 text-info" />
                Add Products
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[500px] border border-border bg-popover p-0 text-popover-foreground"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command className="bg-popover text-popover-foreground">
                <CommandInput
                  placeholder="Search product, RAM, ROM, or condition..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="placeholder:text-muted-foreground"
                />
                <CommandEmpty className="text-muted-foreground">
                  {debouncedSearchTerm.length < SEARCH_MIN_CHARS
                    ? `Type at least ${SEARCH_MIN_CHARS} characters to search.`
                    : "No variant found."}
                </CommandEmpty>

                <CommandGroup className="max-h-[300px] overflow-y-auto">
                  {variantOptions.map((variant) => (
                    <CommandItem
                      key={variant.id}
                      value={variant.value}
                      onSelect={() => {
                        setSearchTerm("");
                        setDebouncedSearchTerm("");
                        setProductSearchOpen((prev) => ({ ...prev, new: false }));
                        onAddItem(variant);
                      }}
                      className="aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-popover-foreground">{variant.label}</span>
                        <span className="text-xs text-muted-foreground">{variant.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/80">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Product
              </th>
              {!isManualDR && (
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                  Expected Qty
                </th>
              )}
              <th className="bg-primary/10 px-3 py-3 text-center text-xs font-semibold uppercase text-primary">
                {isManualDR ? "Quantity" : "Actual Quantity"}
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                Unit Cost
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                Cash Price
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                SRP Price
              </th>
              {isManualDR && (
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                  Total
                </th>
              )}
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {formData.declared_items.length === 0 ? (
              <tr>
                <td colSpan={isManualDR ? 8 : 7} className="py-8 text-center italic text-muted-foreground">
                  No items yet. Select a supplier and add products.
                </td>
              </tr>
            ) : (
              formData.declared_items.map((item, index) => {
                const productMaster = productMasterById.get(item.product_master_id);
                const brandName = item.brand_name || brandById.get(productMaster?.brand_id)?.name || "";
                const modelName = item.product_model || productMaster?.model || productMaster?.name || item.product_name || "Unknown Model";
                const productDisplayName = [brandName, modelName].filter(Boolean).join(" ") || modelName;
                const requestedRam = item.requested_ram || "";
                const requestedRom = item.requested_rom || "";
                const requestedCondition = item.requested_condition || "";
                const specBadges = [
                  requestedRam && { key: "ram", label: requestedRam },
                  requestedRom && { key: "rom", label: requestedRom },
                  requestedCondition && { key: "condition", label: requestedCondition },
                ].filter(Boolean);

                const actualQty = parseInt(item.actual_quantity || 0, 10) || 0;
                const unitCost = parseFloat(item.unit_cost || 0) || 0;
                const lineTotal = actualQty * unitCost;
                const hasVariance = !isManualDR && actualQty !== (item.declared_quantity || 0);

                return (
                  <tr
                    key={index}
                    className={item.is_extra ? "bg-success/5" : "transition-colors hover:bg-accent/40"}
                  >
                    <td className="w-[40%] px-3 py-4 align-top">
                      {item.is_extra && (
                        <span className="mb-1 inline-block rounded border border-success/25 bg-success/10 px-1 py-0.5 text-[10px] font-bold uppercase text-success">
                          Extra Item
                        </span>
                      )}

                      <div className="font-medium text-foreground">{productDisplayName}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {specBadges.map((spec) => (
                          <Badge
                            key={`${index}-${spec.key}`}
                            variant="outline"
                            className="border-border bg-muted text-[10px] text-muted-foreground"
                          >
                            {spec.label}
                          </Badge>
                        ))}
                        {hasVariance && (
                          <span className="text-xs font-medium text-primary">Variance</span>
                        )}
                      </div>
                    </td>

                    {!isManualDR && (
                      <td className="w-[15%] px-3 py-4 text-center font-mono text-foreground align-top">
                        {item.declared_quantity}
                      </td>
                    )}

                    <td className={`bg-primary/5 px-3 py-4 align-top ${isManualDR ? "w-[16%]" : "w-[18%]"}`}>
                      <div className="flex flex-col items-center">
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.actual_quantity ?? ""}
                          onChange={(e) => onItemChange(index, "actual_quantity", e.target.value)}
                          className={`mx-auto border-border bg-background text-center focus-visible:ring-2 focus-visible:ring-ring ${isManualDR ? "h-9 w-24 font-bold text-primary" : "h-8 w-24 text-foreground"}`}
                        />
                      </div>
                    </td>

                    <td className={`px-3 py-4 align-top ${isManualDR ? "w-[16%]" : "w-[18%]"}`}>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.unit_cost ?? ""}
                        onChange={(e) => onItemChange(index, "unit_cost", e.target.value)}
                        className={`mx-auto border-border bg-background text-center text-foreground focus-visible:ring-2 focus-visible:ring-ring ${isManualDR ? "h-9 w-24" : "h-8 w-28"}`}
                      />
                    </td>

                    <td className={`px-3 py-4 align-top ${isManualDR ? "w-[16%]" : "w-[18%]"}`}>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.cash_price ?? ""}
                        onChange={(e) => onItemChange(index, "cash_price", e.target.value)}
                        className={`mx-auto border-border bg-background text-center text-foreground focus-visible:ring-2 focus-visible:ring-ring ${isManualDR ? "h-9 w-24" : "h-8 w-28"}`}
                      />
                    </td>

                    <td className={`px-3 py-4 align-top ${isManualDR ? "w-[16%]" : "w-[18%]"}`}>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.srp_price ?? ""}
                        onChange={(e) => onItemChange(index, "srp_price", e.target.value)}
                        className={`mx-auto border-border bg-background text-center text-foreground focus-visible:ring-2 focus-visible:ring-ring ${isManualDR ? "h-9 w-24" : "h-8 w-28"}`}
                      />
                    </td>

                    {isManualDR && (
                      <td className="w-[15%] px-3 py-4 text-center font-mono text-foreground align-top">
                        {lineTotal > 0
                          ? lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : "—"}
                      </td>
                    )}

                    <td className={`px-3 py-4 text-center align-top ${isManualDR ? "w-[10%]" : "w-[12%]"}`}>
                      {item.is_extra ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onRemoveItem(index)}
                          className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="h-8 w-8" />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(DRItemsSection);
