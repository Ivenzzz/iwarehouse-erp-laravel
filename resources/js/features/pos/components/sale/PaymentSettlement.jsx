import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/shared/hooks/use-toast';
import PaymentMethodModal from './PaymentMethodModal';
import ReplacementPaymentModal from "@/features/pos/components/dialogs/ReplacementPaymentModal";
import { calculatePaymentTotals } from "@/features/pos/lib/utils/sale/paymentTotals";


const DENOMINATIONS = [
  { val: 100000, color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600' }, // Platinum/Black tier
  { val: 50000, color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20' }, // Distinct from Purple/Rose
  { val: 10000, color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' },   // Secondary Glow
  { val: 1000, color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },     // Primary Glow-adjacent
  { val: 500, color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' },
  { val: 200, color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' }, // Accent Glow
  { val: 100, color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' },
  { val: 50, color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
  { val: 20, color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' },
];

const INITIAL_PAYMENT_DATA = {
  senderMobileNumber: '',
  contractId: '',
  registeredMobile: '',
  loanTerm: '',
  loanType: '',
  downpaymentAmount: '',
  supportingDocUrls: [],
  knoxVerified: false,
  bank: '',
  terminalUsed: '',
  cardNumber: '',
  cardHolderName: '',
  accountNumber: '',
  accountHolderName: '',
};

const getPaymentDetailsByType = ({ methodType, isCreditCard, paymentData, replacementData }) => ({
  ...(methodType === 'replacement' && replacementData && {
    replacement_inventory_id: replacementData.replacementInventoryId,
    replacement_barcode: replacementData.replacementBarcode,
    replacement_item_details: replacementData.replacementItemDetails,
    replacement_remarks: replacementData.remarks,
    validated_by: replacementData.validatedBy,
    supporting_doc_urls: replacementData.supportingDocUrls,
  }),
  ...(methodType === 'card' && {
    bank: paymentData.bank || null,
    ...(isCreditCard && {
      terminal_used: paymentData.terminalUsed || null,
    }),
    account_number: paymentData.cardNumber || null,
    card_holder_name: paymentData.cardHolderName || null,
    supporting_doc_urls: paymentData.supportingDocUrls || [],
    ...(!isCreditCard && paymentData.cardNumber && {
      last_4_digits: paymentData.cardNumber.slice(-4),
    }),
    ...(isCreditCard && paymentData.loanTerm && {
      loan_term_months: parseInt(paymentData.loanTerm, 10),
    }),
  }),
  ...(methodType === 'ewallet' && {
    sender_mobile_number: paymentData.senderMobileNumber,
    sender_mobile: paymentData.senderMobileNumber,
    supporting_doc_urls: paymentData.supportingDocUrls || [],
  }),
  ...(methodType === 'bank_transfer' && {
    bank: paymentData.bank || null,
    account_number: paymentData.accountNumber || null,
    account_holder_name: paymentData.accountHolderName || null,
    supporting_doc_urls: paymentData.supportingDocUrls || [],
  }),
  ...(methodType === 'financing' && {
    contract_id: paymentData.contractId,
    registered_mobile: paymentData.registeredMobile,
    loan_term_months: parseInt(paymentData.loanTerm, 10),
    loan_type: paymentData.loanType || null,
    downpayment_amount: paymentData.downpaymentAmount ? parseFloat(paymentData.downpaymentAmount) : null,
    downpayment: paymentData.downpaymentAmount ? parseFloat(paymentData.downpaymentAmount) : null,
    supporting_doc_urls: paymentData.supportingDocUrls || [],
    knox_verified: paymentData.knoxVerified,
  }),
});

const getMissingPaymentMessage = ({ methodType, isCreditCard, paymentData }) => {
  if (methodType === 'card') {
    if (!paymentData.bank) return 'Bank is required for card payments.';
    if (!paymentData.cardNumber?.trim()) return 'Account number is required for card payments.';
    if (!paymentData.cardHolderName?.trim()) return 'Cardholder name is required for card payments.';
    if (isCreditCard && !paymentData.loanTerm) return 'Loan term is required for credit card payments.';
  }

  if (methodType === 'ewallet' && (!paymentData.senderMobileNumber || paymentData.senderMobileNumber.length !== 11)) {
    return 'Sender mobile number is required (11 digits, 09XXXXXXXXX).';
  }

  if (methodType === 'bank_transfer') {
    if (!paymentData.bank) return 'Bank is required for bank transfer payments.';
    if (!paymentData.accountNumber?.trim()) return 'Account number is required for bank transfer payments.';
    if (!paymentData.accountHolderName?.trim()) return 'Account holder name is required for bank transfer payments.';
  }

  if (methodType === 'financing') {
    if (!paymentData.contractId?.trim()) return 'Contract/Application ID is required for financing.';
    if (!paymentData.registeredMobile || paymentData.registeredMobile.length !== 11) {
      return 'Registered mobile number is required (11 digits, 09XXXXXXXXX).';
    }
    if (!paymentData.loanTerm) return 'Loan term is required for financing.';
  }

  return null;
};

const getPaymentBadgeText = (payment) => {
  const details = payment.payment_details || {};

  if (details.loan_term_months) {
    return `${details.loan_term_months}mo installment`;
  }

  if (details.contract_id) {
    return `Contract: ${details.contract_id}`;
  }

  if (details.sender_mobile_number || details.sender_mobile) {
    return `Sender: ${details.sender_mobile_number || details.sender_mobile}`;
  }

  return null;
};

const getPaymentButtonLabel = (currentMethodDetails, refInput, paymentData, replacementData) => {
  if (currentMethodDetails?.type === 'replacement') {
    return replacementData
      ? `Replacement: ${replacementData.replacementBarcode}`
      : 'Click to enter replacement details...';
  }

  if (refInput) return `Ref: ${refInput}`;
  if (currentMethodDetails?.type === 'card' && paymentData.cardNumber) return `Acct: ${paymentData.cardNumber}`;
  if (currentMethodDetails?.type === 'bank_transfer' && paymentData.accountNumber) return `Acct: ${paymentData.accountNumber}`;
  if (currentMethodDetails?.type === 'financing' && paymentData.contractId) return `Contract: ${paymentData.contractId}`;
  if (currentMethodDetails?.type === 'ewallet' && paymentData.senderMobileNumber) return `Sender: ${paymentData.senderMobileNumber}`;

  return 'Click to enter details...';
};

const getValidationTitle = (methodType) => {
  if (methodType === 'card') return 'Missing Card Information';
  if (methodType === 'bank_transfer') return 'Missing Bank Transfer Information';
  if (methodType === 'ewallet') return 'Missing E-Wallet Information';
  if (methodType === 'financing') return 'Missing Financing Information';
  return 'Missing Information';
};

const getNextPaymentData = () => ({ ...INITIAL_PAYMENT_DATA, supportingDocUrls: [] });

const isSamsungFinanceMethod = (methodName = '') => methodName.toLowerCase().includes('samsung finance');

const isCreditCardMethod = (methodType, methodName = '') => methodType === 'card' && methodName === 'Credit Card';

const isReplacementMethod = (methodType) => methodType === 'replacement';

const isNonCashMethod = (methodType) => methodType && methodType !== 'cash';

const requiresReferenceNumber = (methodType) => isNonCashMethod(methodType) && !isReplacementMethod(methodType);

export default function PaymentSettlement({
  cart,
  paymentTypes,
  payments,
  onPaymentsChange,
  rawSubtotal,
  totalItemLevelDiscounts,
  taxAmount,
  grandTotal,
  onPriceTypeLock,
  onCheckout,
  selectedCustomer,
  balanceDue,
  onPricingChange = () => { },
  onSuspend = () => { },
  canSuspend = true,
  manualDiscount = null,
  onManualDiscountChange = () => { },
  warehouseId,
  inventory = [],
  employees = [],
}) {
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [refInput, setRefInput] = useState('');

  // Dynamic payment fields
  const [paymentData, setPaymentData] = useState(getNextPaymentData());

  // Modal state for non-cash payment details
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Replacement modal state
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [replacementData, setReplacementData] = useState(null);



  // Initialize with first payment method (typically Cash)
  useEffect(() => {
    if (paymentTypes.length > 0 && !selectedMethodId) {
      const cashMethod = paymentTypes.find(pt => pt.type === 'cash') || paymentTypes[0];
      setSelectedMethodId(cashMethod.id);
    }
  }, [paymentTypes, selectedMethodId]);

  // Active total is now the sum of each item's individually-chosen price
  const activeTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  }, [cart]);

  const displaySubtotal = activeTotal;

  // Get current method details
  const currentMethodDetails = paymentTypes.find(m => m.id === selectedMethodId);
  const isCurrentMethodCash = currentMethodDetails?.type === 'cash';
  const isCurrentMethodNonCash = isNonCashMethod(currentMethodDetails?.type);

  // Calculate total discount (item-level + manual)
  const totalDiscount = totalItemLevelDiscounts + (manualDiscount?.amount || 0);

  // Net total after discounts
  const netTotal = activeTotal - totalDiscount;

  const paymentTotals = useMemo(() => calculatePaymentTotals(netTotal, payments), [netTotal, payments]);
  const { balanceDue: currentBalance, changeAmount } = paymentTotals;

  // Notify parent of pricing changes (net of discounts)
  React.useEffect(() => {
    onPricingChange(netTotal, false);
  }, [netTotal, onPricingChange]);

  // Projected total - net of discounts
  const projectedTotal = netTotal;

  const isPredictingSrpJump = false;

  // VAT calculation (reverse) - based on net total
  const vatableSales = netTotal / 1.12;
  const vatAmount = netTotal - vatableSales;

  // Auto-fill balance when projected total or method changes
  useEffect(() => {
    const projectedBalance = calculatePaymentTotals(projectedTotal, payments).balanceDue;
    if (projectedBalance > 0) {
      setAmountInput(projectedBalance.toFixed(2));
      return;
    }

    setAmountInput('');
  }, [projectedTotal, payments, selectedMethodId]);

  // No more global price type lock — pricing is per-item

  // Handlers
  const handleAddDenomination = (val) => {
    setAmountInput(prev => {
      const current = parseFloat(prev) || 0;
      return (current + val).toString();
    });
  };

  const handleClearInput = () => setAmountInput('');

  const handleSetExact = () => {
    setAmountInput(Math.max(0, currentBalance).toFixed(2));
  };

  const handleAddPayment = () => {
    const amountVal = parseFloat(amountInput);
    if (!selectedMethodId || !amountVal || amountVal <= 0) return;

    const methodType = currentMethodDetails?.type;

    // Replacement type: require replacement data instead of ref number
    if (methodType === 'replacement') {
      if (!replacementData) {
        toast({ variant: "destructive", description: "Please fill in replacement details first." });
        setShowReplacementModal(true);
        return;
      }
    }

    if (requiresReferenceNumber(methodType) && !refInput.trim()) {
      toast({ variant: "destructive", description: "Reference number is required for non-cash payments." });
      return;
    }

    const isCreditCard = isCreditCardMethod(methodType, currentMethodDetails?.name);
    const missingPaymentMessage = getMissingPaymentMessage({ methodType, isCreditCard, paymentData });

    if (missingPaymentMessage) {
      toast({ variant: "destructive", description: missingPaymentMessage });
      return;
    }

    if (methodType === 'financing' && isSamsungFinanceMethod(currentMethodDetails?.name) && !paymentData.knoxVerified) {
      toast({ variant: "destructive", description: "Device Knox/Lock must be verified for Samsung Finance+." });
      return;
    }



    const newPayment = {
      payment_method_id: selectedMethodId,
      payment_method: currentMethodDetails.name,
      type: currentMethodDetails.type,
      reference_number: refInput.trim() || null,
      amount: amountVal,
      status: 'completed',
      payment_details: getPaymentDetailsByType({
        methodType,
        isCreditCard,
        paymentData,
        replacementData,
      }),
    };

    onPaymentsChange([...payments, newPayment]);

    // Reset all inputs
    setRefInput('');
    setAmountInput('');
    setReplacementData(null);
    setPaymentData(getNextPaymentData());
  };

  const removePayment = (index) => {
    const newPayments = payments.filter((_, i) => i !== index);
    onPaymentsChange(newPayments);
  };

  const handleVoidAll = () => {
    if (window.confirm("Void all payments?")) {
      onPaymentsChange([]);
    }
  };

  const handleMethodChange = (methodId) => {
    const newMethod = paymentTypes.find(pt => pt.id === methodId);

    setSelectedMethodId(methodId);
    setAmountInput('');
    // Reset dynamic fields when method changes
    setPaymentData(getNextPaymentData());
    setRefInput('');

    // Reset replacement data when method changes
    setReplacementData(null);

    // Never show modal for cash
    if (newMethod?.type === 'cash') {
      setShowPaymentModal(false);
    } else if (newMethod?.type === 'replacement') {
      setShowPaymentModal(false);
      setShowReplacementModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  return (
    <div className="bg-slate-200 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 overflow-x-auto scrollbar-hide">
      {/* HEADER */}
      <div className="bg-[#002060] dark:bg-slate-950 text-white px-6 py-2 font-bold text-xs flex justify-between items-center border-b border-transparent dark:border-slate-800">
        <span>Payments</span>
      </div>

      <div className="p-3 space-y-3">
        {/* METHOD & REF */}
        <div className="flex gap-2">
          {/* Converted Select to Combobox */}
          <div className="flex-1 min-w-0">
            <Combobox
              value={selectedMethodId}
              onValueChange={handleMethodChange}
              options={paymentTypes.map(m => ({
                value: m.id,
                label: m.name
              }))}
              className="
                w-full h-9 text-xs font-semibold rounded-md transition-colors

                /* Light */
                bg-white
                text-slate-800
                border border-slate-300
                focus:outline-none
                focus:ring-2 focus:ring-indigo-500
                focus:border-indigo-500

                /* Dark */
                dark:bg-[#020617]              /* Slate-950 */
                dark:text-slate-200
                dark:border-slate-800
                dark:focus:ring-indigo-500
                dark:focus:border-indigo-500
              "
              placeholder="Select method..."
              searchPlaceholder="Search..."
              emptyText="No method found"
            />
          </div>

          {/* Show edit button for non-cash to open modal */}
          {isCurrentMethodNonCash && currentMethodDetails?.type !== 'replacement' && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="
                flex-1 px-2 py-1.5 text-xs text-left truncate rounded transition-colors

                /* Light */
                bg-white
                border border-indigo-300
                text-slate-700
                hover:bg-indigo-50
                hover:border-indigo-400

                /* Dark */
                dark:bg-[#0f172a]        /* Slate-900 */
                dark:border-indigo-500/40
                dark:text-[#94a3b8]      /* Slate-400 */
                dark:hover:bg-indigo-500/10
              "
            >
              {getPaymentButtonLabel(currentMethodDetails, refInput, paymentData, replacementData)}
            </button>
          )}

          {/* Show replacement details button */}
          {currentMethodDetails?.type === 'replacement' && (
            <button
              type="button"
              onClick={() => setShowReplacementModal(true)}
              className="
                flex-1 px-2 py-1.5 text-xs text-left truncate rounded transition-colors
                bg-white border border-orange-300 text-slate-700 hover:bg-orange-50 hover:border-orange-400
                dark:bg-[#0f172a] dark:border-orange-500/40 dark:text-[#94a3b8] dark:hover:bg-orange-500/10
              "
            >
              {getPaymentButtonLabel(currentMethodDetails, refInput, paymentData, replacementData)}
            </button>
          )}
        </div>

        {/* AMOUNT & ADD */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            {(() => {
              const formatDisplayValue = (val) => {
                if (!val) return "";
                const parts = val.toString().split(".");
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                return parts.join(".");
              };

              return (
                <input
                  type="text"
                  placeholder="0.00"
                  className={`
            w-full px-2 py-2 text-sm font-bold text-right rounded border
            transition-colors focus:outline-none focus:ring-2

            ${isPredictingSrpJump
                      ? `
                  border-orange-400 bg-orange-50 text-orange-900
                  dark:bg-orange-900/20 dark:text-orange-200
                  dark:border-orange-400/60
                  focus:ring-orange-400/40
                `
                      : `
                  bg-white text-slate-900 border-slate-300
                  hover:border-slate-400
                  focus:ring-indigo-500/40 focus:border-indigo-500

                  dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-800
                  dark:hover:border-slate-700
                  dark:focus:ring-indigo-500/40 dark:focus:border-indigo-500
                `
                    }
          `}
                  value={formatDisplayValue(amountInput)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, "");
                    if (!isNaN(rawValue) || rawValue === "." || rawValue === "") {
                      setAmountInput(rawValue);
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                />
              );
            })()}
          </div>

          <button
            onClick={handleAddPayment}
            className="
      px-4 py-2 text-xs font-bold rounded shadow-sm transition-colors
      bg-emerald-600 hover:bg-emerald-700 text-white
      dark:bg-emerald-500 dark:hover:bg-emerald-400
      focus:outline-none focus:ring-2 focus:ring-emerald-400/40
    "
          >
            ADD
          </button>
        </div>

        {/* FAST CASH BUTTONS */}
        {isCurrentMethodCash && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1.5">
              {DENOMINATIONS.map(denom => (
                <button
                  key={denom.val}
                  onClick={() => handleAddDenomination(denom.val)}
                  className={`py-1.5 rounded border font-bold shadow-sm hover:brightness-95 active:scale-95 transition-all text-xs ${denom.color}`}
                >
                  ₱{denom.val}
                </button>
              ))}
              <button
                onClick={handleSetExact}
                className="py-1.5 rounded border font-bold shadow-sm bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700 hover:brightness-95 active:scale-95 transition-all text-xs"
              >
                EXACT
              </button>
              <button
                onClick={handleClearInput}
                className="py-1.5 rounded border font-bold shadow-sm bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 hover:brightness-95 active:scale-95 transition-all text-xs"
              >
                CLEAR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PAYMENT LIST */}
      <div className="px-3 pb-3 space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
        {payments.length === 0 && (
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-2">
            No payments added.
          </div>
        )}

        {payments.map((p, idx) => {
          const paymentBadgeText = getPaymentBadgeText(p);

          return (
            <div
              key={idx}
              className="
          flex justify-between items-center px-2 py-1.5 rounded border text-xs
          transition-colors

          /* Light */
          bg-white border-slate-200

          /* Dark */
          dark:bg-[#0f172a]       /* Slate-900 */
          dark:border-slate-800
        "
            >
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {p.payment_method}
                  </span>

                  {p.reference_number && (
                    <span className="text-slate-500 dark:text-slate-400">
                      #{p.reference_number}
                    </span>
                  )}
                </div>

                {paymentBadgeText && (
                  <div className="text-[10px] mt-0.5 text-indigo-600 dark:text-indigo-400">
                    {paymentBadgeText}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  ₱{p.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2
                  })}
                </span>

                <button
                  onClick={() => removePayment(idx)}
                  className="
              text-red-500 hover:text-red-600
              dark:text-red-400 dark:hover:text-red-300
              font-bold transition-colors
            "
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOTALS FOOTER */}
      <div
        className="
    px-3 py-2 space-y-1 text-xs border-t

    /* Light */
    bg-slate-100
    border-slate-200

    /* Dark */
    dark:bg-[#0f172a]          /* Slate-900 (card surface) */
    dark:border-slate-800
  "
      >
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-[#94a3b8]">Total Items:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {cart.length}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-[#94a3b8]">Subtotal:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ₱{displaySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-[#94a3b8]">Net of VAT:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ₱{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-[#94a3b8]">VAT (12%):</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-[#94a3b8]">AM-Discount:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {((manualDiscount?.amount || 0) + totalItemLevelDiscounts).toFixed(2)}
          </span>
        </div>

        <div
          className="
      flex justify-between items-center pt-2 text-sm font-bold border-t
      border-slate-200 dark:border-slate-800
    "
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-900 dark:text-slate-100">TOTAL:</span>
          </div>

          <span className="text-slate-900 dark:text-slate-100">
            ₱{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div
          className={`flex justify-between items-center text-sm font-bold
      ${currentBalance > 0
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
            }
    `}
        >
          <span>{currentBalance > 0 ? "BALANCE:" : "CHANGE:"}</span>
          <span>
            ₱{(currentBalance > 0 ? currentBalance : changeAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* ACTION BUTTONS */}
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {canSuspend ? (
              <button
                onClick={onSuspend}
                className="py-2 text-xs font-bold rounded shadow-sm transition-all bg-yellow-400 hover:bg-yellow-500 active:scale-[0.98] text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 dark:bg-transparent dark:border dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-400/10 dark:focus:ring-yellow-400/40"
              >
                Suspend
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleVoidAll}
              className="py-2 text-xs font-bold rounded shadow-sm transition-all bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 dark:bg-transparent dark:border dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400/10 dark:focus:ring-red-400/40"
            >
              Void All
            </button>
          </div>

          {/* COMPLETE SALE BUTTON */}
          <button
            type="button"
            onClick={onCheckout}
            disabled={cart.length === 0 || !selectedCustomer || balanceDue > 0.01}
            className="
        w-full py-3 text-sm font-bold uppercase rounded-md
        flex items-center justify-center gap-2 shadow-sm transition-colors
        text-white

        bg-emerald-600 hover:bg-emerald-700
        dark:bg-emerald-500 dark:hover:bg-emerald-400

        disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed
        dark:disabled:bg-slate-800 dark:disabled:text-slate-500
      "
          >
            <CheckCircle className="w-4 h-4" />
            COMPLETE SALE
          </button>
        </div>
      </div>

      {/* Replacement Payment Modal */}
      <ReplacementPaymentModal
        open={showReplacementModal}
        onOpenChange={setShowReplacementModal}
        inventory={inventory}
        employees={employees}
        warehouseId={warehouseId}
        onConfirm={(data) => setReplacementData(data)}
      />

      {/* Payment Method Modal */}
      <PaymentMethodModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        methodDetails={currentMethodDetails}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        refInput={refInput}
        setRefInput={setRefInput}
        onConfirm={() => { }}
      />

    </div>
  );
}
