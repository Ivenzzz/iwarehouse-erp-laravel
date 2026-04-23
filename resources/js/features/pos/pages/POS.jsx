import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Head } from "@inertiajs/react";

import { toast } from "@/shared/hooks/use-toast";
import { Button } from "@/components/ui/button";

import CustomerDialog from "@/features/pos/components/dialogs/CustomerDialog";
import DocumentDialog from "@/features/pos/components/dialogs/DocumentDialog";
import PaymentDialog from "@/features/pos/components/dialogs/PaymentDialog";
import ReceiptDialog from "@/features/pos/components/dialogs/ReceiptDialog";
import EndShiftDialog from "@/features/pos/components/session/EndShiftDialog";
import PaymentSettlement from "@/features/pos/components/sale/PaymentSettlement";
import AddSalesRepDialog from "@/features/pos/components/dialogs/AddSalesRepDialog";
import POSSessionTransactionsView from "@/features/pos/components/session/POSSessionTransactionsView";
import DiscountDialog from "@/features/pos/components/dialogs/DiscountDialog";
import POSHeader from "@/features/pos/components/session/POSHeader";
import POSCartTable from "@/features/pos/components/sale/POSCartTable";
import POSCartItemCard from "@/features/pos/components/sale/POSCartItemCard";
import { generateWarrantyReceiptHTML } from "@/features/pos/lib/services/sale/warrantyReceiptService";
import StartShiftCard from "@/features/pos/components/session/StartShiftCard";
import BarcodeSearchPanel from "@/features/pos/components/sale/BarcodeSearchPanel";
import EmptyCartState from "@/features/pos/components/sale/EmptyCartState";
import CustomerDetailsPanel from "@/features/pos/components/customer/CustomerDetailsPanel";
import PriceCheckView from "@/features/pos/components/tools/PriceCheckView";
import POSReturnsView from "@/features/pos/components/tools/POSReturnsView";
import AppShell from "@/shared/layouts/AppShell";
import { ArchiveRestore, Search, Tag } from "lucide-react";

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
      region: "",
      postal_code: "",
      country: "Philippines",
      country_code: "PH",
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
  const [selectedSalesRep, setSelectedSalesRep] = useState(null);
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
  const branchLabel = currentSession?.warehouse_name || "";
  const customerOptionsById = useMemo(
    () => new Map(customers.map((customer) => [String(customer.id), customer])),
    [customers],
  );
  const salesRepOptionsById = useMemo(
    () => new Map(salesReps.map((salesRep) => [String(salesRep.id), salesRep])),
    [salesReps],
  );

  const customerComboOptions = useMemo(
    () => customers.map((customer) => ({
      value: String(customer.id),
      label: customer.display_label || customer.full_name,
    })),
    [customers],
  );

  const salesRepOptions = useMemo(
    () => salesReps.map((salesRep) => ({
      value: String(salesRep.id),
      label: salesRep.display_label || salesRep.label || salesRep.full_name,
    })),
    [salesReps],
  );
  const warehouseOptions = useMemo(
    () => warehouses.map((warehouse) => ({
      value: String(warehouse.id),
      label: warehouse.name,
    })),
    [warehouses],
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
  const selectedCustomerLabel = selectedCustomer?.display_label || selectedCustomer?.full_name || "No customer selected";
  const selectedSalesRepLabel = selectedSalesRep?.display_label || selectedSalesRep?.label || selectedSalesRep?.full_name || "No sales representative selected";

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
      if (event.key === "F3") {
        event.preventDefault();
        setCurrentView((current) => current === "price_check" ? "pos" : "price_check");
      }
      if (event.key === "F5") {
        event.preventDefault();
        setCurrentView((current) => current === "returns" ? "pos" : "returns");
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
    if (currentView !== "pos") {
      return;
    }

    if (document.fullscreenElement) {
      setIsFullscreen(true);
      return;
    }

    document.documentElement.requestFullscreen?.().catch(() => { });
  }, [currentView]);

  useEffect(() => {
    if (selectedCustomer?.id && selectedSalesRep?.id) {
      setIsCollapsed(true);
    }
  }, [selectedCustomer?.id, selectedSalesRep?.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => { });
      return;
    }

    document.exitFullscreen?.().catch(() => { });
  };

  const resetTransactionState = () => {
    setCart([]);
    setPayments([]);
    setSelectedCustomer(null);
    setSelectedSalesRep(null);
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

  const openPrintWindow = (transaction, existingWindow = null) => {
    if (!transaction) {
      return;
    }

    const html = generateWarrantyReceiptHTML({
      transaction,
      companyInfo,
    });

    const printWindow = existingWindow && !existingWindow.closed
      ? existingWindow
      : window.open("", "_blank");
    if (!printWindow) {
      toast({ variant: "destructive", description: "Unable to open print window." });
      return;
    }

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const receiptUrl = URL.createObjectURL(blob);
    printWindow.location.replace(receiptUrl);
    printWindow.addEventListener("load", () => {
      setTimeout(() => URL.revokeObjectURL(receiptUrl), 60000);
    }, { once: true });
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
      discount_proof_image_url: null,
      discount_proof_file: null,
      discount_validated_at: null,
      sales_representative_id: selectedSalesRep?.id || null,
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

  const updateItemDiscount = ({
    amount,
    discount_proof_image_url = null,
    discount_proof_file = null,
    discount_validated_at = null,
  }) => {
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
        discount_proof_image_url: appliedDiscount > 0 ? discount_proof_image_url : null,
        discount_proof_file: appliedDiscount > 0 ? discount_proof_file : null,
        discount_validated_at: appliedDiscount > 0 ? discount_validated_at : null,
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

    if (!selectedCustomer?.id) {
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

    if (!selectedCustomer?.id) {
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

    const queuedPrintWindow = window.open("", "_blank");
    if (queuedPrintWindow) {
      queuedPrintWindow.document.write("<title>Preparing Warranty Receipt...</title><p style=\"font-family: Arial, sans-serif; padding: 16px;\">Preparing warranty receipt...</p>");
      queuedPrintWindow.document.close();
    } else {
      toast({ variant: "destructive", description: "Automatic print was blocked. You can still print from the receipt dialog." });
    }

    setProcessingTransaction(true);

    try {
      const normalizeToStoragePath = (value, fieldLabel) => {
        if (!value) {
          return null;
        }

        const raw = String(value).trim();
        if (!raw) {
          return null;
        }

        if (raw.startsWith("pos-documents/")) {
          return raw;
        }

        if (raw.startsWith("/storage/pos-documents/")) {
          return raw.replace(/^\/storage\//, "");
        }

        if (/^https?:\/\//i.test(raw)) {
          try {
            const parsed = new URL(raw);
            if (parsed.pathname.startsWith("/storage/pos-documents/")) {
              return parsed.pathname.replace(/^\/storage\//, "");
            }
          } catch {
            throw new Error(`${fieldLabel}: invalid document URL format.`);
          }
        }

        throw new Error(`${fieldLabel}: only local POS storage paths are allowed.`);
      };

      const uploadDiscountProof = async (file) => {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const { data } = await axios.post(route("pos.uploads.store"), formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          return normalizeToStoragePath(data.path || data.file_url, "Discount proof");
        } catch (error) {
          const validationErrors = error?.response?.data?.errors;
          const firstFieldErrors = validationErrors && typeof validationErrors === "object"
            ? Object.values(validationErrors).find((messages) => Array.isArray(messages) && messages.length > 0)
            : null;

          throw new Error(firstFieldErrors?.[0] || error?.response?.data?.message || "Failed to upload discount proof image.");
        }
      };
      const uploadPaymentSupportingDoc = async (file, fieldLabel) => {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const { data } = await axios.post(route("pos.uploads.store"), formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          return normalizeToStoragePath(data.path || data.file_url, fieldLabel);
        } catch (error) {
          const validationErrors = error?.response?.data?.errors;
          const firstFieldErrors = validationErrors && typeof validationErrors === "object"
            ? Object.values(validationErrors).find((messages) => Array.isArray(messages) && messages.length > 0)
            : null;

          throw new Error(firstFieldErrors?.[0] || error?.response?.data?.message || `Failed to upload ${fieldLabel}.`);
        }
      };

      const itemDiscountProofUrls = new Map();
      for (let index = 0; index < cart.length; index += 1) {
        const item = cart[index];

        if ((item.discount_amount || 0) <= 0) {
          continue;
        }

        if (item.discount_proof_file instanceof File) {
          const uploadedUrl = await uploadDiscountProof(item.discount_proof_file);
          itemDiscountProofUrls.set(index, uploadedUrl);
        }
      }

      let manualDiscountProofUrl = manualDiscount?.discount_proof_image_url || null;
      if ((manualDiscount?.amount || 0) > 0 && manualDiscount?.discount_proof_file instanceof File) {
        manualDiscountProofUrl = await uploadDiscountProof(manualDiscount.discount_proof_file);
      }
      if ((manualDiscount?.amount || 0) > 0 && !manualDiscount?.discount_proof_file) {
        manualDiscountProofUrl = normalizeToStoragePath(manualDiscountProofUrl, "Manual discount proof");
      }

      const payloadItems = cart.map((item, index) => ({
        inventory_item_id: item.inventory_id,
        price_basis: item.price_basis,
        snapshot_cash_price: item.cash_price || 0,
        snapshot_srp: item.srp || 0,
        snapshot_cost_price: item.cost_price || 0,
        discount_amount: item.discount_amount || 0,
        discount_proof_image_url: item.discount_amount > 0
          ? normalizeToStoragePath(
            itemDiscountProofUrls.get(index) || item.discount_proof_image_url || null,
            `Item ${index + 1} discount proof`,
          )
          : null,
        discount_validated_at: item.discount_amount > 0 ? item.discount_validated_at || null : null,
        line_total: Math.max(0, (item.unit_price || 0) - (item.discount_amount || 0)),
        is_bundle: Boolean(item.is_bundle),
        bundle_serial: item.bundle_serial || null,
        bundle_components: (item.bundle_components || []).map((component) => ({
          inventory_id: component.inventory_id,
        })),
      }));

      if ((manualDiscount?.amount || 0) > 0 && payloadItems[0]) {
        payloadItems[0].discount_amount += manualDiscount.amount;
        payloadItems[0].discount_proof_image_url = manualDiscountProofUrl;
        payloadItems[0].discount_validated_at = manualDiscount.discount_validated_at || null;
        payloadItems[0].line_total = Math.max(0, payloadItems[0].line_total - manualDiscount.amount);
      }

      const payloadPayments = [];
      for (let paymentIndex = 0; paymentIndex < payments.length; paymentIndex += 1) {
        const payment = payments[paymentIndex];
        const details = payment.payment_details || {};
        const supportingDocUrls = details.supporting_doc_urls || details.supportingDocUrls || [];
        const uploadedSupportingDocs = [];

        for (let documentIndex = 0; documentIndex < supportingDocUrls.length; documentIndex += 1) {
          const document = supportingDocUrls[documentIndex] || {};
          const fieldLabel = `${payment.payment_method} supporting doc ${documentIndex + 1}`;
          const normalizedUrl = document.file instanceof File
            ? await uploadPaymentSupportingDoc(document.file, fieldLabel)
            : normalizeToStoragePath(document.url, fieldLabel);

          uploadedSupportingDocs.push({
            name: document.name || `${payment.payment_method}-${documentIndex + 1}`,
            url: normalizedUrl,
            type: document.type || "supporting_document",
          });
        }

        payloadPayments.push({
          payment_method_id: parseInt(payment.payment_method_id, 10),
          amount: parseFloat(payment.amount) || 0,
          payment_details: {
            reference_number: payment.reference_number || details.reference_number || null,
            downpayment: details.downpayment !== undefined && details.downpayment !== null
              ? String(details.downpayment)
              : details.downpayment_amount !== undefined && details.downpayment_amount !== null
                ? String(details.downpayment_amount)
                : null,
            bank: details.bank || null,
            terminal_used: details.terminal_used || details.terminalUsed || null,
            card_holder_name: details.card_holder_name || details.cardHolderName || null,
            loan_term_months: details.loan_term_months ? parseInt(details.loan_term_months, 10) : null,
            sender_mobile: details.sender_mobile || details.sender_mobile_number || null,
            contract_id: details.contract_id || null,
            registered_mobile: details.registered_mobile || null,
            supporting_doc_urls: uploadedSupportingDocs,
          },
        });
      }

      const payload = {
        pos_session_id: currentSession.id,
        customer_id: selectedCustomer.id,
        sales_representative_id: selectedSalesRep?.id || null,
        or_number: manualOrNumber.trim(),
        mode_of_release: modeOfRelease,
        remarks: remarks || null,
        total_amount: effectiveTotal,
        items: payloadItems,
        payments: payloadPayments,
        documents: Object.entries(documentUrls)
          .filter(([, url]) => Boolean(url))
          .map(([documentType, documentUrl]) => ({
            document_type: documentType,
            document_name: documentType.replaceAll("_", " "),
            document_url: normalizeToStoragePath(documentUrl, `Transaction document: ${documentType}`),
          })),
      };

      const { data } = await axios.post(route("pos.transactions.store"), payload);

      setCompletedTransaction(data.transaction);
      setShowPaymentDialog(false);
      setShowDocumentDialog(false);
      setShowReceiptDialog(true);
      openPrintWindow(data.transaction, queuedPrintWindow);
      resetTransactionState();
      await Promise.all([
        loadTransactions(currentSession.id),
        refreshTransactionNumber(),
      ]);

      toast({ description: "Transaction completed successfully." });
    } catch (error) {
      if (queuedPrintWindow && !queuedPrintWindow.closed) {
        queuedPrintWindow.close();
      }

      const validationErrors = error?.response?.data?.errors;
      const firstFieldErrors = validationErrors && typeof validationErrors === "object"
        ? Object.values(validationErrors).find((messages) => Array.isArray(messages) && messages.length > 0)
        : null;

      toast({
        variant: "destructive",
        description: firstFieldErrors?.[0] || error?.message || error.response?.data?.message || "Transaction failed.",
      });
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

  if (!currentSession?.id) {
    return (
      <>
        <Head title="POS" />
        <AppShell title="POS">
          <StartShiftCard
            cashier={cashier}
            shiftWarehouse={shiftWarehouse}
            onShiftWarehouseChange={setShiftWarehouse}
            warehouseOptions={warehouseOptions}
            openingBalance={openingBalance}
            onOpeningBalanceChange={setOpeningBalance}
            isStartingShift={isStartingShift}
            onStartShift={handleStartShift}
          />
        </AppShell>
      </>
    );
  }

  if (currentView === "price_check") {
    return (
      <>
        <Head title="POS" />
        <PriceCheckView
          currentWarehouseId={currentSession?.warehouse_id}
          onClose={() => setCurrentView("pos")}
        />
      </>
    );
  }

  if (currentView === "returns") {
    return (
      <>
        <Head title="POS" />
        <POSReturnsView onClose={() => setCurrentView("pos")} />
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
          branchLabel={branchLabel}
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
            <BarcodeSearchPanel
              searchInputRef={searchInputRef}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              isSearching={isSearching}
              cart={cart}
              onOpenTransactionDiscount={() => {
                setDiscountDialogItemIndex(null);
                setShowItemDiscountDialog(true);
              }}
              barcodeMatches={barcodeMatches}
              onAddToCart={handleAddToCart}
            />

            <div className="flex-1 overflow-auto p-0">
              {cart.length === 0 ? (
                <EmptyCartState />
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

            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setCurrentView("search")}
                  className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.02em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Search className="h-3.5 w-3.5" />
                  Transactions (F2)
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView("price_check")}
                  className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.02em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Price Check (F3)
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView("returns")}
                  className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.02em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Return (F5)
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950">
            <CustomerDetailsPanel
              isCollapsed={isCollapsed}
              onCollapsedChange={setIsCollapsed}
              effectiveBalanceDue={effectiveBalanceDue}
              selectedCustomerLabel={selectedCustomerLabel}
              selectedSalesRepLabel={selectedSalesRepLabel}
              onShowCustomerDialog={() => setShowCustomerDialog(true)}
              onShowAddSalesRepDialog={() => setShowAddSalesRepDialog(true)}
              selectedCustomer={selectedCustomer}
              onSelectedCustomerChange={setSelectedCustomer}
              customerOptionsById={customerOptionsById}
              customerComboOptions={customerComboOptions}
              selectedSalesRep={selectedSalesRep}
              onSelectedSalesRepChange={setSelectedSalesRep}
              salesRepOptionsById={salesRepOptionsById}
              salesRepOptions={salesRepOptions}
            />
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
                onPriceTypeLock={() => { }}
                onCheckout={handleCheckout}
                selectedCustomer={selectedCustomer}
                balanceDue={effectiveBalanceDue}
                onPricingChange={setActivePricingTotal}
                onSuspend={() => { }}
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
          setSalesReps((previous) => [...previous, salesRep].sort((left, right) => {
            const leftLabel = left.display_label || left.full_name;
            const rightLabel = right.display_label || right.full_name;

            return leftLabel.localeCompare(rightLabel);
          }));
          setSelectedSalesRep(salesRep);
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
            setManualDiscount(discount.amount > 0 ? {
              amount: discount.amount,
              discount_proof_image_url: discount.discount_proof_image_url || null,
              discount_proof_file: discount.discount_proof_file || null,
              discount_validated_at: discount.discount_validated_at || null,
            } : null);
            return;
          }

          updateItemDiscount(discount);
        }}
        currentDiscount={discountDialogItemIndex !== null ? cart[discountDialogItemIndex]?.discount_amount || 0 : manualDiscount?.amount || 0}
        posSessionId={currentSession?.id || null}
      />
    </>
  );
}
