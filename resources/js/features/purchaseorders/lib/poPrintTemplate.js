import { formatDate, formatMoney, getSupplierName } from "./purchaseOrderUtils";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sanitizeCompanyInfo = (companyInfo = {}) => ({
  logo_url: companyInfo?.logo_url || companyInfo?.logo_path || "",
  logo_path: companyInfo?.logo_path || "",
  company_name: escapeHtml(companyInfo?.company_name || "iWarehouse Corp."),
  address: escapeHtml(companyInfo?.address || ""),
  city: escapeHtml(companyInfo?.city || ""),
  country: escapeHtml(companyInfo?.country || ""),
  phone: escapeHtml(companyInfo?.phone || ""),
  tax_id: escapeHtml(companyInfo?.tax_id || ""),
  email: escapeHtml(companyInfo?.email || ""),
  website: escapeHtml(companyInfo?.website || ""),
});

export const buildPOPrintContext = (po, suppliers = [], companyInfo = {}) => {
  const supplier = suppliers.find((item) => item.id === po.supplier_id);
  const items = po.items_json?.items || [];
  const financials = po.financials_json || {};

  const sanitizedCompanyInfo = sanitizeCompanyInfo(companyInfo);

  const supplierName = getSupplierName(supplier);
  const supplierAddress = supplier?.legal_tax_compliance?.registered_address || "";
  const supplierEmail = supplier?.contact_details?.email || "";
  const supplierPhone = supplier?.contact_details?.mobile_landline || "";
  const paymentTerms = financials.payment_terms || "Net 30";
  const approverName = po.approval_json?.approver_name || "";
  const approvalDate = po.approval_json?.approved_date ? formatDate(po.approval_json.approved_date, "MMMM dd, yyyy") : "";
  const deliveryAddress = companyInfo?.address || "Delivery address to be confirmed";
  const deliveryContact = companyInfo?.phone || companyInfo?.email || "Contact person to be assigned";
  const paymentTaxNote = companyInfo?.tax_id ? `Tax ID: ${companyInfo.tax_id}` : "Tax details available upon request";
  const paymentReference = companyInfo?.email || companyInfo?.phone || "Finance team contact on file";
  const termsText =
    "This purchase order is system-generated and remains subject to supplier confirmation, agreed lead times, and ERP approval records.";

  return {
    po,
    items,
    financials,
    supplierName: escapeHtml(supplierName),
    supplierAddress: escapeHtml(supplierAddress),
    supplierEmail: escapeHtml(supplierEmail),
    supplierPhone: escapeHtml(supplierPhone),
    paymentTerms: escapeHtml(paymentTerms),
    approverName: escapeHtml(approverName),
    approvalDate: escapeHtml(approvalDate),
    deliveryAddress: escapeHtml(deliveryAddress),
    deliveryContact: escapeHtml(deliveryContact),
    paymentTaxNote: escapeHtml(paymentTaxNote),
    paymentReference: escapeHtml(paymentReference),
    termsText: escapeHtml(termsText),
    sanitizedCompanyInfo,
  };
};

export const buildPOPrintStyles = () => `
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
  .no-break { page-break-inside: avoid; }
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
  .info-card-body { padding: 10px 12px 12px; }
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
  .meta-value-strong { font-weight: 700; }
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
  .items-table tbody tr:last-child td { border-bottom: none; }
  .item-name { font-weight: 700; margin-bottom: 2px; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .totals-wrap {
    display: flex;
    justify-content: flex-end;
    margin: 10px 0 22px;
  }
  .totals-card { width: 244px; }
  .total-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 2px 0;
    font-size: 11px;
  }
  .total-row .label { color: #6b7280; }
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
  .signature-label { width: 74px; color: #374151; }
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
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page { size: A4; margin: 24px; }
  }
`;

export const buildPOPrintMainContent = (context, headerHtml = "") => {
  const {
    po,
    items,
    financials,
    supplierName,
    supplierAddress,
    supplierEmail,
    supplierPhone,
    paymentTerms,
    approverName,
    approvalDate,
    deliveryAddress,
    deliveryContact,
    paymentTaxNote,
    paymentReference,
    termsText,
  } = context;

  const printRows = items
    .map((item) => {
      const productLine = escapeHtml(item.product_name || "Unknown Item");
      const quantity = escapeHtml(item.quantity || 0);
      const discount = Math.min(100, Math.max(0, Number(item.discount) || 0));
      return `
        <tr>
          <td><div class="item-name">${productLine}</div></td>
          <td class="text-center">${quantity}</td>
          <td class="text-right">${formatMoney(item.unit_price)}</td>
          <td class="text-right">${discount}%</td>
          <td class="text-right">${formatMoney(item.total_price)}</td>
        </tr>
      `;
    })
    .join("");

  const safeExpectedDeliveryDate = escapeHtml(formatDate(po.expected_delivery_date, "MMMM dd, yyyy"));

  return `
    <main class="flex-1">
      ${headerHtml}
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
            <p class="meta-value meta-value-strong">${safeExpectedDeliveryDate}</p>
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
            <tbody>${printRows}</tbody>
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
  `;
};
