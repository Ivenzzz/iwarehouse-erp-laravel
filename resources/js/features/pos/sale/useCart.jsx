import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCart(selectedWarehouse) {
  const [cart, setCart] = useState([]);
  const [hasLoadedCart, setHasLoadedCart] = useState(false);
  const queryClient = useQueryClient();

  const updateInventoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inventory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  // Load cart from localStorage
  useEffect(() => {
    if (selectedWarehouse && !hasLoadedCart) {
      const savedCart = localStorage.getItem(`pos_cart_${selectedWarehouse}`);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
        } catch (error) {
          console.error("Error loading cart from localStorage:", error);
          localStorage.removeItem(`pos_cart_${selectedWarehouse}`);
        }
      }
      setHasLoadedCart(true);
    }
  }, [selectedWarehouse, hasLoadedCart]);

  // Save cart to localStorage
  useEffect(() => {
    if (selectedWarehouse && hasLoadedCart) {
      localStorage.setItem(`pos_cart_${selectedWarehouse}`, JSON.stringify(cart));
    }
  }, [cart, selectedWarehouse, hasLoadedCart]);

  // Cart calculations — uses each item's own unit_price (driven by price_basis)
  const rawSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }, [cart]);

  const totalItemLevelDiscounts = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
  }, [cart]);

  const addToCart = (item) => {
    setCart((prev) => [...prev, item]);
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemValue = (index, field, value) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity") {
          updated.line_total = (updated.unit_price * value) - (updated.discount_amount || 0);
        } else {
          updated.line_total = (updated.unit_price * updated.quantity) - (updated.discount_amount || 0);
        }
        return updated;
      })
    );
  };

  const toggleItemPriceBasis = (index) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newBasis = item.price_basis === "srp" ? "cash" : "srp";
        const newPrice = newBasis === "cash" ? item.cash_price : item.srp;
        return {
          ...item,
          price_basis: newBasis,
          unit_price: newPrice,
          line_total: (newPrice * item.quantity) - (item.discount_amount || 0),
        };
      })
    );
  };

  const updateItemSalesRep = (index, salesRepId) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, sales_representative_id: salesRepId } : item
      )
    );
  };

  const applyDefaultSalesRep = (salesRepId) => {
    setCart((prev) =>
      prev.map((item) => ({ ...item, sales_representative_id: salesRepId }))
    );
  };

  const clearCart = async () => {
    const unreservePromises = cart.map((item) =>
      updateInventoryMutation.mutateAsync({
        id: item.inventory_id,
        data: { status: "available" },
      })
    );
    await Promise.all(unreservePromises);
    setCart([]);
    if (selectedWarehouse) {
      localStorage.removeItem(`pos_cart_${selectedWarehouse}`);
    }
  };

  const resetCart = () => {
    setCart([]);
  };

  return {
    cart,
    setCart,
    rawSubtotal,
    totalItemLevelDiscounts,
    addToCart,
    removeFromCart,
    updateItemValue,
    toggleItemPriceBasis,
    updateItemSalesRep,
    applyDefaultSalesRep,
    clearCart,
    resetCart,
    updateInventoryMutation,
  };
}