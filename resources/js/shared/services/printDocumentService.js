import { format } from "date-fns";

const decodeHtmlEntities = (value) =>
  String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

export const normalizeLogoUrl = (logoUrl) => {
  if (!logoUrl || typeof logoUrl !== "string") return "";
  const trimmed = decodeHtmlEntities(logoUrl).trim().replaceAll("\\", "/");
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.hostname !== window.location.hostname &&
        parsed.pathname &&
        parsed.pathname.startsWith("/storage/")
      ) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`;
      }
      return parsed.href;
    } catch {
      return trimmed;
    }
  }
  if (trimmed.startsWith("//")) return `${window.location.protocol}${trimmed}`;
  if (trimmed.startsWith("/")) return `${window.location.origin}${trimmed}`;
  if (trimmed.startsWith("company-logos/")) return `${window.location.origin}/storage/${trimmed}`;
  if (trimmed.startsWith("storage/")) return `${window.location.origin}/${trimmed}`;
  return `${window.location.origin}/${trimmed.replace(/^\.?\//, "")}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildCompanyLines = (companyInfo = {}) =>
  [
    companyInfo?.address ? `${companyInfo.address}` : "",
    [companyInfo?.city, companyInfo?.country].filter(Boolean).join(", "),
    companyInfo?.phone ? `Tel: ${companyInfo.phone}` : "",
    companyInfo?.tax_id ? `Tax ID: ${companyInfo.tax_id}` : "",
    companyInfo?.email ? `Email: ${companyInfo.email}` : "",
    companyInfo?.website ? `Website: ${companyInfo.website}` : "",
  ].filter(Boolean);

export const getReceiveQrUrl = (transferId) =>
  `${window.location.origin}${window.location.pathname}?action=receive&id=${transferId}`;

export const buildDocumentHeader = ({
  companyInfo = {},
  docRef = "",
  docRefLabel = "",
  showQrCode = false,
  qrValue = "",
}) => {
  const resolvedCompanyName = companyInfo?.company_name || "iWarehouse Corp.";
  const resolvedLogoUrl = normalizeLogoUrl(companyInfo?.logo_url || companyInfo?.logo_path);
  const rawLogoUrl = decodeHtmlEntities(companyInfo?.logo_url || "");
  const rawLogoPath = decodeHtmlEntities(companyInfo?.logo_path || "");
  const logoCandidates = [
    resolvedLogoUrl,
    rawLogoUrl,
    rawLogoPath,
    normalizeLogoUrl(rawLogoUrl),
    normalizeLogoUrl(rawLogoPath),
  ].filter(Boolean);
  const uniqueLogoCandidates = [...new Set(logoCandidates)];
  const safeLogoFallbackList = escapeHtml(JSON.stringify(uniqueLogoCandidates));
  const companyLines = buildCompanyLines(companyInfo);
  const safeQrValue = escapeHtml(qrValue || "");

  const rightBlock = showQrCode
    ? `
      <div class="text-right shrink-0">
        ${docRefLabel ? `<p class="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">${docRefLabel}</p>` : ""}
        ${docRef ? `<h3 class="text-[28px] leading-none font-extrabold text-slate-900 mb-2">${docRef}</h3>` : ""}
        <div class="flex justify-end">
          <div class="qr-box flex items-center justify-center border border-slate-300 rounded bg-white p-1">
            <div class="qr-placeholder" data-text="${safeQrValue}"></div>
          </div>
        </div>
      </div>
    `
    : `
      <div class="text-right shrink-0">
        ${docRefLabel ? `<p class="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">${docRefLabel}</p>` : ""}
        <h3 class="text-[28px] leading-none font-extrabold text-slate-900">${docRef}</h3>
      </div>
    `;

  return `
    <div class="flex justify-between items-start border-b-2 border-slate-700 pb-4 mb-6 document-header">
      <div class="flex gap-3 items-start">
        <div class="w-24 h-24 rounded-none overflow-hidden border border-gray-300 bg-black text-white flex items-center justify-center logo-box">
          ${resolvedLogoUrl
            ? `<img src="${escapeHtml(resolvedLogoUrl)}" alt="Company Logo" class="w-full h-full object-contain bg-white" data-logo-candidates="${safeLogoFallbackList}" data-logo-index="0" onerror="try{var list=JSON.parse(this.dataset.logoCandidates||'[]'); var i=Number(this.dataset.logoIndex||0)+1; if(list[i]){ this.dataset.logoIndex=String(i); this.src=list[i]; return; }}catch(e){} this.style.display='none'; this.parentElement.classList.add('show-fallback');" />`
            : ""
          }
          <div class="logo-fallback ${resolvedLogoUrl ? "" : "show"}">
            <span class="logo-fallback-main">iWarehouse</span>
          </div>
        </div>
        <div class="text-[11px] leading-snug text-slate-700">
          <h2 class="text-[22px] font-bold text-slate-900 mb-1 leading-none">${resolvedCompanyName}</h2>
          ${companyLines.map((line) => `<p>${line}</p>`).join("")}
        </div>
      </div>
      ${rightBlock}
    </div>
  `;
};

export const buildDocumentFooter = ({ companyInfo = {}, generatedAt = new Date(), footerNote = "" }) => `
  <footer class="print-footer text-center text-[10px] text-gray-500 border-t border-gray-300 pt-3 mt-8 bg-white">
    <p>${footerNote || `This is a computer-generated document. Generated on ${format(generatedAt, "MMMM dd, yyyy hh:mm:ss a").toUpperCase()}`}</p>
    <p class="mt-1">For inquiries: ${companyInfo?.email || "N/A"} | ${companyInfo?.phone || "N/A"}</p>
  </footer>
`;

export const buildPrintShell = ({
  title,
  pagesHtml,
  footerHtml = "",
  printDelayMs = 500,
  includeTailwind = true,
  extraHeadHtml = "",
  extraStyles = "",
  includeQrScript = false,
}) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${includeTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ""}
    ${includeQrScript ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>' : ""}
    ${extraHeadHtml}
    <style>
      @layer utilities {
        @media print {
          @page { size: A4; margin: 6mm; }
          .print-footer { position: fixed; bottom: 0; left: 0; right: 0; }
          main { margin-bottom: 50px; }
          .no-break { page-break-inside: avoid; }
          .break-after-page { page-break-after: always; }
        }
      }
      body { font-family: 'Times New Roman', serif; }
      .logo-box { position: relative; }
      .logo-fallback {
        display: none;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-align: center;
        padding: 4px;
        line-height: 1.1;
      }
      .logo-fallback.show { display: flex; }
      .logo-box.show-fallback .logo-fallback { display: flex; position: absolute; inset: 0; }
      .logo-box.show-fallback img { display: none; }
      .qr-box { width: 98px; height: 98px; }
      ${extraStyles}
    </style>
  </head>
  <body class="bg-white text-gray-800 p-[5mm] flex flex-col min-h-screen">
    ${pagesHtml}
    ${footerHtml}
    <script>
      window.onload = function() {
        ${includeQrScript ? `
          document.querySelectorAll('.qr-placeholder').forEach(function(el) {
            var text = el.getAttribute('data-text');
            if (!text || typeof QRCode === 'undefined') return;
            new QRCode(el, {
              text: text,
              width: 90,
              height: 90,
              colorDark: "#0f172a",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.M
            });
          });
        ` : ""}
        setTimeout(function() { window.print(); }, ${printDelayMs});
      };
    </script>
  </body>
  </html>
`;
