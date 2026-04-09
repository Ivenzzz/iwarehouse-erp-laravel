export function getTransactionDiscountTotal(transaction) {
  const itemDiscounts = (transaction.items || []).reduce(
    (sum, item) => sum + (item.discount_amount || 0),
    0,
  );

  return itemDiscounts + (transaction.discount_amount || 0);
}
