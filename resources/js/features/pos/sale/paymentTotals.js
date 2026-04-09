export function calculatePaymentTotals(grandTotal, payments = []) {
  const normalizedGrandTotal = Math.max(0, Number(grandTotal) || 0);

  return payments.reduce(
    (totals, payment) => {
      const amount = Math.max(0, Number(payment?.amount) || 0);
      const remainingBeforePayment = Math.max(0, normalizedGrandTotal - totals.appliedPaid);
      const appliedAmount = Math.min(amount, remainingBeforePayment);
      const generatedChange = remainingBeforePayment > 0 ? Math.max(0, amount - remainingBeforePayment) : 0;

      totals.totalPaid += amount;
      totals.appliedPaid += appliedAmount;
      totals.changeAmount += generatedChange;
      totals.balanceDue = Math.max(0, normalizedGrandTotal - totals.appliedPaid);

      return totals;
    },
    {
      totalPaid: 0,
      appliedPaid: 0,
      changeAmount: 0,
      balanceDue: normalizedGrandTotal,
    }
  );
}
