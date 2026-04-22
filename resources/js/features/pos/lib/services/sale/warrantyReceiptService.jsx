import { format } from "date-fns";
import { getTransactionDiscountTotal } from "@/utils/transactionDiscounts";

const PHP_SYMBOL = "&#8369;";

function getFirstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function getCompanyHeaderAddress(company) {
  return [company?.address, company?.city, company?.country]
    .filter((value) => typeof value === "string" && value.trim())
    .join(", ");
}

function normalizeReceiptItem(item) {
  const quantity = item.quantity || 1;
  const displayLabel = getFirstNonEmpty(
    [item.identifier, item.receipt_description].filter(Boolean).join(" - "),
    item.receipt_description,
    item.display_name,
    item.product_name,
    item.variant_name,
    item.identifier,
  );

  return {
    quantity,
    value: (item.unit_price || 0) * quantity,
    displayLabel: displayLabel || "N/A",
    warrantyDescription: item.warranty_description || "",
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPeso(value) {
  return `${PHP_SYMBOL}${toNumber(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDateSafe(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return format(date, "MM/dd/yyyy, h:mm:ss a");
}

/**
 * Generates the warranty receipt HTML string (no window management).
 * Used by both the legacy popup flow and the new in-tab print page.
 */
export function generateWarrantyReceiptHTML({
  transaction,
  companyInfo,
}) {
  const company = companyInfo?.[0] || null;
  const normalizedItems = (transaction.items || []).map((item) => normalizeReceiptItem(item));

  const logoUrl = company?.logo_url || null;
  const transactionDiscount = getTransactionDiscountTotal(transaction);
  const companyAddressLine = getCompanyHeaderAddress(company);
  const companyPhone = getFirstNonEmpty(company?.phone);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Warranty Receipt - ${transaction.or_number || "N/A"}</title>
      <style>
        :root { color-scheme: light; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: letter; margin: 10mm; margin-top: 0; margin-bottom: 0; }
        html, body { background: #fff !important; color: #000 !important; }
        body { font-family: Arial, sans-serif; padding: 15px; font-size: 10px; line-height: 1.3; max-width: 210mm; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 12px; }
        .company-logo { max-height: 50px; max-width: 180px; margin-bottom: 8px; }
        .document-title { font-size: 14px; font-weight: bold; margin: 8px 0; }
        .company-info { margin-bottom: 10px; font-size: 9px; }
        .section { margin-bottom: 10px; }
        .section-title { font-weight: bold; margin-bottom: 5px; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { padding: 4px 6px; text-align: left; border-bottom: 1px solid #ddd; font-size: 9px; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .totals-table { width: 100%; margin-top: 8px; }
        .totals-table td { padding: 3px 6px; border: none; font-size: 9px; }
        .totals-table .label { text-align: left; font-weight: normal; }
        .totals-table .grand-total { font-weight: bold; font-size: 11px; border-top: 2px solid #333; padding-top: 6px; }
        .warranty-terms { margin-top: 12px; font-size: 8px; line-height: 1.4; text-align: justify; }
        .signature-section { margin-top: 15px; display: flex; gap: 40px; }
        .signature-block { flex: 1; }
        .signature-line { border-bottom: 1px solid #000; margin: 20px 0 3px 0; }
        .signature-label { font-size: 8px; }
        .footer { margin-top: 15px; text-align: center; font-size: 8px; }
        @media print {
          html, body { background: #fff !important; color: #000 !important; }
          body { padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          button, .no-print { display: none !important; }
        }
      </style>
      <script>
        window.addEventListener("load", function () {
          setTimeout(function () {
            window.print();
          }, 150);
        });
      </script>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" class="company-logo" />` : ""}
        <div class="document-title">Warranty Receipt</div>
      </div>
      <div class="company-info">
        ${companyAddressLine ? `${companyAddressLine}<br>` : ""}
        ${companyPhone ? `Tel: ${companyPhone}` : ""}
      </div>
      <div class="section">
        OR Number: ${transaction.or_number || "N/A"}<br>
        Sale ID: ${transaction.transaction_number}<br>
        Date: ${formatDateSafe(transaction.transaction_date)}<br>
        Sales Associate: ${transaction.sales_representative_name || "N/A"}
      </div>
      <div class="section">
        <div class="section-title">Customer</div>
        Name: ${transaction.customer_name || "Walk-in Customer"}<br>
        ${transaction.customer_email ? `Email: ${transaction.customer_email}<br>` : ""}
        Phone Number: ${transaction.customer_phone || "N/A"}
      </div>
      <div class="section">
        <div class="section-title">Products</div>
        <table>
          <thead><tr><th>Product</th><th class="text-right">Qty</th><th class="text-right">Value</th></tr></thead>
          <tbody>
            ${normalizedItems.map((item) => `
              <tr>
                <td>${item.displayLabel}${item.warrantyDescription ? `<br><em style="font-size:8px;color:#555;">${item.warrantyDescription}</em>` : ""}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatPeso(item.value)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <table class="totals-table">
          <tr><td class="label">Total</td><td class="text-right">${formatPeso(transaction.subtotal)}</td></tr>
          <tr><td class="label">Surcharges</td><td class="text-right">${formatPeso(transaction.tax_amount)}</td></tr>
          <tr><td class="label">Discount</td><td class="text-right">-${formatPeso(transactionDiscount)}</td></tr>
          <tr class="grand-total"><td class="label">Grand Total</td><td class="text-right">${formatPeso(transaction.total_amount)}</td></tr>
        </table>
      </div>
      <div class="section">
        <div class="section-title">Payments</div>
        <table>
          <thead><tr><th>Payment Type</th><th class="text-right">Amount</th></tr></thead>
          <tbody>
            ${(transaction.payments_json?.payments || []).map((payment) => `
              <tr><td>${payment.payment_method || "N/A"}</td><td class="text-right">${formatPeso(payment.amount)}</td></tr>
            `).join("")}
            <tr><td><strong>Total Payment</strong></td><td class="text-right"><strong>${formatPeso(transaction.amount_paid)}</strong></td></tr>
            <tr><td><strong>Grand Total</strong></td><td class="text-right"><strong>${formatPeso(transaction.total_amount)}</strong></td></tr>
            <tr><td><strong>Change</strong></td><td class="text-right"><strong>${formatPeso(transaction.change_amount)}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div class="warranty-terms">
        Warranty is only limited to FACTORY DEFECTS, any damages due to mishandling will void the warranty (water damage, dents, heavy scratches, un-authorized alteration of hardware and software). R.A 7394 (The Consumer Act of the Philippines). CHANGE OF MIND does not entitle for a refund, return, and/or exchange. COMPATIBILITY IS USERS RESPONSIBILITY
      </div>
      <div class="signature-section">
        <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Customer Signature (Full name and Signature)</div></div>
        <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Cashier Signature (Full Name and Signature)</div></div>
      </div>
      <div class="footer">
        For Complaints or suggestion please contact us at ${company?.email || "iwarehousesalesph@gmail.com"} or ${company?.phone || "09810569442"}
      </div>
    </body>
    </html>
  `;
}

/**
 * Legacy: Opens warranty receipt in a new tab (popup).
 * Kept for backward compatibility with non-POS callers.
 */
export function printWarrantyReceipt(params) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const html = generateWarrantyReceiptHTML(params);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const receiptUrl = URL.createObjectURL(blob);
  printWindow.location.replace(receiptUrl);
  printWindow.addEventListener("load", () => {
    setTimeout(() => URL.revokeObjectURL(receiptUrl), 60000);
  }, { once: true });
  return true;
}
