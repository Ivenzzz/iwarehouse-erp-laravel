import { useState, useMemo } from "react";
import { calculatePaymentTotals } from "./paymentTotals";

export function usePayments(grandTotal) {
  const [payments, setPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({
    payment_type_id: "",
    amount: "",
  });

  const paymentTotals = useMemo(() => calculatePaymentTotals(grandTotal, payments), [grandTotal, payments]);
  const { totalPaid, changeAmount, balanceDue } = paymentTotals;

  const addPayment = (paymentType) => {
    const amount = parseFloat(currentPayment.amount) || 0;
    if (!currentPayment.payment_type_id || amount <= 0) {
      return { success: false, error: "Please select payment method and enter a valid amount." };
    }

    setPayments((prev) => [
      ...prev,
      {
        ...currentPayment,
        amount: amount,
        payment_method: paymentType?.name || "Unknown",
        type: paymentType?.type || "cash",
        status: "completed",
      },
    ]);

    setCurrentPayment({
      payment_type_id: currentPayment.payment_type_id,
      amount: "",
    });

    return { success: true, paymentType };
  };

  const removePayment = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const resetPayments = () => {
    setPayments([]);
    setCurrentPayment({ payment_type_id: "", amount: "" });
  };

  const replacePayments = (newPayments) => {
    setPayments(newPayments);
  };

  return {
    payments,
    setPayments,
    currentPayment,
    setCurrentPayment,
    totalPaid,
    changeAmount,
    balanceDue,
    addPayment,
    removePayment,
    resetPayments,
    replacePayments,
  };
}
