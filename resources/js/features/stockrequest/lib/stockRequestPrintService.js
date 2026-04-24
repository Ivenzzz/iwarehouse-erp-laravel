import { format } from "date-fns";
import {
  buildDocumentFooter,
  buildDocumentHeader,
  buildPrintShell,
} from "@/shared/services/printDocumentService";

function formatDate(value, pattern = "MMM dd, yyyy") {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return format(parsed, pattern);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Builds a display name for an item purely from denormalized StockRequest item fields.
 */
function getItemProductName(item) {
  if (item.variant_name) return item.variant_name;
  const brandModel = [item.brand, item.model].filter(Boolean).join(" ");
  return brandModel || "Unknown Product";
}

/**
 * Builds a spec line for an item purely from denormalized StockRequest item fields.
 */
function getItemSpecLine(item) {
  const attrs = item.variant_attributes || {};
  const parts = [
    attrs.RAM || attrs.ram,
    attrs.rom,
    attrs.Color || attrs.color,
    item.condition,
  ].filter(Boolean);
  return parts.join(" | ");
}

export function printStockRequest({ request, companyInfo = {} }) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const approvalData = request?.approval_info || {};
  const requesterName = request.requested_by || "N/A";
  const branchName = request.branch_name || "N/A";
  const approverName = approvalData.approver_name || "N/A";
  const approvalDate = approvalData.approval_date
    ? formatDate(approvalData.approval_date, "MMMM dd, yyyy")
    : "N/A";
  const totalUnits = (request.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const requiredDateValue = request.required_at || request.required_date;

  const printRows = (request.items || [])
    .map((item) => {
      const productName = getItemProductName(item);
      const specs = getItemSpecLine(item);

      return `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(productName)}</div>
            ${specs ? `<div class="item-description">${escapeHtml(specs)}</div>` : ""}
          </td>
          <td class="text-center">${item.quantity || 0}</td>
          <td>${escapeHtml(item.reason || "-")}</td>
        </tr>
      `;
    })
    .join("");

  const safeRequestRef = escapeHtml(request.request_number || "Stock Request");
  const qrValue = request.request_number || String(request.id || "") || "Stock Request";
  const headerHtml = buildDocumentHeader({
    companyInfo,
    docRef: "",
    docRefLabel: "",
    showQrCode: true,
    qrValue,
  });

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
        <div>Generating PDF...</div>
      </div>
    </body>
    </html>`);
  printWindow.document.close();

  setTimeout(() => {
    const hasItems = (request.items || []).length > 0;
    const mainContentHtml = `
      <main class="flex-1">
        ${headerHtml}

        <h1 class="text-center text-slate-600 text-xl font-bold my-1 tracking-wide">STOCK REQUEST</h1>

        <div class="info-grid no-break">
          <div class="info-card">
            <div class="info-card-header">Request Details</div>
            <div class="info-card-body">
              <span class="meta-label">Request Number</span>
              <p class="meta-value meta-value-strong">${escapeHtml(request.request_number || "N/A")}</p>
              <span class="meta-label">Purpose</span>
              <p class="meta-value">${escapeHtml(request.purpose || "N/A")}</p>
              <span class="meta-label">Status</span>
              <p class="meta-value">${escapeHtml(request.status?.replace(/_/g, " ").toUpperCase() || "N/A")}</p>
            </div>
          </div>
          <div class="info-card">
            <div class="info-card-header">Branch & Requester</div>
            <div class="info-card-body">
              <span class="meta-label">Branch / Store</span>
              <p class="meta-value meta-value-strong">${escapeHtml(branchName)}</p>
              <span class="meta-label">Requested By</span>
              <p class="meta-value">${escapeHtml(requesterName)}</p>
              <span class="meta-label">Required Date</span>
              <p class="meta-value">${escapeHtml(formatDate(requiredDateValue, "MMMM dd, yyyy"))}</p>
            </div>
          </div>
          <div class="info-card">
            <div class="info-card-header">Approval</div>
            <div class="info-card-body">
              <span class="meta-label">Approved By</span>
              <p class="meta-value meta-value-strong">${escapeHtml(approverName)}</p>
              <span class="meta-label">Approval Date</span>
              <p class="meta-value">${escapeHtml(approvalDate)}</p>
              <span class="meta-label">Created At</span>
              <p class="meta-value">${escapeHtml(formatDate(request.created_at || request.created_date, "MMMM dd, yyyy"))}</p>
            </div>
          </div>
        </div>

        <div class="items-section mb-6">
          <h3 class="text-lg font-semibold mb-3">Requested Items</h3>
          <div class="no-break">
            <table class="items-table">
              <thead>
                <tr>
                  <th class="text-left">Product / Description</th>
                  <th class="text-center" style="width: 80px;">Qty</th>
                  <th class="text-left" style="width: 220px;">Reason</th>
                </tr>
              </thead>
              <tbody>
                ${hasItems
                  ? printRows
                  : '<tr><td colspan="3" class="text-center text-gray-500 italic">No items found</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="totals-wrap no-break">
          <div class="totals-card">
            <div class="total-row grand-total">
              <span>TOTAL REQUESTED UNITS:</span>
              <span>${totalUnits}</span>
            </div>
          </div>
        </div>

        <div class="bottom-grid no-break">
          <div class="bottom-card">
            <h4 class="bottom-title">Approval Summary</h4>
            <div class="signature-line">
              <span class="signature-label">Requested By:</span>
              <span class="signature-value">${escapeHtml(requesterName)}</span>
            </div>
            <div class="signature-line">
              <span class="signature-label">Approved By:</span>
              <span class="signature-value">${escapeHtml(approverName)}</span>
            </div>
            <div class="signature-line">
              <span class="signature-label">Approval Date:</span>
              <span class="signature-value">${escapeHtml(approvalDate)}</span>
            </div>
          </div>
          <div class="bottom-card">
            <h4 class="bottom-title">Notes</h4>
            <p class="terms-text">${escapeHtml(request.notes || "This stock request is system-generated and reflects the submitted branch requirement, requested quantities, and current approval record in the ERP.")}</p>
          </div>
        </div>
      </main>
    `;

    const htmlContent = buildPrintShell({
      title: safeRequestRef,
      pagesHtml: mainContentHtml,
      footerHtml: buildDocumentFooter({
        companyInfo,
        generatedAt: new Date(),
        footerNote: "",
      }),
      printDelayMs: 250,
      includeQrScript: true,
      extraStyles: `
        * { box-sizing: border-box; }
        main { display: flex; flex-direction: column; min-height: calc(100vh - 34px); margin-bottom: 40px; padding-bottom: 44px; }
        .no-break { page-break-inside: avoid; }
        .info-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
        .info-card { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; background: #ffffff; min-height: 142px; }
        .info-card-header { background: #f7f8fb; color: #264a73; font-size: 10px; font-weight: 700; padding: 10px 12px; }
        .info-card-body { padding: 10px 12px 12px; }
        .meta-label { display: block; font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
        .meta-value { font-size: 11px; line-height: 1.25; margin: 0 0 6px; color: #111827; }
        .meta-value-strong { font-weight: 700; }
        .items-table { width: 100%; padding: 8px 0; border-collapse: collapse; border: 1px solid #ececec; border-left: none; border-right: none; }
        .items-table thead th { background: #fafafa; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; padding: 8px 10px; text-transform: uppercase; }
        .items-table tbody td { border-bottom: 1px solid #ededed; font-size: 10px; padding: 10px; vertical-align: top; }
        .items-table tbody tr:last-child td { border-bottom: none; }
        .item-name { font-weight: 700; margin-bottom: 2px; }
        .item-description { color: #4b5563; font-size: 10px; line-height: 1.28; }
        .text-center { text-align: center; }
        .totals-wrap { display: flex; justify-content: flex-end; margin: 10px 0 22px; }
        .totals-card { width: 244px; }
        .total-row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; font-size: 11px; }
        .total-row .label { color: #6b7280; }
        .grand-total { border-top: 1px solid #d1d5db; margin-top: 6px; padding-top: 8px; font-size: 13px; font-weight: 700; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: auto; }
        .bottom-card { border: 1px solid #e5e7eb; background: #fbfbfc; min-height: 140px; padding: 12px 14px; }
        .bottom-title { margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #111827; }
        .signature-line { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; font-size: 10px; }
        .signature-label { width: 88px; color: #374151; }
        .signature-value { flex: 1; min-height: 14px; border-bottom: 1px solid #d1d5db; padding-bottom: 1px; }
        .terms-text { font-size: 10px; line-height: 1.35; color: #4b5563; margin: 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `,
    });

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, 500);

  return true;
}
