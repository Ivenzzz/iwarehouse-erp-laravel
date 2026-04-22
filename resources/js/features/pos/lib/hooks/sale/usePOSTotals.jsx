import { useMemo } from "react";

export function usePOSTotals(rawSubtotal, totalItemLevelDiscounts, taxRate) {
  const taxableAmount = useMemo(() => {
    return Math.max(0, rawSubtotal - totalItemLevelDiscounts);
  }, [rawSubtotal, totalItemLevelDiscounts]);

  const taxAmount = useMemo(() => {
    return (taxableAmount * taxRate) / 100;
  }, [taxableAmount, taxRate]);

  const grandTotal = useMemo(() => {
    return taxableAmount + taxAmount;
  }, [taxableAmount, taxAmount]);

  return { taxableAmount, taxAmount, grandTotal };
}