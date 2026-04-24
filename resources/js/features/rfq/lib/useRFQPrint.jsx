import { format } from "date-fns";
import {
  buildDocumentFooter,
  buildDocumentHeader,
  buildPrintShell,
} from "@/shared/services/printDocumentService";
import { getRFQItemDisplay } from "./rfqItemUtils";

export function useRFQPrint({ companyInfo }) {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatSafeDate = (value, formatString) => {
    if (!value) return "N/A";
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? "N/A" : format(parsedDate, formatString);
  };

  const handlePrintRFQ = (rfq) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return false;

    const rfqItems = rfq.items?.items || [];
    const rfqDate = formatSafeDate(rfq.created_at || rfq.created_date, "MMMM dd, yyyy");
    const requiredByDate = formatSafeDate(rfq.required_date, "MMMM dd, yyyy");

    const sanitizedCompanyInfo = {
      logo_url: companyInfo?.logo_url || "",
      company_name: escapeHtml(companyInfo?.company_name || "iWarehouse Corp."),
      address: escapeHtml(companyInfo?.address || ""),
      city: escapeHtml(companyInfo?.city || ""),
      country: escapeHtml(companyInfo?.country || ""),
      phone: escapeHtml(companyInfo?.phone || ""),
      tax_id: escapeHtml(companyInfo?.tax_id || ""),
      email: escapeHtml(companyInfo?.email || ""),
      website: escapeHtml(companyInfo?.website || ""),
    };

    const safeRfqNumber = escapeHtml(rfq?.rfq_number || "N/A");
    const safeRequestedBy = escapeHtml(rfq?.requested_by_name || "N/A");
    const safeRequestedStore = escapeHtml(rfq?.requested_store || "N/A");

    const printRows = rfqItems
      .map((item, idx) => {
        const { primaryLabel, secondaryLabel } = getRFQItemDisplay(item);
        const variantLabel = [primaryLabel, secondaryLabel].filter(Boolean).join(" - ") || "N/A";
        return `
          <tr>
            <td>${idx + 1}</td>
            <td><div class="product-name">${escapeHtml(variantLabel)}</div></td>
            <td style="text-align: center; font-weight: bold;">${escapeHtml(item.quantity)}</td>
          </tr>
        `;
      })
      .join("");

    const tableBody = printRows || `
      <tr>
        <td colspan="3" style="text-align: center; color: #666; font-style: italic;">No items found</td>
      </tr>
    `;

    const headerHtml = buildDocumentHeader({
      companyInfo: sanitizedCompanyInfo,
      docRef: "",
      docRefLabel: "",
      showQrCode: true,
      qrValue: rfq?.rfq_number || String(rfq?.id || "") || "RFQ",
    });

    const mainContentHtml = `
      <main class="rfq-main">
        ${headerHtml}
        <h1>REQUEST FOR QUOTATION</h1>
        <div class="info-section no-break">
          <div class="info-box">
            <h3>Document Information</h3>
            <div class="info-row"><label>RFQ Date:</label><span>${escapeHtml(rfqDate)}</span></div>
            <div class="info-row"><label>Required By:</label><span>${escapeHtml(requiredByDate)}</span></div>
            <div class="info-row"><label>Requested By:</label><span>${safeRequestedBy}</span></div>
            <div class="info-row"><label>Store:</label><span>${safeRequestedStore}</span></div>
          </div>
        </div>
        <div class="items-section">
          <h3>REQUESTED ITEMS</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Product / Description</th>
                <th style="width: 100px; text-align: center;">Quantity</th>
              </tr>
            </thead>
            <tbody>${tableBody}</tbody>
          </table>
        </div>
        <div class="signatures no-break">
          <div class="signature-box"><div class="signature-line"><h4>Requested By</h4><p>_________________</p></div></div>
          <div class="signature-box"><div class="signature-line"><h4>Approved By</h4><p>_________________</p></div></div>
        </div>
      </main>
    `;

    const htmlContent = buildPrintShell({
      title: `Request for Quotation - ${safeRfqNumber}`,
      pagesHtml: mainContentHtml,
      footerHtml: buildDocumentFooter({
        companyInfo: sanitizedCompanyInfo,
        generatedAt: new Date(),
      }),
      printDelayMs: 250,
      includeQrScript: true,
      extraStyles: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .rfq-main { font-family: Arial, sans-serif; background: white; color: #333; }
        .document-header { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #333; }
        h1 { text-align: center; color: #2563eb; font-size: 28px; margin: 15px 0; }
        .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; }
        .info-box h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 10px; font-weight: bold; }
        .info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; }
        .info-row label { color: #666; font-weight: bold; }
        .info-row span { color: #333; }
        .items-section h3 { font-size: 16px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
        th { background: #f0f0f0; color: #333; padding: 10px; text-align: left; font-size: 11px; font-weight: bold; border: 1px solid #ddd; }
        td { padding: 10px; border: 1px solid #ddd; font-size: 11px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .product-name { font-weight: bold; }
        .signatures { display: flex; justify-content: center; margin: 40px 0 20px; }
        .signature-box { text-align: center; width: 300px; margin: 0 20px; }
        .signature-line { border-top: 1px solid #aaa; padding-top: 8px; margin-top: 40px; }
        .signature-box h4 { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
        .print-footer { text-align: center; font-size: 9px; color: #666; padding-top: 15px; border-top: 1px solid #ddd; margin-top: 20px; }
        @media print { @page { size: A4; margin: 8mm; } .no-break { page-break-inside: avoid; } }
      `,
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return true;
  };

  return { handlePrintRFQ };
}
