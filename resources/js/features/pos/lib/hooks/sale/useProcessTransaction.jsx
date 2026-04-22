import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { toast } from "sonner";
import { createTransactionWithNumber } from "../services/transactionNumberService";

/**
 * Hook that encapsulates the entire transaction processing logic.
 * Uses the backend function to atomically generate a unique transaction number.
 */
export function useProcessTransaction({
  cart,
  inventory,
  payments,
  paymentTypes,
  selectedCustomer,
  selectedWarehouse,
  activeSession,
  currentUser,
  defaultSalesRep,
  manualOrNumber,
  modeOfRelease,
  remarks,
  rawSubtotal,
  totalItemLevelDiscounts,
  taxAmount,
  grandTotal,
  activePricingTotal,
  totalPaid,
  changeAmount,
  manualDiscount,
  documentUrls,
  effectiveBalanceDue,
  updateInventoryMutation,
  resetCart,
  resetPayments,
  setSelectedCustomer,
  setDefaultSalesRep,
  setLockedPriceType,
  setManualDiscount,
  setDocumentUrls,
  setManualOrNumber,
  setModeOfRelease,
  setRemarks,
  setCertificationChecked,
  setCustomerSignatureUrl,
  setShowPaymentDialog,
}) {
  const queryClient = useQueryClient();

  const processTransaction = async () => {
    if (!selectedCustomer || !activeSession || effectiveBalanceDue > 0.01) {
      throw new Error("Missing required information to process transaction.");
    }

    const transactionDate = new Date().toISOString();
    const todayString = format(new Date(), "yyyy-MM-dd");

    let discountValidation = null;
    try {
      const storedDiscount = localStorage.getItem("pos_discount_validation");
      if (storedDiscount) {
        const discountData = JSON.parse(storedDiscount);
        if (discountData.amount > 0) {
          discountValidation = {
            discount_amount: discountData.amount,
            proof_image_url: discountData.proofImageUrl || null,
            validated_at: transactionDate,
          };
        }
      }
    } catch (e) { /* noop */ }
    if (!discountValidation && manualDiscount?.amount > 0) {
      discountValidation = {
        discount_amount: manualDiscount.amount,
        proof_image_url: manualDiscount.proofImageUrl || null,
        validated_at: transactionDate,
      };
    }

    const transactionItems = cart.map((item) => {
      const invRecord = inventory.find((inv) => inv.id === item.inventory_id);
      const itemDiscountAmount = item.discount_amount || 0;
      return {
        inventory_id: item.inventory_id,
        unit_price: item.unit_price,
        price_basis: item.price_basis || "cash",
        snapshot_cash_price: item.cash_price || 0,
        snapshot_srp: item.srp || 0,
        snapshot_cost_price: invRecord?.cost_price || 0,
        discount_amount: itemDiscountAmount,
        ...(itemDiscountAmount > 0 && discountValidation && {
          discount_validation: {
            ...discountValidation,
            discount_amount: itemDiscountAmount,
          },
        }),
        line_total: item.line_total,
        is_bundle: item.is_bundle || false,
        bundle_serial: item.bundle_serial || null,
        bundle_components: (item.bundle_components || []).map((component) => ({
          inventory_id: component.inventory_id,
        })),
      };
    });

    const transactionData = {
      or_number: manualOrNumber,
      mode_of_release: modeOfRelease,
      remarks,
      transaction_date: transactionDate,
      customer_id: selectedCustomer.id,
      warehouse_id: selectedWarehouse,
      cashier_id: activeSession.cashier_id,
      pos_session_id: activeSession.id,
      sales_representative_id: defaultSalesRep || currentUser?.id,
      items: transactionItems,
      subtotal: activePricingTotal !== null ? (activePricingTotal + totalItemLevelDiscounts + (manualDiscount?.amount || 0)) : rawSubtotal,
      total_amount: activePricingTotal !== null ? activePricingTotal : (grandTotal - (manualDiscount?.amount || 0)),
      payments_json: {
        payments: payments.map((p) => ({
          payment_type_id: p.payment_type_id,
          payment_method: p.payment_method,
          amount: p.amount,
          payment_details: {
            ...(p.reference_number && { reference_number: p.reference_number }),
            ...p.payment_details,
            // Normalize downpayment to string if present
            ...(p.payment_details?.downpayment_amount != null && {
              downpayment: String(p.payment_details.downpayment_amount),
            }),
            // Normalize sender_mobile_number → sender_mobile
            ...(p.payment_details?.sender_mobile_number && {
              sender_mobile: p.payment_details.sender_mobile_number,
            }),
          },
        })),
      },
      amount_paid: totalPaid,
      change_amount: changeAmount,
      supporting_documents: {
        official_receipt_url: documentUrls.official_receipt || null,
        customer_id_url: documentUrls.customer_id || null,
        customer_agreement_url: documentUrls.customer_agreement || null,
        ...(documentUrls.other_supporting && {
          other_supporting_documents: {
            url: documentUrls.other_supporting,
            name: "Other Supporting Document",
          },
        }),
      },
    };

    // Use backend function to atomically create with unique transaction number
    const result = await createTransactionWithNumber(transactionData);

    // Update inventory items as "sold"
    const inventoryUpdates = [];
    for (const item of cart) {
      inventoryUpdates.push(
        updateInventoryMutation.mutateAsync({ id: item.inventory_id, data: { status: "sold" } })
      );
      if (item.is_bundle && item.bundle_components?.length > 0) {
        for (const comp of item.bundle_components) {
          if (comp.inventory_id) {
            inventoryUpdates.push(
              updateInventoryMutation.mutateAsync({ id: comp.inventory_id, data: { status: "sold" } })
            );
          }
        }
      }
    }

    // Handle replacement payments: update replaced items to 'rma' and replacement items to 'sold_as_replacement'
    const allPayments = transactionData.payments_json?.payments || [];
    for (const p of allPayments) {
      if (p.payment_details?.replacement_inventory_id) {
        // Mark the replacement item as 'sold_as_replacement'
        inventoryUpdates.push(
          updateInventoryMutation.mutateAsync({
            id: p.payment_details.replacement_inventory_id,
            data: { status: "sold_as_replacement" }
          })
        );
      }
    }

    // For replacement transactions, mark the sold cart items as 'rma' instead of 'sold'
    const hasReplacementPayment = allPayments.some(p => p.payment_details?.replacement_inventory_id);
    if (hasReplacementPayment) {
      for (const item of cart) {
        inventoryUpdates.push(
          updateInventoryMutation.mutateAsync({ id: item.inventory_id, data: { status: "rma" } })
        );
      }
    }

    await Promise.all(inventoryUpdates);

    // POSSession schema only has: closing_balance, shift_end_time, cashier_remarks, status
    // No running totals on POSSession — skip session update during transaction

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["activeSession"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["salesTransactions"] });
    queryClient.invalidateQueries({ queryKey: ["nextTransactionNumber"] });

    // Reset all state
    setShowPaymentDialog(false);
    toast.success("Transaction completed successfully!");
    resetCart();
    setSelectedCustomer(null);
    resetPayments();
    setCustomerSignatureUrl(null);
    setDefaultSalesRep("");
    setDocumentUrls({ official_receipt: "", customer_id: "", customer_agreement: "", other_supporting: "" });
    setManualOrNumber("");
    setModeOfRelease("Item Claimed / Pick-up");
    setRemarks("");
    setCertificationChecked(false);
    setLockedPriceType(null);
    setManualDiscount(null);
    try { localStorage.removeItem('pos_discount_validation'); } catch (e) { /* noop */ }

    return result;
  };

  return { processTransaction };
}
