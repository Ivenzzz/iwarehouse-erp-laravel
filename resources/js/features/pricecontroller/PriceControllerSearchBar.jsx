import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Hash, X } from "lucide-react";

export default function PriceControllerSearchBar({
  variantOptions = [],
  selectedVariant,
  onVariantQueryChange,
  onSearchByVariant,
  onSearchByIdentifier,
  isSearching,
  isLoadingVariants,
}) {
  const [searchMode, setSearchMode] = useState("variant");
  const [variantQuery, setVariantQuery] = useState(selectedVariant?.label ?? "");
  const [identifierQuery, setIdentifierQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (selectedVariant?.label) {
      setVariantQuery(selectedVariant.label);
    }
  }, [selectedVariant?.id, selectedVariant?.label]);

  useEffect(() => {
    if (searchMode !== "variant") return undefined;

    const timer = window.setTimeout(() => {
      onVariantQueryChange(variantQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [onVariantQueryChange, searchMode, variantQuery]);

  const handleSelectVariant = (variant) => {
    setVariantQuery(variant.label);
    setShowDropdown(false);
    onSearchByVariant(variant.id);
  };

  const handleIdentifierSearch = () => {
    if (!identifierQuery.trim()) return;
    onSearchByIdentifier(identifierQuery.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={searchMode === "variant" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("variant")}
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          Search by Variant
        </Button>
        <Button
          variant={searchMode === "identifier" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("identifier")}
          className="gap-2"
        >
          <Hash className="w-4 h-4" />
          Search by IMEI / Serial
        </Button>
      </div>

      {searchMode === "variant" ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Type variant name, SKU, product name, or brand..."
              value={variantQuery}
              onChange={(e) => {
                setVariantQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              disabled={isSearching}
            />
            {variantQuery && (
              <button
                type="button"
                onClick={() => {
                  setVariantQuery("");
                  setShowDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showDropdown && variantOptions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
              {variantOptions.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => handleSelectVariant(variant)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {variant.variant_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {variant.description || variant.product_name} · {variant.variant_sku || variant.master_sku}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {variant.condition || "Brand New"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && isLoadingVariants && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
              Searching variants...
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Enter IMEI 1, IMEI 2, or Serial Number..."
              value={identifierQuery}
              onChange={(e) => setIdentifierQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIdentifierSearch()}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              disabled={isSearching}
            />
          </div>
          <Button onClick={handleIdentifierSearch} disabled={isSearching || !identifierQuery.trim()}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
      )}
    </div>
  );
}
