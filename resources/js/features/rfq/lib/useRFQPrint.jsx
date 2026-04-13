import { format } from "date-fns";
import { getRFQItemDisplay } from "./rfqItemUtils";

export function useRFQPrint({ companyInfo }) {
  const formatSafeDate = (value, formatString) => {
    if (!value) return "N/A";
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? "N/A" : format(parsedDate, formatString);
  };

  const handlePrintRFQ = (rfq) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rfqItems = rfq.items?.items || [];
    const rfqDate = formatSafeDate(rfq.created_at || rfq.created_date, "MMMM dd, yyyy");
    const requiredByDate = formatSafeDate(rfq.required_date, "MMMM dd, yyyy");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Request for Quotation - ${rfq.rfq_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20mm; background: white; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #333; }
          .company-info { display: flex; gap: 15px; align-items: start; }
          .logo { width: 80px; height: 80px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; border-radius: 8px; overflow: hidden; }
          .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .company-details { font-size: 11px; line-height: 1.4; }
          .company-details h2 { font-size: 16px; margin-bottom: 8px; }
          .doc-number { text-align: right; }
          .doc-number h3 { font-size: 22px; font-weight: bold; }
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
          .footer { text-align: center; font-size: 9px; color: #666; padding-top: 15px; border-top: 1px solid #ddd; margin-top: 20px; }
          @media print { body { padding: 0; } @page { size: A4; margin: 20mm; } .no-break { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${companyInfo?.logo_url ? `<div class="logo"><img src="${companyInfo.logo_url}" alt="Company Logo" /></div>` : ""}
            <div class="company-details">
              <h2>${companyInfo?.company_name || "iWarehouse Corp."}</h2>
              ${companyInfo?.address ? `<p>${companyInfo.address}</p>` : ""}
              ${companyInfo?.city ? `<p>${companyInfo.city}, ${companyInfo.country || "Philippines"}</p>` : ""}
              ${companyInfo?.phone ? `<p>Tel: ${companyInfo.phone}</p>` : ""}
              ${companyInfo?.tax_id ? `<p>Tax ID: ${companyInfo.tax_id}</p>` : ""}
              ${companyInfo?.email ? `<p>Email: ${companyInfo.email}</p>` : ""}
              ${companyInfo?.website ? `<p>Website: ${companyInfo.website}</p>` : ""}
            </div>
          </div>
          <div class="doc-number">
            <h3>${rfq.rfq_number}</h3>
          </div>
        </div>
        <h1>REQUEST FOR QUOTATION</h1>
        <div class="info-section no-break">
          <div class="info-box">
            <h3>Document Information</h3>
            <div class="info-row"><label>RFQ Date:</label><span>${rfqDate}</span></div>
            <div class="info-row"><label>Required By:</label><span>${requiredByDate}</span></div>
            <div class="info-row"><label>Requested By:</label><span>${rfq.requested_by_name || "N/A"}</span></div>
            <div class="info-row"><label>Store:</label><span>${rfq.requested_store || "N/A"}</span></div>
          </div>
        </div>
        <div class="items-section">
          <h3>REQUESTED ITEMS</h3>
          <table>
            <thead><tr><th style="width: 40px;">#</th><th>Product / Description</th><th style="width: 100px; text-align: center;">Quantity</th></tr></thead>
            <tbody>
              ${rfqItems.map((item, idx) => {
                const { primaryLabel, secondaryLabel } = getRFQItemDisplay(item);
                const variantLabel = [primaryLabel, secondaryLabel].filter(Boolean).join(" - ") || "N/A";
                return `<tr><td>${idx + 1}</td><td><div class="product-name">${variantLabel}</div></td><td style="text-align: center; font-weight: bold;">${item.quantity}</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        <div class="signatures no-break">
          <div class="signature-box"><div class="signature-line"><h4>Requested By</h4><p>_________________</p></div></div>
          <div class="signature-box"><div class="signature-line"><h4>Approved By</h4><p>_________________</p></div></div>
        </div>
        <div class="footer">
          <p>This is a computer-generated document. Generated on ${format(new Date(), "MMMM dd, yyyy HH:mm:ss")}</p>
          <p style="margin-top: 4px;">For any inquiries, please contact: ${companyInfo?.email || "N/A"} | ${companyInfo?.phone || "N/A"}</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return { handlePrintRFQ };
}