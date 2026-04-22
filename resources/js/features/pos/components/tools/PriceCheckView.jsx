import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, Package, DollarSign, Tag, Warehouse, MapPin, 
  AlertCircle, CheckCircle2, Barcode, Image as ImageIcon,
  Percent, Store, X
} from "lucide-react";

export default function PriceCheckView({ onClose, currentWarehouseId }) {
  const inputRef = useRef(null);
  
  const [searchInput, setSearchInput] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [productInventory, setProductInventory] = useState([]);
  const [activePromotions, setActivePromotions] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);

  // Queries
  const { data: productMasters = [] } = useQuery({
    queryKey: ['productMasters'],
    queryFn: () => base44.entities.ProductMaster.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['variants'],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list(),
    initialData: [],
    staleTime: 30 * 1000,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.ProductBrand.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ProductCategory.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  // Set current branch from props or session
  useEffect(() => {
    if (currentWarehouseId && warehouses.length > 0) {
      const warehouse = warehouses.find(w => w.id === currentWarehouseId);
      setCurrentBranch(warehouse);
    }
  }, [currentWarehouseId, warehouses]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Product search handler
  const handleSearch = () => {
    if (!searchInput.trim()) return;

    const term = searchInput.toLowerCase().trim();
    
    // Search by IMEI/Serial
    let foundInventory = inventory.find(inv => 
      inv.imei1?.toLowerCase() === term || 
      inv.serial_number?.toLowerCase() === term
    );

    if (foundInventory) {
      const variant = variants.find(v => v.id === foundInventory.variant_id);
      const product = productMasters.find(p => p.id === foundInventory.product_master_id);
      
      if (product && variant) {
        setSelectedProduct(product);
        setSelectedVariant(variant);
        loadProductDetails(product, variant);
        return;
      }
    }

    // Search by variant SKU
    const variant = variants.find(v => 
      v.variant_sku?.toLowerCase() === term ||
      v.variant_name?.toLowerCase().includes(term)
    );

    if (variant) {
      const product = productMasters.find(p => p.id === variant.product_master_id);
      if (product) {
        setSelectedProduct(product);
        setSelectedVariant(variant);
        loadProductDetails(product, variant);
        return;
      }
    }

    // Search by product SKU/name
    const product = productMasters.find(p => 
      p.master_sku?.toLowerCase() === term ||
      p.name?.toLowerCase().includes(term)
    );

    if (product) {
      setSelectedProduct(product);
      const productVariants = variants.filter(v => v.product_master_id === product.id);
      if (productVariants.length === 1) {
        setSelectedVariant(productVariants[0]);
        loadProductDetails(product, productVariants[0]);
      } else {
        setSelectedVariant(null);
        loadProductDetails(product, null);
      }
      return;
    }

    alert('Product not found. Please try scanning the barcode or entering a valid SKU/product name.');
  };

  const loadProductDetails = (product, variant) => {
    // Load inventory
    const inventoryItems = inventory.filter(inv => {
      if (variant) {
        return inv.variant_id === variant.id && inv.status === 'available';
      }
      return inv.product_master_id === product.id && inv.status === 'available';
    });
    setProductInventory(inventoryItems);

    // Load active promotions
    const today = new Date();
    const applicablePromos = promotions.filter(promo => {
      if (!promo.is_active) return false;
      
      const startDate = promo.start_date ? new Date(promo.start_date) : null;
      const endDate = promo.end_date ? new Date(promo.end_date) : null;
      
      if (startDate && today < startDate) return false;
      if (endDate && today > endDate) return false;

      if (promo.applicable_products && promo.applicable_products.length > 0) {
        return promo.applicable_products.includes(product.id);
      }

      if (promo.applicable_categories && promo.applicable_categories.length > 0) {
        return promo.applicable_categories.includes(product.category_id);
      }

      if (promo.applicable_brands && promo.applicable_brands.length > 0) {
        return promo.applicable_brands.includes(product.brand_id);
      }

      return false;
    });

    setActivePromotions(applicablePromos);
  };

  const calculatePrice = () => {
    if (!selectedVariant && productInventory.length === 0) return null;

    const sampleInventory = productInventory[0];
    if (!sampleInventory) return null;

    let basePrice = sampleInventory.srp || 0;
    let sellingPrice = sampleInventory.cash_price || basePrice;
    let taxRate = 0.12;
    let taxAmount = sellingPrice * taxRate;
    let discountAmount = 0;
    let finalPrice = sellingPrice;

    if (activePromotions.length > 0) {
      const bestPromo = activePromotions.reduce((best, promo) => {
        let discount = 0;
        
        if (promo.promo_type === 'percentage_discount') {
          discount = sellingPrice * (promo.discount_percentage / 100);
        } else if (promo.promo_type === 'fixed_discount') {
          discount = promo.discount_amount;
        }

        return discount > best.discount ? { promo, discount } : best;
      }, { promo: null, discount: 0 });

      if (bestPromo.promo) {
        discountAmount = bestPromo.discount;
        finalPrice = sellingPrice - discountAmount;
        taxAmount = finalPrice * taxRate;
      }
    }

    return {
      basePrice,
      sellingPrice,
      discountAmount,
      finalPrice,
      taxAmount,
      taxRate: taxRate * 100,
      priceBeforeTax: finalPrice - taxAmount,
    };
  };

  const getStockByBranch = () => {
    const stockByBranch = {};
    
    productInventory.forEach(inv => {
      const warehouseId = inv.warehouse_id;
      if (!stockByBranch[warehouseId]) {
        const warehouse = warehouses.find(w => w.id === warehouseId);
        stockByBranch[warehouseId] = {
          warehouse,
          count: 0,
          isCurrentBranch: warehouse?.id === currentBranch?.id
        };
      }
      stockByBranch[warehouseId].count++;
    });

    return Object.values(stockByBranch).sort((a, b) => {
      if (a.isCurrentBranch) return -1;
      if (b.isCurrentBranch) return 1;
      return b.count - a.count;
    });
  };

  const brand = selectedProduct ? brands.find(b => b.id === selectedProduct.brand_id) : null;
  const category = selectedProduct ? categories.find(c => c.id === selectedProduct.category_id) : null;
  const priceInfo = calculatePrice();
  const stockByBranch = getStockByBranch();
  const currentBranchStock = stockByBranch.find(s => s.isCurrentBranch);
  const productVariants = selectedProduct ? variants.filter(v => v.product_master_id === selectedProduct.id) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Price Check</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {currentBranch && `${currentBranch.name} | `}Press F3 to toggle | ESC to return to POS
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Back to POS
          </Button>
        </div>
        {/* Search Input */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  ref={inputRef}
                  placeholder="Scan barcode, enter IMEI, SKU, or product name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 text-lg h-14"
                />
              </div>
              <Button 
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 h-14 px-8"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        {selectedProduct && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Product Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
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
                          className="w-48 h-48 object-contain border-2 border-gray-200 rounded-lg bg-white"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {selectedProduct.name}
                        </h2>
                        {selectedVariant && (
                          <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                            {selectedVariant.variant_name}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Master SKU</p>
                          <p className="font-mono font-semibold">{selectedProduct.master_sku}</p>
                        </div>
                        {selectedVariant && (
                          <div>
                            <p className="text-xs text-gray-500">Variant SKU</p>
                            <p className="font-mono font-semibold">{selectedVariant.variant_sku}</p>
                          </div>
                        )}
                        {brand && (
                          <div>
                            <p className="text-xs text-gray-500">Brand</p>
                            <p className="font-semibold">{brand.name}</p>
                          </div>
                        )}
                        {category && (
                          <div>
                            <p className="text-xs text-gray-500">Category</p>
                            <p className="font-semibold">{category.name}</p>
                          </div>
                        )}
                      </div>

                      {!selectedVariant && productVariants.length > 1 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2">Select Variant:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {productVariants.map(variant => (
                              <Button
                                key={variant.id}
                                variant="outline"
                                onClick={() => {
                                  setSelectedVariant(variant);
                                  loadProductDetails(selectedProduct, variant);
                                }}
                                className="justify-start"
                              >
                                {variant.variant_name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Card */}
              {priceInfo && (
                <Card className="border-2 border-green-200">
                  <CardHeader className="bg-green-50 dark:bg-green-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Pricing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Suggested Retail Price (SRP)</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            ₱{priceInfo.basePrice.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Cash Price</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ₱{priceInfo.sellingPrice.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                          </p>
                        </div>
                      </div>

                      {priceInfo.discountAmount > 0 && (
                        <>
                          <Separator />
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-red-800 dark:text-red-300">Discount Applied</span>
                              <span className="text-xl font-bold text-red-600">
                                -₱{priceInfo.discountAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-semibold text-green-900 dark:text-green-100">Final Price</span>
                          <span className="text-3xl font-bold text-green-600">
                            ₱{priceInfo.finalPrice.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Price before tax</span>
                          <span>₱{priceInfo.priceBeforeTax.toLocaleString('en-PH', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>VAT ({priceInfo.taxRate}%)</span>
                          <span>₱{priceInfo.taxAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Promotions Card */}
              {activePromotions.length > 0 && (
                <Card className="border-2 border-orange-200">
                  <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-orange-600" />
                      Active Promotions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {activePromotions.map((promo, idx) => (
                        <div key={idx} className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Percent className="w-4 h-4 text-orange-600" />
                                {promo.promo_name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {promo.promo_type === 'percentage_discount' && `${promo.discount_percentage}% OFF`}
                                {promo.promo_type === 'fixed_discount' && `₱${promo.discount_amount.toLocaleString()} OFF`}
                                {promo.promo_type === 'bundle' && 'Bundle Deal'}
                                {promo.promo_type === 'financing' && 'Financing Available'}
                              </p>
                            </div>
                            <Badge className="bg-orange-600">
                              {promo.promo_code}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Inventory */}
            <div className="space-y-6">
              {/* Current Branch Stock */}
              <Card className={`border-2 ${currentBranchStock && currentBranchStock.count > 0 ? 'border-green-300' : 'border-red-300'}`}>
                <CardHeader className={currentBranchStock && currentBranchStock.count > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
                  <CardTitle className="flex items-center gap-2">
                    <Store className={`w-5 h-5 ${currentBranchStock && currentBranchStock.count > 0 ? 'text-green-600' : 'text-red-600'}`} />
                    Current Branch Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {currentBranchStock ? (
                    <div className="text-center">
                      <div className={`text-6xl font-bold mb-2 ${currentBranchStock.count > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {currentBranchStock.count}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {currentBranchStock.count === 0 ? 'Out of Stock' : 
                         currentBranchStock.count <= 5 ? 'Low Stock' : 
                         'Units Available'}
                      </p>
                      {currentBranchStock.count > 0 && currentBranchStock.count <= 5 && (
                        <Badge variant="destructive" className="mt-2">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Low Stock Alert
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p className="text-3xl font-bold text-red-600">0</p>
                      <p>No stock at current branch</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Other Branches Stock */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-blue-600" />
                    Stock at Other Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {stockByBranch
                      .filter(s => !s.isCurrentBranch)
                      .map((stock, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{stock.warehouse?.name}</span>
                          </div>
                          <Badge 
                            className={stock.count > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {stock.count > 0 ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> {stock.count} units</>
                            ) : (
                              <>Out of Stock</>
                            )}
                          </Badge>
                        </div>
                      ))}
                    
                    {stockByBranch.filter(s => !s.isCurrentBranch).length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        No stock available at other locations
                      </p>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-semibold">Total System-Wide Stock</span>
                    <span className="text-xl font-bold text-blue-600">
                      {productInventory.length} units
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedProduct && (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-16">
              <div className="text-center text-gray-500">
                <Barcode className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold mb-2">No Product Selected</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Scan a barcode or enter product information to view pricing and stock details
                </p>
                <div className="flex justify-center gap-4">
                  <Badge variant="outline" className="px-4 py-2">
                    <Search className="w-4 h-4 mr-2" />
                    Search by Name/SKU
                  </Badge>
                  <Badge variant="outline" className="px-4 py-2">
                    <Barcode className="w-4 h-4 mr-2" />
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