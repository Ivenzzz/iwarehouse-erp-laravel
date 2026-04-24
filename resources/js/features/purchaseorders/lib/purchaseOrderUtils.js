import { format } from "date-fns";

export const getStatusColor = (status) => {
  const colors = {
    pending: "border-chart-3/30 bg-chart-3/15 text-chart-3",
    approved: "border-primary/20 bg-primary/15 text-primary",
    rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  };
  return colors[status] || "border-border bg-muted text-muted-foreground";
};

export const getStatusLabel = (status) => {
  const labels = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status] || status || "Unknown";
};

export const getPaymentBadgeClass = (hasPaid) =>
  hasPaid
    ? "border-success/20 bg-success/10 text-success"
    : "border-warning/20 bg-warning/10 text-warning";

export const getPaymentBadgeLabel = (hasPaid) => (hasPaid ? "Paid" : "Unpaid");

export const hasDeliveryReceiptFlag = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
};

export const normalizeSpecPart = (value) => String(value || "").trim().toLowerCase();

export const buildRequestItemKey = (productMasterId, spec) =>
  `${productMasterId || ""}|${normalizeSpecPart(spec?.model_code)}|${normalizeSpecPart(spec?.condition)}|${normalizeSpecPart(spec?.ram)}|${normalizeSpecPart(spec?.rom)}`;

export const createEmptyLineItem = () => ({
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

export const createInitialFormData = () => ({
  supplier_id: "",
  expected_delivery_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  shipping_method: "Standard Delivery",
  shipping_amount: "",
  payment_terms: "Net 30",
  items: [],
});

export const calculateLineTotal = (quantity, unitPrice, discount = 0) => {
  const gross = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const discountPercent = Math.min(100, Math.max(0, Number(discount) || 0));
  return Math.max(0, gross * (1 - discountPercent / 100));
};

export const calculateTotals = (items, shipping = 0) => {
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

export const formatMoney = (value) =>
  `PHP ${(Number(value) || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatDate = (value, pattern = "MMM dd, yyyy") => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return format(parsed, pattern);
};

export const getSupplierName = (supplier) =>
  supplier?.master_profile?.legal_business_name ||
  supplier?.master_profile?.trade_name ||
  supplier?.CompanyName ||
  "Unknown Supplier";

export const getSupplierContactText = (supplier) => {
  const email = supplier?.contact_details?.email || "";
  const phone = supplier?.contact_details?.mobile_landline || "";
  const contactParts = [email, phone].filter(Boolean);
  return contactParts.length > 0 ? contactParts.join(" | ") : "No contact on file";
};
