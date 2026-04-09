import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Head } from "@inertiajs/react";
import { Search, Clock, DollarSign, Store, User, Loader2, ChevronDown, ChevronUp } from "lucide-react";

import { toast } from "@/shared/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";

import CustomerDialog from "@/features/pos/sale/dialogs/CustomerDialog";
import DocumentDialog from "@/features/pos/sale/dialogs/DocumentDialog";
import PaymentDialog from "@/features/pos/sale/dialogs/PaymentDialog";
import ReceiptDialog from "@/features/pos/sale/dialogs/ReceiptDialog";
import EndShiftDialog from "@/features/pos/EndShiftDialog";
import PaymentSettlement from "@/features/pos/sale/PaymentSettlement";
import CustomerInsights from "@/features/pos/CustomerInsights";
import AddSalesRepDialog from "@/features/pos/sale/dialogs/AddSalesRepDialog";
import POSSessionTransactionsView from "@/features/pos/sale/POSSessionTransactionsView";
import DiscountDialog from "@/features/pos/sale/dialogs/DiscountDialog";
import POSHeader from "@/features/pos/sale/POSHeader";
import POSCartTable from "@/features/pos/sale/POSCartTable";
import POSCartItemCard from "@/features/pos/sale/POSCartItemCard";
import { generateWarrantyReceiptHTML } from "@/features/pos/sale/services/warrantyReceiptService";

function createEmptyCustomerForm() {
  return {
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address_json: {
      street: "",
      barangay: "",
      city_municipality: "",
      province: "",
      postal_code: "",
      country: "Philippines",
    },
  };
}

function createEmptyDocumentUrls() {
  return {
    official_receipt: "",
    customer_id: "",
    customer_agreement: "",
    other_supporting: "",
  };
}

export default function POS(props) {
  const {
    cashier,
    activeSession,
    warehouses,
    customers: initialCustomers,
    salesReps: initialSalesReps,
    paymentMethods,
    companyInfo,
    nextTransactionNumberPreview,
  } = props;

  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  const [currentSession, setCurrentSession] = useState(activeSession);
  const [customers, setCustomers] = useState(initialCustomers || []);
  const [salesReps, setSalesReps] = useState(initialSalesReps || []);
  const [sessionTransactions, setSessionTransactions] = useState([]);

  const [openingBalance, setOpeningBalance] = useState("");
  const [shiftWarehouse, setShiftWarehouse] = useState(activeSession?.warehouse_id ? String(activeSession.warehouse_id) : "");
  const [isStartingShift, setIsStartingShift] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeMatches, setBarcodeMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [cart, setCart] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [defaultSalesRep, setDefaultSalesRep] = useState("");
  const [manualDiscount, setManualDiscount] = useState(null);
  const [activePricingTotal, setActivePricingTotal] = useState(null);

  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showEndShiftDialog, setShowEndShiftDialog] = useState(false);
  const [showAddSalesRepDialog, setShowAddSalesRepDialog] = useState(false);
  const [showItemDiscountDialog, setShowItemDiscountDialog] = useState(false);

  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState(null);
  const [currentView, setCurrentView] = useState("pos");
  const [newCustomer, setNewCustomer] = useState(createEmptyCustomerForm());
  const [discountDialogItemIndex, setDiscountDialogItemIndex] = useState(null);
  const [manualOrNumber, setManualOrNumber] = useState("");
  const [modeOfRelease, setModeOfRelease] = useState("Item Claimed / Pick-up");
  const [remarks, setRemarks] = useState("");
  const [documentUrls, setDocumentUrls] = useState(createEmptyDocumentUrls());
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [displayTransactionNumber, setDisplayTransactionNumber] = useState(nextTransactionNumberPreview || "000001");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedWarehouse = currentSession?.warehouse_id ? String(currentSession.warehouse_id) : shiftWarehouse;
  const selectedCustomerRecord = selectedCustomer?.id
    ? customers.find((customer) => customer.id === selectedCustomer.id) || selectedCustomer
    : null;

  const customerComboOptions = useMemo(
    () => customers.map((customer) => ({
      value: String(customer.id),
      label: `${customer.full_name}${customer.phone ? ` - ${customer.phone}` : ""}`,
    })),
    [customers],
  );

  const salesRepOptions = useMemo(
    () => salesReps.map((salesRep) => ({
      value: String(salesRep.id),
      label: salesRep.label || salesRep.full_name,
    })),
    [salesReps],
  );

  const rawSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)), 0),
    [cart],
  );

  const totalItemLevelDiscounts = useMemo(
    () => cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0),
    [cart],
  );

  const grandTotal = Math.max(0, rawSubtotal - totalItemLevelDiscounts - (manualDiscount?.amount || 0));
  const effectiveTotal = activePricingTotal !== null ? activePricingTotal : grandTotal;
  const totalPaid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const changeAmount = Math.max(0, totalPaid - effectiveTotal);
  const effectiveBalanceDue = Math.max(0, effectiveTotal - totalPaid);
  const taxRate = companyInfo?.[0]?.tax_rate || 12;
  const taxAmount = grandTotal - (grandTotal / (1 + (taxRate / 100)));
  const selectedCustomerLabel = selectedCustomerRecord?.full_name
    ? `${selectedCustomerRecord.full_name}${selectedCustomerRecord.phone ? ` - ${selectedCustomerRecord.phone}` : ""}`
    : "No customer selected";
  const selectedSalesRepLabel = salesReps.find((salesRep) => String(salesRep.id) === String(defaultSalesRep))?.label
    || salesReps.find((salesRep) => String(salesRep.id) === String(defaultSalesRep))?.full_name
    || "No sales representative selected";

  const loadTransactions = async (sessionId = currentSession?.id) => {
    if (!sessionId) {
      setSessionTransactions([]);
      return;
    }

    const { data } = await axios.get(route("pos.transactions"), {
      params: { session_id: sessionId },
    });

    setSessionTransactions(data.rows || []);
  };

  const refreshTransactionNumber = async () => {
    const { data } = await axios.get(route("pos.transaction-number-preview"));
    setDisplayTransactionNumber(data.transaction_number || "000001");
  };

  useEffect(() => {
    if (currentSession?.id) {
      loadTransactions(currentSession.id);
      refreshTransactionNumber();
      return;
    }

    setSessionTransactions([]);
  }, [currentSession?.id]);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const term = searchTerm.trim();

    if (!term || !selectedWarehouse || !currentSession?.id) {
      setBarcodeMatches([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const { data } = await axios.get(route("pos.inventory-search"), {
          params: {
            search: term,
            warehouse_id: selectedWarehouse,
            limit: 20,
          },
        });

        const results = (data.rows || []).filter((item) => !cart.some((cartItem) => cartItem.inventory_id === item.inventory_id));

        if (results.length === 1) {
          handleAddToCart(results[0], "cash");
          setBarcodeMatches([]);
          setSearchTerm("");
          return;
        }

        setBarcodeMatches(results.slice(0, 10));
      } catch (error) {
        toast({ variant: "destructive", description: error.response?.data?.message || "Search failed. Please try again." });
        setBarcodeMatches([]);
      } finally {
        setIsSearching(false);
      }
    }, /^[a-z0-9]{6}$/i.test(term) ? 500 : 250);

    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm, selectedWarehouse, cart, currentSession?.id]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const handleKeyboard = (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        setCurrentView((current) => current === "search" ? "pos" : "search");
      }

      if (event.key === "Escape" && currentView !== "pos") {
        event.preventDefault();
        setCurrentView("pos");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyboard);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [currentView]);

  useEffect(() => {
    if (selectedCustomer?.id && defaultSalesRep) {
      setIsCollapsed(true);
    }
  }, [selectedCustomer?.id, defaultSalesRep]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      return;
    }

    document.exitFullscreen?.().catch(() => {});
  };

  const resetTransactionState = () => {
    setCart([]);
    setPayments([]);
    setManualDiscount(null);
    setActivePricingTotal(null);
    setSearchTerm("");
    setBarcodeMatches([]);
    setManualOrNumber("");
    setModeOfRelease("Item Claimed / Pick-up");
    setRemarks("");
    setDocumentUrls(createEmptyDocumentUrls());
    setIsCollapsed(false);
  };

  const openPrintWindow = (transaction) => {
    if (!transaction) {
      return;
    }

    const html = generateWarrantyReceiptHTML({
      transaction,
      customers,
      warehouses,
      employees: salesReps,
      users: [],
      companyInfo,
      inventoryItems: [],
      variants: [],
      productMasters: [],
      brands: [],
    });

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      toast({ variant: "destructive", description: "Unable to open print window." });
      return;
    }

    printWindow.document.write(`${html}<script>window.onload = function() { window.print(); };</script>`);
    printWindow.document.close();
  };

  const handleAddToCart = (inventoryItem, priceType = "cash") => {
    if (!selectedWarehouse) {
      toast({ variant: "destructive", description: "Please select a warehouse first." });
      return;
    }

    if (cart.some((item) => item.inventory_id === inventoryItem.inventory_id)) {
      toast({ variant: "destructive", description: "This item is already in the cart." });
      return;
    }

    const nextItem = {
      ...inventoryItem,
      quantity: 1,
      price_basis: priceType,
      unit_price: priceType === "srp" ? inventoryItem.srp : inventoryItem.cash_price,
      discount_amount: 0,
      sales_representative_id: defaultSalesRep || null,
      line_total: priceType === "srp" ? inventoryItem.srp : inventoryItem.cash_price,
    };

    setCart((previous) => [...previous, nextItem]);
    setBarcodeMatches([]);
    setSearchTerm("");
    searchInputRef.current?.focus();
    toast({ description: "Item added to cart." });
  };

  const handleRemoveFromCart = (index) => {
    setCart((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const toggleItemPriceBasis = (index) => {
    setCart((previous) => previous.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      const nextPriceBasis = item.price_basis === "srp" ? "cash" : "srp";
      const nextUnitPrice = nextPriceBasis === "srp" ? item.srp : item.cash_price;

      return {
        ...item,
        price_basis: nextPriceBasis,
        unit_price: nextUnitPrice,
        line_total: Math.max(0, nextUnitPrice - (item.discount_amount || 0)),
      };
    }));
  };

  const updateItemDiscount = ({ amount }) => {
    if (discountDialogItemIndex === null) {
      return;
    }

    const nextAmount = Math.max(0, parseFloat(amount) || 0);

    setCart((previous) => previous.map((item, itemIndex) => {
      if (itemIndex !== discountDialogItemIndex) {
        return item;
      }

      const appliedDiscount = Math.min(nextAmount, item.unit_price || 0);

      return {
        ...item,
        discount_amount: appliedDiscount,
        line_total: Math.max(0, (item.unit_price || 0) - appliedDiscount),
      };
    }));
  };

  const handleDiscountClick = (index) => {
    setDiscountDialogItemIndex(index);
    setShowItemDiscountDialog(true);
  };

  const handleStartShift = async () => {
    const parsedOpeningBalance = parseFloat(openingBalance);

    if (!shiftWarehouse) {
      toast({ variant: "destructive", description: "Select a warehouse to start the shift." });
      return;
    }

    if (Number.isNaN(parsedOpeningBalance) || parsedOpeningBalance < 0) {
      toast({ variant: "destructive", description: "Enter a valid opening balance." });
      return;
    }

    setIsStartingShift(true);

    try {
      const { data } = await axios.post(route("pos.session.store"), {
        warehouse_id: parseInt(shiftWarehouse, 10),
        opening_balance: parsedOpeningBalance,
      });

      setCurrentSession(data.session);
      setOpeningBalance("");
      setDisplayTransactionNumber(nextTransactionNumberPreview || "000001");
      toast({ description: "Shift started successfully." });
      searchInputRef.current?.focus();
    } catch (error) {
      toast({ variant: "destructive", description: error.response?.data?.message || "Unable to start shift." });
    } finally {
      setIsStartingShift(false);
    }
  };

  const handleCreateNewCustomer = async () => {
    try {
      const { data } = await axios.post(route("pos.customers.store"), newCustomer);

      setCustomers((previous) => [data.customer, ...previous]);
      setSelectedCustomer(data.customer);
      setNewCustomer(createEmptyCustomerForm());
      setShowCustomerDialog(false);
      setIsCollapsed(false);
      toast({ description: "Customer created successfully." });
    } catch (error) {
      toast({ variant: "destructive", description: error.response?.data?.message || "Unable to create customer." });
    }
  };

  const handleDocumentCapture = (key, url) => {
    setDocumentUrls((previous) => ({
      ...previous,
      [key]: url || "",
    }));
  };

  const handleDocumentUpload = async (key, file) => {
    if (!file) {
      return;
    }

    setIsUploadingDocs(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(route("pos.uploads.store"), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      handleDocumentCapture(key, data.file_url);
    } catch (error) {
      toast({ variant: "destructive", description: error.response?.data?.message || "Document upload failed." });
    } finally {
      setIsUploadingDocs(false);
    }
  };

  const handleCheckout = () => {
    if (!currentSession?.id) {
      toast({ variant: "destructive", description: "Start a shift before checking out." });
      return;
    }

    if (!selectedCustomerRecord?.id) {
      toast({ variant: "destructive", description: "Select a customer before checkout." });
      return;
    }

    if (cart.length === 0) {
      toast({ variant: "destructive", description: "Add at least one item to the cart." });
      return;
    }

    setShowDocumentDialog(true);
  };

  const processTransaction = async () => {
    if (!currentSession?.id) {
      toast({ variant: "destructive", description: "No active session found." });
      return;
    }

    if (!selectedCustomerRecord?.id) {
      toast({ variant: "destructive", description: "Select a customer first." });
      return;
    }

    if (cart.length === 0) {
      toast({ variant: "destructive", description: "Cart is empty." });
      return;
    }

    if (!manualOrNumber.trim()) {
      toast({ variant: "destructive", description: "Official receipt number is required." });
      return;
    }

    if (payments.length === 0) {
      toast({ variant: "destructive", description: "Add at least one payment before completing the sale." });
      return;
    }

    if (effectiveBalanceDue > 0.01) {
      toast({ variant: "destructive", description: "The transaction still has an outstanding balance." });
      return;
    }

    setProcessingTransaction(true);

    try {
      const payloadItems = cart.map((item) => ({
        inventory_item_id: item.inventory_id,
        price_basis: item.price_basis,
        snapshot_cash_price: item.cash_price || 0,
        snapshot_srp: item.srp || 0,
        snapshot_cost_price: item.cost_price || 0,
        discount_amount: item.discount_amount || 0,
        line_total: Math.max(0, (item.unit_price || 0) - (item.discount_amount || 0)),
        is_bundle: Boolean(item.is_bundle),
        bundle_serial: item.bundle_serial || null,
        bundle_components: (item.bundle_components || []).map((component) => ({
          inventory_id: component.inventory_id,
        })),
      }));

      if ((manualDiscount?.amount || 0) > 0 && payloadItems[0]) {
        payloadItems[0].discount_amount += manualDiscount.amount;
        payloadItems[0].line_total = Math.max(0, payloadItems[0].line_total - manualDiscount.amount);
      }

      const payload = {
        pos_session_id: currentSession.id,
        customer_id: selectedCustomerRecord.id,
        sales_representative_id: defaultSalesRep ? parseInt(defaultSalesRep, 10) : null,
        or_number: manualOrNumber.trim(),
        mode_of_release: modeOfRelease,
        remarks: remarks || null,
        total_amount: effectiveTotal,
        items: payloadItems,
        payments: payments.map((payment) => {
          const details = payment.payment_details || {};
          const supportingDocUrls = details.supporting_doc_urls || details.supportingDocUrls || [];

          return {
            payment_method_id: parseInt(payment.payment_method_id, 10),
            amount: parseFloat(payment.amount) || 0,
            payment_details: {
              reference_number: payment.reference_number || details.reference_number || null,
              downpayment: details.downpayment ?? details.downpayment_amount ?? null,
              bank: details.bank || null,
              terminal_used: details.terminal_used || details.terminalUsed || null,
              card_holder_name: details.card_holder_name || details.cardHolderName || null,
              loan_term_months: details.loan_term_months ? parseInt(details.loan_term_months, 10) : null,
              sender_mobile: details.sender_mobile || details.sender_mobile_number || null,
              contract_id: details.contract_id || null,
              registered_mobile: details.registered_mobile || null,
              supporting_doc_urls: supportingDocUrls.map((document, index) => ({
                name: document.name || `${payment.payment_method}-${index + 1}`,
                url: document.url,
                type: document.type || "supporting_document",
              })),
            },
          };
        }),
        documents: Object.entries(documentUrls)
          .filter(([, url]) => Boolean(url))
          .map(([documentType, documentUrl]) => ({
            document_type: documentType,
            document_name: documentType.replaceAll("_", " "),
            document_url: documentUrl,
          })),
      };

      const { data } = await axios.post(route("pos.transactions.store"), payload);

      setCompletedTransaction(data.transaction);
      setShowPaymentDialog(false);
      setShowDocumentDialog(false);
      setShowReceiptDialog(true);
      resetTransactionState();
      await Promise.all([
        loadTransactions(currentSession.id),
        refreshTransactionNumber(),
      ]);

      toast({ description: "Transaction completed successfully." });
    } catch (error) {
      toast({ variant: "destructive", description: error.response?.data?.message || "Transaction failed." });
    } finally {
      setProcessingTransaction(false);
    }
  };

  const printReceipt = (transaction = completedTransaction) => {
    openPrintWindow(transaction);
  };

  const handlePrintFromHistory = (transaction) => {
    openPrintWindow(transaction);
  };

  if (currentView === "search") {
    return (
      <>
        <Head title="POS" />
        <POSSessionTransactionsView
          transactions={sessionTransactions}
          onClose={() => setCurrentView("pos")}
          onPrintTransaction={handlePrintFromHistory}
        />
      </>
    );
  }

  if (cashier?.setup_error) {
    return (
      <>
        <Head title="POS" />
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6">
          <div className="mx-auto max-w-3xl">
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">POS Cashier Mapping Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <p>{cashier.setup_error}</p>
                <p>User: {cashier.full_name || cashier.email}</p>
                <p>Email: {cashier.email || "N/A"}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (!currentSession?.id) {
    return (
      <>
        <Head title="POS" />
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
          <div className="mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-slate-900 dark:text-slate-100">Start POS Shift</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Cashier</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{cashier?.full_name || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">Ready to open shift</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <Select value={shiftWarehouse} onValueChange={setShiftWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Opening Balance</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingBalance}
                    onChange={(event) => setOpeningBalance(event.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <Button onClick={handleStartShift} disabled={isStartingShift} className="w-full bg-[#002060] hover:bg-[#00164a]">
                  {isStartingShift ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Shift...
                    </>
                  ) : (
                    "Start Shift"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">POS Readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-3">
                  <Store className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{warehouses.length} warehouse(s) available</p>
                    <p>Select the warehouse where this shift will transact inventory.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{customers.length} customer(s) loaded</p>
                    <p>Customer lookup and creation are ready for this shift.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{paymentMethods.length} payment method(s) loaded</p>
                    <p>Checkout stays enabled only for methods backed by current tables.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head title="POS" />
      <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950">
        <POSHeader
          displayTransactionNumber={displayTransactionNumber}
          currentUser={cashier}
          isLoadingSession={false}
          warehouses={warehouses}
          selectedWarehouse={currentSession.warehouse_id}
          suspendedCount={0}
          isFullscreen={isFullscreen}
          activePricingTotal={activePricingTotal}
          grandTotal={grandTotal}
          onRecall={() => setCurrentView("search")}
          onToggleFullscreen={toggleFullscreen}
          onEndShift={() => setShowEndShiftDialog(true)}
        />

        <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="min-h-0 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Scan IMEI, serial number, or enter search text"
                    className="pl-9"
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDiscountDialogItemIndex(null);
                    setManualDiscount({ amount: manualDiscount?.amount || 0 });
                    setShowItemDiscountDialog(true);
                  }}
                  disabled={cart.length === 0}
                >
                  Transaction Discount
                </Button>
              </div>

              {barcodeMatches.length > 0 && (
                <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  {barcodeMatches.map((item) => (
                    <button
                      key={item.inventory_id}
                      type="button"
                      onClick={() => handleAddToCart(item, "cash")}
                      className="w-full px-3 py-2 text-left border-b last:border-b-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.displayName || [item.product_name, item.variant_name].filter(Boolean).join(" ")}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {[item.imei1, item.imei2, item.serial_number].filter(Boolean).join(" | ")}
                          </div>
                        </div>
                        <div className="text-right text-xs shrink-0">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            P{(item.cash_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            SOH: {item.stock_on_hand || 0}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                  <Search className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="font-medium">Scan or search inventory to begin</p>
                  <p className="text-xs mt-1">Querying is handled by the backend against the live schema.</p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <POSCartTable
                      cart={cart}
                      salesRepOptions={salesRepOptions}
                      onRemoveFromCart={handleRemoveFromCart}
                      onDiscountClick={handleDiscountClick}
                      onTogglePriceBasis={toggleItemPriceBasis}
                    />
                  </div>
                  <div className="grid gap-3 md:hidden">
                    {cart.map((item, index) => (
                      <POSCartItemCard
                        key={item.inventory_id}
                        item={item}
                        index={index}
                        salesRepOptions={salesRepOptions}
                        onRemove={handleRemoveFromCart}
                        onDiscountClick={handleDiscountClick}
                        onTogglePriceBasis={toggleItemPriceBasis}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900">
              <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
                <Card className="overflow-hidden border-0 rounded-none bg-transparent py-0 gap-0 shadow-none">
                  {isCollapsed ? (
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-h-[116px] w-full items-center justify-between gap-4 bg-[#002060] px-6 py-4 text-left text-white transition hover:bg-[#00164a] dark:bg-slate-950 dark:hover:bg-slate-900"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-200 dark:text-slate-300">
                            Customer Details
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="truncate text-sm font-medium text-white dark:text-slate-100">
                              {selectedCustomerLabel}
                            </p>
                            <p className="truncate text-xs text-slate-200 dark:text-slate-300">
                              {selectedSalesRepLabel}
                            </p>
                          </div>
                        </div>
                        <span className="flex items-center gap-2 text-xs font-medium text-white dark:text-slate-100">
                          Expand
                          <ChevronDown className="w-4 h-4 shrink-0" />
                        </span>
                      </button>
                    </CollapsibleTrigger>
                  ) : (
                    <div className="bg-[#002060] dark:bg-slate-950 px-6 py-3 border-b border-transparent dark:border-slate-800 flex items-start justify-between gap-3 text-white">
                      <div>
                        <p className="text-sm font-semibold text-white dark:text-slate-100">Customer Details</p>
                        <p className="text-xs text-slate-200 dark:text-slate-300">Select the customer and sales representative for this sale.</p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Collapse customer details"
                          className="border border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  )}

                  <CollapsibleContent>
                    <CardContent className="bg-white dark:bg-slate-950 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Customer</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Select or create the customer for this sale.</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setShowCustomerDialog(true)}>
                          Add Customer
                        </Button>
                      </div>

                      <Combobox
                        value={selectedCustomerRecord?.id ? String(selectedCustomerRecord.id) : ""}
                        onValueChange={(value) => {
                          const customer = customers.find((entry) => String(entry.id) === value) || null;
                          setSelectedCustomer(customer);
                        }}
                        options={customerComboOptions}
                        placeholder="Select customer"
                        searchPlaceholder="Search customers..."
                        emptyText="No customer found"
                      />

                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sales Representative</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Optional per transaction.</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setShowAddSalesRepDialog(true)}>
                          Add Sales Rep
                        </Button>
                      </div>

                      <Combobox
                        value={defaultSalesRep}
                        onValueChange={setDefaultSalesRep}
                        options={salesRepOptions}
                        placeholder="Select sales representative"
                        searchPlaceholder="Search sales reps..."
                        emptyText="No sales representative found"
                      />

                      <CustomerInsights customer={selectedCustomerRecord} />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            <div className="flex-1 overflow-auto">
              <PaymentSettlement
                cart={cart}
                paymentTypes={paymentMethods}
                payments={payments}
                onPaymentsChange={setPayments}
                rawSubtotal={rawSubtotal}
                totalItemLevelDiscounts={totalItemLevelDiscounts}
                taxAmount={taxAmount}
                grandTotal={grandTotal}
                onPriceTypeLock={() => {}}
                onCheckout={handleCheckout}
                selectedCustomer={selectedCustomerRecord}
                balanceDue={effectiveBalanceDue}
                onPricingChange={setActivePricingTotal}
                onSuspend={() => {}}
                canSuspend={false}
                manualDiscount={manualDiscount}
                onManualDiscountChange={setManualDiscount}
                warehouseId={currentSession.warehouse_id}
                inventory={cart}
                employees={salesReps}
              />
            </div>
          </div>
        </div>
      </div>

      <CustomerDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        onCreateCustomer={handleCreateNewCustomer}
        customers={customers}
      />

      <DocumentDialog
        open={showDocumentDialog}
        onOpenChange={setShowDocumentDialog}
        manualOrNumber={manualOrNumber}
        setManualOrNumber={setManualOrNumber}
        modeOfRelease={modeOfRelease}
        setModeOfRelease={setModeOfRelease}
        remarks={remarks}
        setRemarks={setRemarks}
        documentUrls={documentUrls}
        onDocumentCapture={handleDocumentCapture}
        onDocumentUpload={handleDocumentUpload}
        isUploadingDocs={isUploadingDocs}
        onProceedToPayment={() => {
          setShowDocumentDialog(false);
          setShowPaymentDialog(true);
        }}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        cart={cart}
        payments={payments}
        rawSubtotal={rawSubtotal}
        totalItemLevelDiscounts={totalItemLevelDiscounts + (manualDiscount?.amount || 0)}
        taxRate={taxRate}
        taxAmount={taxAmount}
        grandTotal={effectiveTotal}
        totalPaid={totalPaid}
        changeAmount={changeAmount}
        balanceDue={effectiveBalanceDue}
        processingTransaction={processingTransaction}
        onProcessTransaction={processTransaction}
      />

      <ReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        completedTransaction={completedTransaction}
        selectedCustomer={customers.find((customer) => customer.id === completedTransaction?.customer_id) || selectedCustomerRecord}
        onPrintReceipt={() => printReceipt(completedTransaction)}
      />

      <EndShiftDialog
        open={showEndShiftDialog}
        onOpenChange={setShowEndShiftDialog}
        activeSession={currentSession}
        sessionTransactions={sessionTransactions}
        onClosed={(session) => {
          setCurrentSession(session?.status === "closed" ? null : session);
          setShowEndShiftDialog(false);
          resetTransactionState();
        }}
      />

      <AddSalesRepDialog
        open={showAddSalesRepDialog}
        onOpenChange={setShowAddSalesRepDialog}
        onSuccess={(salesRep) => {
          setSalesReps((previous) => [...previous, salesRep].sort((left, right) => left.full_name.localeCompare(right.full_name)));
          setDefaultSalesRep(String(salesRep.id));
        }}
      />

      <DiscountDialog
        open={showItemDiscountDialog}
        onOpenChange={(open) => {
          setShowItemDiscountDialog(open);
          if (!open) {
            setDiscountDialogItemIndex(null);
          }
        }}
        onApplyDiscount={(discount) => {
          if (discountDialogItemIndex === null) {
            setManualDiscount(discount.amount > 0 ? discount : null);
            return;
          }

          updateItemDiscount(discount);
        }}
        currentDiscount={discountDialogItemIndex !== null ? cart[discountDialogItemIndex]?.discount_amount || 0 : manualDiscount?.amount || 0}
      />
    </>
  );
}
