export function getTransactionDiscountTotal(transaction) {
  const itemDiscounts = (transaction.items || []).reduce(
    (sum, item) => sum + (item.discount_amount || 0),
    0,
  );

  return itemDiscounts + (transaction.discount_amount || 0);
}

export function getTransactionDiscountProofs(transaction) {
  return (transaction.items || [])
    .filter((item) => Boolean(item.discount_proof_image_url))
    .map((item) => ({
      discount_amount: item.discount_amount || 0,
      discount_validated_at: item.discount_validated_at || null,
      proof_image_url: item.discount_proof_image_url,
    }));
}
