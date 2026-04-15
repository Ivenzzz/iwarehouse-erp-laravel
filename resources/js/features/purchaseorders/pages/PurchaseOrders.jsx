import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import { format } from "date-fns";
import { toast } from "@/shared/hooks/use-toast";
import AppShell from "@/shared/layouts/AppShell";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";

import { Plus, Send, Search, RefreshCw, ShoppingBag, CheckCircle2, Printer, Edit, Trash2, History, Clock, ChevronRight, Filter, User, FileText } from "lucide-react";

const SCHEMA_STATUSES = ["pending", "approved", "rejected"];
const PRODUCT_SEARCH_MIN_CHARS = 2;
const PRODUCT_SEARCH_LIMIT = 30;

const getStatusColor = (status) => {
  const colors = {
    pending: "border-chart-3/30 bg-chart-3/15 text-chart-3",
    approved: "border-primary/20 bg-primary/15 text-primary",
    rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  };
  return colors[status] || "border-border bg-muted text-muted-foreground";
};

const getStatusLabel = (status) => {
  const labels = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status] || status || "Unknown";
};

const getPaymentBadgeClass = (hasPaid) =>
  hasPaid
    ? "border-success/20 bg-success/10 text-success"
    : "border-warning/20 bg-warning/10 text-warning";

const getPaymentBadgeLabel = (hasPaid) => (hasPaid ? "Paid" : "Unpaid");

const hasDeliveryReceiptFlag = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
};

const normalizeSpecPart = (value) => String(value || "").trim().toLowerCase();

const buildRequestItemKey = (productMasterId, spec) =>
  `${productMasterId || ""}|${normalizeSpecPart(spec?.model_code)}|${normalizeSpecPart(spec?.condition)}|${normalizeSpecPart(spec?.ram)}|${normalizeSpecPart(spec?.rom)}`;

const createEmptyLineItem = () => ({
  aggregate_option_key: "",
  product_master_id: "",
  product_name: "",
  product_spec: {
    model_code: "",
    ram: "",
    rom: "",
    condition: "",
  },
  quantity: 1,
  unit_price: "",
  discount: "",
  total_price: 0,
  description: "",
});

const createInitialFormData = () => ({
  supplier_id: "",
  expected_delivery_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  shipping_method: "Standard Delivery",
  shipping_amount: "",
  payment_terms: "Net 30",
  items: [],
});

const calculateTotals = (items, shipping = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateLineTotal(item.quantity, item.unit_price, item.discount);
  }, 0);
  const shippingAmount = Number(shipping) || 0;

  return {
    subtotal,
    shipping_amount: shippingAmount,
    total_amount: subtotal + shippingAmount,
  };
};

const calculateLineTotal = (quantity, unitPrice, discount = 0) => {
  const gross = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const discountPercent = Math.min(100, Math.max(0, Number(discount) || 0));
  return Math.max(0, gross * (1 - discountPercent / 100));
};

const formatMoney = (value) =>
  `PHP ${(Number(value) || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value, pattern = "MMM dd, yyyy") => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return format(parsed, pattern);
};

const notifySuccess = (message) => toast({ title: "Success", description: message });
const notifyError = (message) => toast({ variant: "destructive", title: "Error", description: message });

const getSupplierName = (supplier) =>
  supplier?.master_profile?.legal_business_name ||
  supplier?.master_profile?.trade_name ||
  supplier?.CompanyName ||
  "Unknown Supplier";

const getSupplierContactText = (supplier) => {
  const email = supplier?.contact_details?.email || "";
  const phone = supplier?.contact_details?.mobile_landline || "";
  const contactParts = [email, phone].filter(Boolean);
  return contactParts.length > 0 ? contactParts.join(" | ") : "No contact on file";
};

const RELOAD_PROPS = [
  "purchase_orders",
  "pagination",
  "filters",
  "kpis",
  "suppliers",
  "payment_terms",
  "shipping_methods",
  "company_info",
];

export default function PurchaseOrderManagement({
  purchase_orders = [],
  pagination = { page: 1, per_page: 10, total: 0, last_page: 1 },
  filters = { search: "", status_tab: "all", sort: "created_at", direction: "desc", page: 1, per_page: 10 },
  suppliers = [],
  company_info = null,
}) {
  const [activeTab, setActiveTab] = useState("purchase_orders");
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [statusFilter, setStatusFilter] = useState(filters.status_tab || "all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPendingId, setSelectedPendingId] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [formData, setFormData] = useState(createInitialFormData());
  const [productSearchTerms, setProductSearchTerms] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productOptionsByIndex, setProductOptionsByIndex] = useState({});

  const schemaPOs = useMemo(() => purchase_orders.filter((po) => SCHEMA_STATUSES.includes(po.status)), [purchase_orders]);

  const query = useMemo(() => ({
    search: searchTerm,
    status_tab: statusFilter,
    sort: filters.sort || "created_at",
    direction: filters.direction || "desc",
    page: filters.page || 1,
    per_page: filters.per_page || 10,
  }), [filters.direction, filters.page, filters.per_page, filters.sort, searchTerm, statusFilter]);

  const refresh = (overrides = {}) => {
    router.get(route("purchase-orders.index"), { ...query, ...overrides }, {
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  useEffect(() => {
    setSearchTerm(filters.search || "");
    setStatusFilter(filters.status_tab || "all");
  }, [filters.search, filters.status_tab]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if ((filters.search || "") !== searchTerm || (filters.status_tab || "all") !== statusFilter) {
        refresh({ page: 1 });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: getSupplierName(supplier),
      })),
    [suppliers]
  );

  const productOptionByKey = useMemo(() => {
    return Object.values(productOptionsByIndex).flat().reduce((acc, option) => {
      acc[String(option.value)] = option;
      return acc;
    }, {});
  }, [productOptionsByIndex]);

  const pendingPOs = useMemo(() => schemaPOs.filter((po) => po.status === "pending"), [schemaPOs]);

  const activePendingPO = useMemo(() => {
    return pendingPOs.find((po) => po.id === selectedPendingId) || pendingPOs[0] || null;
  }, [pendingPOs, selectedPendingId]);

  useEffect(() => {
    if (activeTab === "pending_list" && pendingPOs.length > 0 && !selectedPendingId) {
      setSelectedPendingId(pendingPOs[0].id);
    }
  }, [activeTab, pendingPOs, selectedPendingId]);

  const resetForm = () => {
    setFormData(createInitialFormData());
    setEditingPO(null);
    setProductSearchTerms({});
    setProductOptionsByIndex({});
  };

  const normalizePOToFormData = (po) => {
    const items = po.items_json?.items || [];
    const financials = po.financials_json || {};
    const shipping = po.shipping_json || {};

    return {
      supplier_id: po.supplier_id || "",
      expected_delivery_date: po.expected_delivery_date ? format(new Date(po.expected_delivery_date), "yyyy-MM-dd") : "",
      shipping_method: shipping.shipping_method || "Standard Delivery",
      shipping_amount: financials.shipping_amount ?? "",
      payment_terms: financials.payment_terms || "Net 30",
      items:
        items.length > 0
          ? items.map((item) => ({
              aggregate_option_key: buildRequestItemKey(item.product_master_id, item.product_spec || {}),
              product_master_id: item.product_master_id || "",
              product_name: item.product_name || "",
              product_spec: {
                model_code: item.product_spec?.model_code || "",
                ram: item.product_spec?.ram || "",
                rom: item.product_spec?.rom || "",
                condition: item.product_spec?.condition || "",
              },
              quantity: Number(item.quantity) || 0,
              unit_price: Number(item.unit_price) || 0,
              total_price: Number(item.total_price) || 0,
              discount: Math.min(100, Math.max(0, Number(item.discount) || 0)),
              description: item.description || "",
            }))
          : [],
    };
  };

  const handleEditPO = (po) => {
    setEditingPO(po);
    setFormData(normalizePOToFormData(po));
    setShowCreateDialog(true);
  };

  const buildPurchaseOrderPayload = () => ({
    supplier_id: Number(formData.supplier_id),
    expected_delivery_date: formData.expected_delivery_date || null,
    shipping_method: formData.shipping_method || "",
    shipping_amount: Number(formData.shipping_amount) || 0,
    payment_terms: formData.payment_terms || "",
    items: formData.items.map((item) => ({
      product_master_id: Number(item.product_master_id),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      discount: Math.min(100, Math.max(0, Number(item.discount) || 0)),
      description: item.description || "",
      product_spec: {
        model_code: item.product_spec?.model_code || "",
        ram: item.product_spec?.ram || "",
        rom: item.product_spec?.rom || "",
        condition: item.product_spec?.condition || "",
      },
    })),
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier_id || !formData.expected_delivery_date) {
      notifyError("Please fill in required fields (Supplier, Expected Delivery Date).");
      return;
    }

    if (formData.items.length === 0) {
      notifyError("Please add at least one item.");
      return;
    }

    if (formData.items.some((item) => !item.product_master_id)) {
      notifyError("Each line item must have a product.");
      return;
    }

    const poData = buildPurchaseOrderPayload();

    try {
      setIsSubmitting(true);
      if (editingPO) {
        await axios.put(route("purchase-orders.update", editingPO.id), poData);
        notifySuccess("Purchase Order updated successfully.");
      } else {
        const response = await axios.post(route("purchase-orders.store"), poData);
        notifySuccess(`Purchase Order ${response.data?.purchase_order?.po_number || ""} created successfully.`);
      }

      setShowCreateDialog(false);
      resetForm();
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
    } catch (error) {
      notifyError(error?.response?.data?.message || "Failed to save purchase order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyLineItem()],
    }));
  };

  const getFilteredProductOptions = (index) => {
    const rawSearch = productSearchTerms[index] || "";
    const trimmedSearch = rawSearch.trim().toLowerCase();

    if (trimmedSearch.length < PRODUCT_SEARCH_MIN_CHARS) {
      return [];
    }
    return productOptionsByIndex[index] || [];
  };

  const handleProductSearch = async (index, value) => {
    setProductSearchTerms((prev) => ({ ...prev, [index]: value }));
    if ((value || "").trim().length < PRODUCT_SEARCH_MIN_CHARS) {
      setProductOptionsByIndex((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    try {
      const { data } = await axios.get(route("purchase-orders.product-options"), {
        params: { search: value, limit: PRODUCT_SEARCH_LIMIT },
      });
      setProductOptionsByIndex((prev) => ({ ...prev, [index]: data?.options || [] }));
    } catch {
      setProductOptionsByIndex((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const nextItem = { ...newItems[index] };

      if (field === "aggregate_option_key") {
        const option = productOptionByKey[String(value)];
        nextItem.aggregate_option_key = option?.value || "";
        nextItem.product_master_id = option?.product_master_id || "";
        nextItem.product_name = option?.title || option?.label || nextItem.product_name || "";
        nextItem.product_spec = {
          model_code: option?.product_spec?.model_code || "",
          ram: option?.product_spec?.ram || "",
          rom: option?.product_spec?.rom || "",
          condition: option?.product_spec?.condition || "",
        };
      } else {
        nextItem[field] =
          field === "quantity" || field === "unit_price" || field === "discount"
            ? value === ""
              ? ""
              : Number(value)
            : value;
      }

      nextItem.total_price = calculateLineTotal(nextItem.quantity, nextItem.unit_price, nextItem.discount);
      newItems[index] = nextItem;

      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
    setProductSearchTerms((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleApprove = async () => {
    if (!activePendingPO) return;

    try {
      await axios.post(route("purchase-orders.approve"), {
        purchase_order_id: activePendingPO.id,
        notes: "Purchase Order approved",
      });
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
      notifySuccess("Purchase Order approved.");
    } catch (error) {
      notifyError("Approval failed.");
    }
  };

  const handleReject = async () => {
    if (!activePendingPO) return;

    try {
      await axios.post(route("purchase-orders.reject"), {
        purchase_order_id: activePendingPO.id,
        notes: rejectReason || "Purchase Order rejected",
      });
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
      notifySuccess("Purchase Order rejected.");
      setShowRejectDialog(false);
      setRejectReason("");
    } catch (error) {
      notifyError("Rejection failed.");
    }
  };

  const handlePrintPO = (po) => {
    const supplier = suppliers.find((s) => s.id === po.supplier_id);
    const items = po.items_json?.items || [];
    const financials = po.financials_json || {};

    const supplierName = getSupplierName(supplier);
    const supplierAddress = supplier?.legal_tax_compliance?.registered_address || "";
    const supplierEmail = supplier?.contact_details?.email || "";
    const supplierPhone = supplier?.contact_details?.mobile_landline || "";
    const paymentTerms = financials.payment_terms || "Net 30";
    const approverName = po.approval_json?.approver_name || "";
    const approvalDate = po.approval_json?.approved_date
      ? formatDate(po.approval_json.approved_date, "MMMM dd, yyyy")
      : "";
    const deliveryAddress = company_info?.address || "Delivery address to be confirmed";
    const deliveryContact = company_info?.phone || company_info?.email || "Contact person to be assigned";
    const paymentTaxNote = company_info?.tax_id ? `Tax ID: ${company_info.tax_id}` : "Tax details available upon request";
    const paymentReference = company_info?.email || company_info?.phone || "Finance team contact on file";
    const termsText =
      "This purchase order is system-generated and remains subject to supplier confirmation, agreed lead times, and ERP approval records.";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notifyError("Unable to open print preview.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title>Loading...</title>
        <style>
          body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; background: #f5f5f5; }
          .loader { text-align: center; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <div class="loader-text">Generating PDF...</div>
        </div>
      </body>
      </html>`);
    printWindow.document.close();

    setTimeout(() => {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${po.po_number}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 24px; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: 'Times New Roman', serif;
              color: #1f2937;
              background: #ffffff;
            }
            main {
              display: flex;
              flex-direction: column;
              min-height: calc(100vh - 34px);
              margin-bottom: 40px;
              padding-bottom: 44px;
            }
            .no-break {
              page-break-inside: avoid;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 16px;
            }
            .info-card {
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              overflow: hidden;
              background: #ffffff;
              min-height: 142px;
            }
            .info-card-header {
              background: #f7f8fb;
              color: #264a73;
              font-size: 10px;
              font-weight: 700;
              padding: 10px 12px;
            }
            .info-card-body {
              padding: 10px 12px 12px;
            }
            .meta-label {
              display: block;
              font-size: 9px;
              font-weight: 700;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 2px;
            }
            .meta-value {
              font-size: 11px;
              line-height: 1;
              margin: 0 0 6px;
              color: #111827;
            }
            .meta-value-strong {
              font-weight: 700;
            }
            .section-title {
              font-size: 12px;
              font-weight: 700;
              color: #111827;
              margin: 0 0 8px;
            }
            .items-table {
              width: 100%;
              padding: 8px 0;
              border-collapse: collapse;
              border: 1px solid #ececec;
              border-left: none;
              border-right: none;
            }
            .items-table thead th {
              background: #fafafa;
              border-bottom: 1px solid #e5e7eb;
              color: #111827;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.08em;
              padding: 8px 10px;
              text-transform: uppercase;
            }
            .items-table tbody td {
              border-bottom: 1px solid #ededed;
              font-size: 10px;
              padding: 10px;
              vertical-align: top;
            }
            .items-table tbody tr:last-child td {
              border-bottom: none;
            }
            .item-name {
              font-weight: 700;
              margin-bottom: 2px;
            }
            .item-description {
              color: #4b5563;
              font-size: 10px;
              line-height: 1.28;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .totals-wrap {
              display: flex;
              justify-content: flex-end;
              margin: 10px 0 22px;
            }
            .totals-card {
              width: 244px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 2px 0;
              font-size: 11px;
            }
            .total-row .label {
              color: #6b7280;
            }
            .grand-total {
              border-top: 1px solid #d1d5db;
              margin-top: 6px;
              padding-top: 8px;
              font-size: 13px;
              font-weight: 700;
            }
            .bottom-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: auto;
            }
            .bottom-card {
              border: 1px solid #e5e7eb;
              background: #fbfbfc;
              min-height: 140px;
              padding: 12px 14px;
            }
            .bottom-title {
              margin: 0 0 12px;
              font-size: 12px;
              font-weight: 700;
              color: #111827;
            }
            .signature-line {
              display: flex;
              gap: 8px;
              align-items: center;
              margin-bottom: 10px;
              font-size: 10px;
            }
            .signature-label {
              width: 74px;
              color: #374151;
            }
            .signature-value {
              flex: 1;
              min-height: 14px;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 1px;
            }
            .terms-text {
              font-size: 10px;
              line-height: 1.35;
              color: #4b5563;
              margin: 0;
            }
            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background: #ffffff;
              border-top: 1px solid #d1d5db;
              color: #6b7280;
              font-size: 9px;
              text-align: center;
              padding-top: 6px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body class="bg-white text-gray-800 flex flex-col min-h-screen">
          <main class="flex-1">
            <div class="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
              <div class="flex gap-4 items-start">
                ${
                  company_info?.logo_url
                    ? `<div class="w-20 h-20 bg-gray-100 flex items-center justify-center rounded-lg"><img src="${company_info.logo_url}" alt="Logo" class="max-w-full max-h-full object-contain" /></div>`
                    : ""
                }
                <div class="text-xs leading-tight">
                  <h2 class="text-sm font-bold mb-1">${company_info?.company_name || "iWarehouse Corp."}</h2>
                  ${company_info?.address ? `<p>${company_info.address}</p>` : ""}
                  ${company_info?.phone ? `<p>Tel: ${company_info.phone}</p>` : ""}
                  ${company_info?.email ? `<p>Email: ${company_info.email}</p>` : ""}
                </div>
              </div>
              <div class="text-right">
                <h3 class="text-2xl font-bold">${po.po_number}</h3>
              </div>
            </div>

            <h1 class="text-center text-slate-600 text-xl font-bold my-1 tracking-wide">PURCHASE ORDER</h1>

            <div class="info-grid no-break">
              <div class="info-card">
                <div class="info-card-header">Supplier</div>
                <div class="info-card-body">
                  <span class="meta-label">Supplier</span>
                  <p class="meta-value meta-value-strong">${supplierName}</p>
                  <span class="meta-label">Address</span>
                  <p class="meta-value">${supplierAddress || "Address to be confirmed"}</p>
                  <span class="meta-label">Contact</span>
                  <p class="meta-value">${[supplierEmail, supplierPhone].filter(Boolean).join(" | ") || "Contact details to be confirmed"}</p>
                </div>
              </div>
              <div class="info-card">
                <div class="info-card-header">Delivery</div>
                <div class="info-card-body">
                  <span class="meta-label">Expected Delivery Date</span>
                  <p class="meta-value meta-value-strong">${formatDate(po.expected_delivery_date, "MMMM dd, yyyy")}</p>
                  <span class="meta-label">Delivery Address</span>
                  <p class="meta-value">${deliveryAddress}</p>
                  <span class="meta-label">Contact Person</span>
                  <p class="meta-value">${deliveryContact}</p>
                </div>
              </div>
              <div class="info-card">
                <div class="info-card-header">Payment</div>
                <div class="info-card-body">
                  <span class="meta-label">Tax</span>
                  <p class="meta-value">${paymentTaxNote}</p>
                  <span class="meta-label">Reference</span>
                  <p class="meta-value">${paymentReference}</p>
                  <span class="meta-label">Terms</span>
                  <p class="meta-value meta-value-strong">${paymentTerms}</p>
                </div>
              </div>
            </div>

            <div class="items-section mb-6">
              <h3 class="text-lg font-semibold mb-3">Order Items</h3>
              <div class="no-break">
                <table class="items-table">
                  <thead>
                    <tr>
                      <th class="text-left">Product / Description</th>
                      <th class="text-center" style="width: 80px;">Qty</th>
                      <th class="text-right" style="width: 140px;">Unit Price</th>
                      <th class="text-right" style="width: 110px;">Discount</th>
                      <th class="text-right" style="width: 140px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items
                      .map((item) => {
                        const productLine = item.product_name || "Unknown Item";
                        return `
                          <tr>
                            <td>
                              <div class="item-name">${productLine}</div>
                            </td>
                            <td class="text-center">${item.quantity || 0}</td>
                            <td class="text-right">${formatMoney(item.unit_price)}</td>
                            <td class="text-right">${Math.min(100, Math.max(0, Number(item.discount) || 0))}%</td>
                            <td class="text-right">${formatMoney(item.total_price)}</td>
                          </tr>
                        `;
                      })
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="totals-wrap no-break">
              <div class="totals-card">
                <div class="total-row">
                  <span class="label">Subtotal:</span>
                  <span>${formatMoney(financials.subtotal)}</span>
                </div>
                <div class="total-row">
                  <span class="label">Shipping:</span>
                  <span>${formatMoney(financials.shipping_amount)}</span>
                </div>
                <div class="total-row grand-total">
                  <span>TOTAL:</span>
                  <span>${formatMoney(financials.total_amount)}</span>
                </div>
              </div>
            </div>

            <div class="bottom-grid no-break">
              <div class="bottom-card">
                <h4 class="bottom-title">Approved By</h4>
                <div class="signature-line">
                  <span class="signature-label">Name:</span>
                  <span class="signature-value">${approverName}</span>
                </div>
                <div class="signature-line">
                  <span class="signature-label">Approval Date:</span>
                  <span class="signature-value">${approvalDate}</span>
                </div>
              </div>
              <div class="bottom-card">
                <h4 class="bottom-title">Terms and Conditions</h4>
                <p class="terms-text">${termsText}</p>
              </div>
            </div>

          </main>

          <footer class="print-footer text-center text-[10px] text-gray-500 border-t border-gray-300 pt-3 mt-8">
            <p>This is a computer-generated document. Generated on ${format(new Date(), "MMMM dd, yyyy hh:mm:ss a").toUpperCase()}</p>
            <p class="mt-1">For inquiries: ${company_info?.email || "N/A"} | ${company_info?.phone || "N/A"}</p>
          </footer>

          <script>
            document.title = '${po.po_number}';
            window.onload = function() { setTimeout(() => window.print(), 250); };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }, 500);
  };

  return (
    <AppShell title="Purchase Orders">
      <Head title="Purchase Orders" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="z-20 flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShoppingBag className="h-7 w-7 text-primary" />
            Purchase Order Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, track, and approve procurement orders.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-border bg-background text-foreground hover:bg-accent"
            onClick={() => router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true })}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Create PO
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-border bg-card">
          <TabsList className="h-12 w-full justify-start bg-transparent p-0">
            <TabsTrigger
              value="purchase_orders"
              className="h-full rounded-none border-b-2 border-transparent px-6 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-accent/50 data-[state=active]:text-primary"
            >
              All Purchase Orders
            </TabsTrigger>
            <TabsTrigger
              value="pending_list"
              className="relative h-full rounded-none border-b-2 border-transparent px-6 text-muted-foreground data-[state=active]:border-chart-3 data-[state=active]:bg-accent/50 data-[state=active]:text-chart-3"
            >
              Pending Approvals
              {pendingPOs.length > 0 && (
                <span className="ml-2 rounded-full border border-chart-3/30 bg-chart-3/15 px-2 py-0.5 text-[10px] font-bold text-chart-3">
                  {pendingPOs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="purchase_orders" className="mt-0 flex flex-1 flex-col overflow-hidden bg-card data-[state=inactive]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4">
            <div className="flex flex-1 gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search PO#, Supplier, RFQ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-border bg-background pl-9 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] border-border bg-background text-foreground">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <table className="w-full rounded-lg border border-border text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/70 font-medium text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">PO Number</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">RFQ Number</th>
                  <th className="px-6 py-3">Expected</th>
                  <th className="px-6 py-3">Shipping</th>
                  <th className="px-6 py-3">Payment Terms</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {schemaPOs.map((po) => {
                    const supplier = suppliers.find((s) => s.id === po.supplier_id);
                    const rfq = po.rfq_number ? { rfq_number: po.rfq_number } : null;
                    const total = po.financials_json?.total_amount || 0;
                    const poItems = po.items_json?.items || [];
                    const totalItemQuantity = poItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                    const isPaid = Boolean(po.payable_json?.has_paid);

                    return (
                      <tr key={po.id} className="bg-card transition-colors hover:bg-accent/40">
                        <td className="px-6 py-4 font-mono font-medium text-primary">{po.po_number}</td>
                        <td className="px-6 py-4">
                          {poItems.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button">
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-accent"
                                  >
                                    {totalItemQuantity} total qty
                                  </Badge>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 border-border bg-popover text-popover-foreground" align="start">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                  </div>
                                  <div className="space-y-3">
                                    {poItems.map((item, itemIndex) => {
                                      const productTitle = item.product_name || "Unknown Item";

                                      return (
                                        <div key={`${po.id}-item-${itemIndex}`} className="rounded-lg border border-border p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <p className="font-medium text-foreground">{productTitle}</p>
                                            <Badge variant="outline" className="border-border bg-background text-[10px]">
                                              Qty: {Number(item.quantity) || 0}
                                            </Badge>
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {item.product_spec?.condition && (
                                              <Badge variant="secondary" className="text-[10px]">
                                                {item.product_spec.condition}
                                              </Badge>
                                            )}
                                            {item.product_spec?.ram && (
                                              <Badge variant="secondary" className="text-[10px]">
                                                {item.product_spec.ram}
                                              </Badge>
                                            )}
                                            {item.product_spec?.rom && (
                                              <Badge variant="secondary" className="text-[10px]">
                                                {item.product_spec.rom}
                                              </Badge>
                                            )}
                                          </div>
                                          {item.description ? (
                                            <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{getSupplierName(supplier)}</div>
                          <div className="text-xs text-muted-foreground">{getSupplierContactText(supplier)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{rfq?.rfq_number || "-"}</td>
                        <td className="px-6 py-4">{formatDate(po.expected_delivery_date)}</td>
                        <td className="px-6 py-4">{po.shipping_json?.shipping_method || "N/A"}</td>
                        <td className="px-6 py-4">{po.financials_json?.payment_terms || "N/A"}</td>
                        <td className="px-6 py-4 font-semibold">{formatMoney(total)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge className={`${getStatusColor(po.status)} border`} variant="outline">
                              {getStatusLabel(po.status)}
                            </Badge>
                            {hasDeliveryReceiptFlag(po.has_delivery_receipt) && (
                              <Badge className="border-success/20 bg-success/10 text-success border" variant="outline">
                                Arrived
                              </Badge>
                            )}
                            <Badge className={`${getPaymentBadgeClass(isPaid)} border`} variant="outline">
                              {getPaymentBadgeLabel(isPaid)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handlePrintPO(po)} title="Print PDF">
                              <Printer className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPO(po)}
                              title={po.status === "approved" ? "Approved POs cannot be edited" : "Edit PO"}
                              disabled={po.status === "approved"}
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {schemaPOs.length === 0 && (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-muted-foreground">
                      No schema-aligned purchase orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {pagination.page} of {Math.max(1, pagination.last_page)} | {pagination.total} total records
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => refresh({ page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.last_page}
                  onClick={() => refresh({ page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pending_list" className="mt-0 flex flex-1 flex-row overflow-hidden data-[state=inactive]:hidden">
          <div className="z-10 flex w-[350px] shrink-0 flex-col border-r border-border bg-card">
            <div className="border-b border-border bg-muted/50 p-4">
              <h3 className="font-bold text-foreground">Approval Queue</h3>
              <p className="mt-1 text-xs text-muted-foreground">Review pending purchase orders</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {pendingPOs.length === 0 ? (
                <div className="mt-10 p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-3 h-12 w-12 opacity-20" />
                  <p className="font-medium">All caught up!</p>
                  <p className="mt-1 text-xs">No pending approvals.</p>
                </div>
              ) : (
                pendingPOs.map((po) => {
                  const supplier = suppliers.find((s) => s.id === po.supplier_id);
                  const total = po.financials_json?.total_amount || 0;
                  const isSelected = selectedPendingId === po.id || (!selectedPendingId && activePendingPO?.id === po.id);

                  return (
                    <div
                      key={po.id}
                      onClick={() => setSelectedPendingId(po.id)}
                      className={`group cursor-pointer border-b border-border p-4 transition-all hover:bg-accent/40 ${isSelected ? "border-l-4 border-l-primary bg-accent/40" : "border-l-4 border-l-transparent"}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className={`font-mono text-xs font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                          {po.po_number}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(po.expected_delivery_date, "MMM dd")}</span>
                      </div>
                      <h4 className="truncate text-sm font-semibold text-foreground">{getSupplierName(supplier)}</h4>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline" className="h-5 border-border bg-background px-1 py-0 text-[10px] text-muted-foreground">
                          {(po.items_json?.items || []).length} Items
                        </Badge>
                        <span className="text-sm font-bold text-foreground">{formatMoney(total)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
            {activePendingPO ? (
              <>
                <div className="z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-8 py-4 shadow-sm">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold uppercase tracking-wider">Pending Review</span>
                      <ChevronRight size={12} />
                      <span>{activePendingPO.po_number}</span>
                    </div>
                    <h2 className="text-xl font-bold text-foreground">
                      {getSupplierName(suppliers.find((s) => s.id === activePendingPO.supplier_id))}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border bg-background text-foreground hover:bg-accent"
                      onClick={() => handlePrintPO(activePendingPO)}
                    >
                      <Printer className="mr-2 h-4 w-4" /> Preview PDF
                    </Button>
                    <Button variant="outline" size="sm" className="border-border bg-background text-foreground hover:bg-accent">
                      <History className="mr-2 h-4 w-4" /> History
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-8">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-sm font-bold text-foreground">Schema-backed Review</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This workspace preserves the old approval flow while showing only fields stored in the Purchase Order schema.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card className="border-border bg-card shadow-sm">
                      <CardContent className="pt-6">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                          <User size={14} /> Vendor Details
                        </div>
                        <p className="font-semibold text-foreground">
                          {getSupplierName(suppliers.find((s) => s.id === activePendingPO.supplier_id))}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {suppliers.find((s) => s.id === activePendingPO.supplier_id)?.contact_details?.email || "No email"}
                        </p>
                        <div className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                          RFQ: {activePendingPO.rfq_id || "N/A"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm">
                      <CardContent className="pt-6">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                          <Clock size={14} /> Logistics
                        </div>
                        <p className="font-semibold text-foreground">{activePendingPO.shipping_json?.shipping_method || "N/A"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Expected: {formatDate(activePendingPO.expected_delivery_date)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Shipping Amount: <span className="text-foreground">{formatMoney(activePendingPO.financials_json?.shipping_amount)}</span>
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm">
                      <CardContent className="pt-6">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                          <FileText size={14} /> Approval Summary
                        </div>
                        <p className="font-semibold text-foreground">{getStatusLabel(activePendingPO.status)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Approver: {activePendingPO.approval_json?.approver_name || "Not approved yet"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Terms: {activePendingPO.financials_json?.payment_terms || "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-muted/70 font-medium text-muted-foreground">
                        <tr>
                          <th className="px-6 py-3">Item Description</th>
                          <th className="px-6 py-3">Specification</th>
                          <th className="px-6 py-3 text-right">Qty</th>
                          <th className="px-6 py-3 text-right">Unit Price</th>
                          <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(activePendingPO.items_json?.items || []).map((item, idx) => {
                          const spec = [
                            item.product_spec?.ram ? `RAM: ${item.product_spec.ram}` : "",
                            item.product_spec?.rom ? `ROM: ${item.product_spec.rom}` : "",
                            item.product_spec?.condition ? `Condition: ${item.product_spec.condition}` : "",
                          ]
                            .filter(Boolean)
                            .join(" | ");

                          return (
                            <tr key={idx}>
                              <td className="px-6 py-4">
                                <div className="font-bold text-foreground">{item.product_name || "Unknown Item"}</div>
                                <div className="text-xs text-muted-foreground">{item.description || "No description"}</div>
                              </td>
                              <td className="px-6 py-4 text-xs text-muted-foreground">{spec || "No specification"}</td>
                              <td className="px-6 py-4 text-right">{item.quantity}</td>
                              <td className="px-6 py-4 text-right">{formatMoney(item.unit_price)}</td>
                              <td className="px-6 py-4 text-right font-medium text-foreground">{formatMoney(item.total_price)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="flex flex-col items-end border-t border-border bg-muted/50 p-6">
                      <div className="w-72 space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Subtotal</span>
                          <span>{formatMoney(activePendingPO.financials_json?.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Shipping</span>
                          <span>{formatMoney(activePendingPO.financials_json?.shipping_amount)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                          <span className="text-lg font-bold text-foreground">Total</span>
                          <span className="text-2xl font-extrabold text-primary">
                            {formatMoney(activePendingPO.financials_json?.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <Label className="mb-2 block font-semibold text-foreground">Status History</Label>
                    <div className="space-y-3">
                      {(activePendingPO.status_history?.history || []).length > 0 ? (
                        (activePendingPO.status_history?.history || []).map((entry, index) => (
                          <div key={`${activePendingPO.id}-history-${index}`} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between gap-4">
                              <Badge variant="outline" className={`${getStatusColor(entry.status)} border`}>
                                {getStatusLabel(entry.status)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(entry.timestamp, "MMM dd, yyyy hh:mm a")}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-foreground">{entry.notes || "No notes provided."}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{entry.changed_by_name || entry.changed_by || "Unknown"}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No status history recorded yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="h-24"></div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between border-t border-border bg-card p-4 px-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="text-xs text-muted-foreground">
                    <span className="block font-semibold text-foreground">Approval Summary:</span>
                    {activePendingPO.approval_json?.approver_name
                      ? `Approved by ${activePendingPO.approval_json.approver_name} on ${formatDate(activePendingPO.approval_json.approved_date, "MMM dd, yyyy hh:mm a")}`
                      : "Awaiting approval"}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      Reject
                    </Button>
                    <Button className="min-w-[200px] bg-primary text-primary-foreground shadow-md hover:bg-primary/90" onClick={handleApprove}>
                      <Send className="mr-2 h-4 w-4" /> Approve PO
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <ShoppingBag size={32} className="opacity-40" />
                </div>
                <p className="text-lg font-medium text-foreground">No PO Selected</p>
                <p className="text-sm">Select a pending order from the list to review details.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 border-border bg-card p-0 text-card-foreground">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-foreground">{editingPO ? `Edit PO ${editingPO.po_number}` : "Create New Purchase Order"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Combobox
                    options={supplierOptions}
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                    placeholder="Select Supplier..."
                    searchPlaceholder="Search supplier..."
                    emptyText="No supplier found."
                    className="h-10 border-border bg-background text-foreground hover:bg-accent"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Delivery Date *</Label>
                  <Input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  />
                </div>

              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Input
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder="Net 30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Shipping Amount</Label>
                    <Input
                      type="number"
                      value={formData.shipping_amount}
                      onChange={(e) => setFormData({ ...formData, shipping_amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Shipping Method</Label>
                  <Input
                    value={formData.shipping_method}
                    onChange={(e) => setFormData({ ...formData, shipping_method: e.target.value })}
                    placeholder="Standard Delivery"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Order Items</h3>
                <Button size="sm" onClick={addItem} variant="outline" className="border-border bg-background text-foreground hover:bg-accent">
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {formData.items.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">No items added.</div>}
                {formData.items.map((item, index) => {
                  const fallbackAggregateKey = item.product_master_id
                    ? buildRequestItemKey(item.product_master_id, item.product_spec || {})
                    : "";
                  const selectedAggregateKey = item.aggregate_option_key || fallbackAggregateKey;
                  const selectedProductOption =
                    productOptionByKey[selectedAggregateKey] ||
                    (selectedAggregateKey
                      ? {
                          value: selectedAggregateKey,
                          variant_id: null,
                          label: item.product_name || "Selected Product",
                          title: item.product_name || "Selected Product",
                          product_spec: item.product_spec || {},
                          product_master_id: item.product_master_id || "",
                        }
                      : undefined);
                  return (
                    <div key={index} className="rounded border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Label className="text-xs">Product</Label>
                          <Combobox
                            options={getFilteredProductOptions(index)}
                            value={selectedAggregateKey}
                            selectedOption={selectedProductOption}
                            onValueChange={(v) => updateItem(index, "aggregate_option_key", v)}
                            onSearchChange={(value) => handleProductSearch(index, value)}
                            debounceMs={250}
                            minSearchChars={PRODUCT_SEARCH_MIN_CHARS}
                            searchPlaceholder="Search product..."
                            emptyText="No product found."
                            placeholder="Select Product"
                            className="h-auto min-h-9 border-slate-300 bg-white py-2 text-slate-900 hover:bg-slate-50 dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800 dark:hover:bg-white/5"
                            renderOption={(option) => {
                              const condition = option.product_spec?.condition || "";
                              const isCPO = condition === "Certified Pre-Owned";
                              const badgeCls = "text-[10px] px-1.5 h-5";

                              return (
                                <div className="flex min-w-0 flex-col gap-1 py-1">
                                  <span className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                                    {option.title || option.label}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {condition && (
                                      <Badge
                                        variant="outline"
                                        className={`${badgeCls} ${
                                          isCPO
                                            ? "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                                            : "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20"
                                        }`}
                                      >
                                        {isCPO ? "CPO" : condition}
                                      </Badge>
                                    )}
                                    {option.product_spec?.ram && (
                                      <Badge
                                        variant="outline"
                                        className={`${badgeCls} bg-violet-100/50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20`}
                                      >
                                        {option.product_spec.ram}
                                      </Badge>
                                    )}
                                    {option.product_spec?.rom && (
                                      <Badge
                                        variant="outline"
                                        className={`${badgeCls} bg-sky-100/50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20`}
                                      >
                                        {option.product_spec.rom}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            }}
                            renderSelectedOption={(option) => {
                              const condition = option.product_spec?.condition || "";
                              const isCPO = condition === "Certified Pre-Owned";
                              const badgeCls = "text-[10px] px-1.5 h-5";

                              return (
                                <div className="flex min-w-0 flex-col gap-1 py-0.5">
                                  <span className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                                    {option.title || option.label}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {condition && (
                                      <Badge
                                        variant="outline"
                                        className={`${badgeCls} ${
                                          isCPO
                                            ? "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                                            : "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20"
                                        }`}
                                      >
                                        {isCPO ? "CPO" : condition}
                                      </Badge>
                                    )}
                                    {option.product_spec?.ram && (
                                      <Badge
                                        variant="outline"
                                        className={`${badgeCls} bg-violet-100/50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20`}
                                      >
                                        {option.product_spec.ram}
                                      </Badge>
                                    )}
                                    {option.product_spec?.rom && (
                                      <Badge
                                        variant="outline"
                                        className={`${badgeCls} bg-sky-100/50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20`}
                                      >
                                        {option.product_spec.rom}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            }}
                          />
                        </div>
                        <div className="w-20 shrink-0">
                          <Label className="text-xs">Qty</Label>
                          <Input type="number" className="h-9" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                        </div>
                        <div className="w-36 shrink-0">
                          <Label className="text-xs">Price</Label>
                          <Input type="number" className="h-9" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} />
                        </div>
                        <div className="w-28 shrink-0">
                          <Label className="text-xs">Discount</Label>
                          <Input
                            type="number"
                            className="h-9"
                            value={item.discount}
                            onChange={(e) => updateItem(index, "discount", e.target.value)}
                            placeholder="0%"
                          />
                        </div>
                        <div className="w-44 shrink-0">
                          <Label className="text-xs">Total</Label>
                          <div className="flex h-9 items-center justify-end rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground">
                            {formatMoney(item.total_price)}
                          </div>
                        </div>
                        <div className="flex w-9 shrink-0 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pr-4">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatMoney(calculateTotals(formData.items, formData.shipping_amount).subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatMoney(calculateTotals(formData.items, formData.shipping_amount).shipping_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatMoney(calculateTotals(formData.items, formData.shipping_amount).total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-muted/40 px-6 py-4">
            <Button
              variant="outline"
              className="border-border bg-background text-foreground hover:bg-accent"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={isSubmitting}>
              {editingPO ? "Save Changes" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Please provide a reason for rejecting this order. This will be stored in status history.</p>
            <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border bg-background text-foreground hover:bg-accent"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AppShell>
  );
}
