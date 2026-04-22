import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Package,
  DollarSign,
  Tag,
  Warehouse,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Barcode,
  Image as ImageIcon,
  Store,
} from "lucide-react";

export default function PriceCheckView({ onClose, currentWarehouseId }) {
  const inputRef = useRef(null);

  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (termOverride = null) => {
    const term = (termOverride ?? searchInput).trim();
    if (!term) return;

    setIsSearching(true);
    setErrorMessage("");

    try {
      const { data } = await axios.get(route("pos.price-check.search"), {
        params: {
          search: term,
          warehouse_id: currentWarehouseId || null,
        },
      });

      if (!data?.found) {
        setResult(null);
        setSelectedVariantId(null);
        setErrorMessage(data?.message || "No product matched your search.");
        return;
      }

      setResult(data);
      setSelectedVariantId(data?.variant?.id || null);
    } catch (error) {
      setResult(null);
      setSelectedVariantId(null);
      setErrorMessage(error?.response?.data?.message || "Failed to search product. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleVariantSelect = (variantId) => {
    if (!result?.variants?.length) return;
    const variant = result.variants.find((entry) => entry.id === variantId);
    if (!variant) return;

    setSelectedVariantId(variantId);
    if (variant.variant_sku) {
      handleSearch(variant.variant_sku);
    } else if (variant.variant_name) {
      handleSearch(variant.variant_name);
    }
  };

  const stockByBranch = result?.stock_by_branch || [];
  const currentBranch = result?.current_branch || null;
  const currentBranchStock = useMemo(() => {
    if (!stockByBranch.length) return null;
    return stockByBranch.find((entry) => entry.is_current_branch) || null;
  }, [stockByBranch]);

  const selectedProduct = result?.product || null;
  const selectedVariant = result?.variant || null;
  const priceInfo = result?.pricing || null;
  const variants = result?.variants || [];
  const promotions = result?.promotions || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Price Check</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {currentBranch && `${currentBranch.name} | `}Press F3 to toggle | ESC to return to POS
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Back to POS
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={inputRef}
                  placeholder="Scan barcode, enter IMEI, SKU, or product name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-14 pl-10 text-lg"
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="h-14 bg-blue-600 px-8 hover:bg-blue-700"
              >
                <Search className="mr-2 h-5 w-5" />
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            {errorMessage ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedProduct ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    Product Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      {selectedProduct.image_url ? (
                        <img
                          src={selectedProduct.image_url}
                          alt={selectedProduct.name}
                          className="h-48 w-48 rounded-lg border-2 border-gray-200 bg-white object-contain"
                        />
                      ) : (
                        <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-100">
                          <ImageIcon className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedProduct.name}
                        </h2>
                        {selectedVariant?.variant_name ? (
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {selectedVariant.variant_name}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Master SKU</p>
                          <p className="font-mono font-semibold">{selectedProduct.master_sku || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Variant SKU</p>
                          <p className="font-mono font-semibold">{selectedVariant?.variant_sku || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Brand</p>
                          <p className="font-semibold">{selectedProduct.brand_name || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Category</p>
                          <p className="font-semibold">{selectedProduct.category_name || "N/A"}</p>
                        </div>
                      </div>

                      {variants.length > 1 ? (
                        <div className="mt-4">
                          <p className="mb-2 text-sm font-semibold">Select Variant:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {variants.map((variant) => (
                              <Button
                                key={variant.id}
                                variant={selectedVariantId === variant.id ? "default" : "outline"}
                                onClick={() => handleVariantSelect(variant.id)}
                                className="justify-start"
                              >
                                {variant.variant_name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {priceInfo ? (
                <Card className="border-2 border-green-200">
                  <CardHeader className="bg-green-50 dark:bg-green-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Pricing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Suggested Retail Price (SRP)</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            ?{Number(priceInfo.srp || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Cash Price</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ?{Number(priceInfo.cash_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-lg font-semibold text-green-900 dark:text-green-100">Final Price</span>
                          <span className="text-3xl font-bold text-green-600">
                            ?{Number(priceInfo.final_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Price before tax</span>
                          <span>?{Number(priceInfo.price_before_tax || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>VAT ({Number(priceInfo.tax_rate || 0)}%)</span>
                          <span>?{Number(priceInfo.tax_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {promotions.length > 0 ? (
                <Card className="border-2 border-orange-200">
                  <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-orange-600" />
                      Active Promotions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {promotions.map((promo, idx) => (
                        <div key={idx} className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{promo.promo_name || "Promotion"}</h4>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{promo.description || "Active promotion"}</p>
                            </div>
                            {promo.promo_code ? <Badge className="bg-orange-600">{promo.promo_code}</Badge> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="space-y-6">
              <Card className={`border-2 ${currentBranchStock && currentBranchStock.count > 0 ? "border-green-300" : "border-red-300"}`}>
                <CardHeader className={currentBranchStock && currentBranchStock.count > 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}>
                  <CardTitle className="flex items-center gap-2">
                    <Store className={`h-5 w-5 ${currentBranchStock && currentBranchStock.count > 0 ? "text-green-600" : "text-red-600"}`} />
                    Current Branch Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {currentBranchStock ? (
                    <div className="text-center">
                      <div className={`mb-2 text-6xl font-bold ${currentBranchStock.count > 0 ? "text-green-600" : "text-red-600"}`}>
                        {currentBranchStock.count}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {currentBranchStock.count === 0 ? "Out of Stock" : currentBranchStock.count <= 5 ? "Low Stock" : "Units Available"}
                      </p>
                      {currentBranchStock.count > 0 && currentBranchStock.count <= 5 ? (
                        <Badge variant="destructive" className="mt-2">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Low Stock Alert
                        </Badge>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p className="text-3xl font-bold text-red-600">0</p>
                      <p>No stock at current branch</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-blue-600" />
                    Stock at Other Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {stockByBranch
                      .filter((entry) => !entry.is_current_branch)
                      .map((stock, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{stock.warehouse_name}</span>
                          </div>
                          <Badge className={stock.count > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {stock.count > 0 ? (
                              <>
                                <CheckCircle2 className="mr-1 h-3 w-3" /> {stock.count} units
                              </>
                            ) : (
                              <>Out of Stock</>
                            )}
                          </Badge>
                        </div>
                      ))}

                    {stockByBranch.filter((entry) => !entry.is_current_branch).length === 0 ? (
                      <p className="py-4 text-center text-gray-500">No stock available at other locations</p>
                    ) : null}
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <span className="font-semibold">Total System-Wide Stock</span>
                    <span className="text-xl font-bold text-blue-600">{Number(result?.total_stock || 0)} units</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-16">
              <div className="text-center text-gray-500">
                <Barcode className="mx-auto mb-4 h-24 w-24 text-gray-300" />
                <h3 className="mb-2 text-xl font-semibold">No Product Selected</h3>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                  Scan a barcode or enter product information to view pricing and stock details
                </p>
                <div className="flex justify-center gap-4">
                  <Badge variant="outline" className="px-4 py-2">
                    <Search className="mr-2 h-4 w-4" />
                    Search by Name/SKU
                  </Badge>
                  <Badge variant="outline" className="px-4 py-2">
                    <Barcode className="mr-2 h-4 w-4" />
                    Scan Barcode
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
