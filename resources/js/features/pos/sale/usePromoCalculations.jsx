export function usePromoCalculations(promotions) {
  const getApplicablePromo = (productMasterId, brandId, categoryId, unitPrice) => {
    const now = new Date();
    const eligiblePromos = promotions.filter((promo) => {
      if (promo.start_date && new Date(promo.start_date) > now) return false;
      if (promo.end_date && new Date(promo.end_date) < now) return false;

      const productMatch =
        !promo.applicable_products?.length || promo.applicable_products.includes(productMasterId);
      const brandMatch =
        !promo.applicable_brands?.length || promo.applicable_brands.includes(brandId);
      const categoryMatch =
        !promo.applicable_categories?.length || promo.applicable_categories.includes(categoryId);
      const minPurchaseMatch =
        !promo.min_purchase_amount || unitPrice >= promo.min_purchase_amount;

      return productMatch && brandMatch && categoryMatch && minPurchaseMatch;
    });

    if (eligiblePromos.length === 0) return null;
    return eligiblePromos.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
  };

  const calculatePromoDiscount = (promo, unitPrice) => {
    if (!promo) return 0;

    if (promo.promo_type === "percentage_discount") {
      return (unitPrice * promo.discount_percentage) / 100;
    } else if (promo.promo_type === "fixed_discount") {
      return promo.discount_amount;
    }

    return 0;
  };

  return { getApplicablePromo, calculatePromoDiscount };
}