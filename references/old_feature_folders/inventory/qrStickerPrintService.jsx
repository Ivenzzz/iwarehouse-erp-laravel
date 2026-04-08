import React from "react";
import QRCode from "qrcode";

// ==========================================
// CONFIGURATION & STYLES
// ==========================================

export const QR_STICKER_CONFIG = {
  width: "46mm",
  height: "40mm",
  previewWidth: "56mm",
  previewHeight: "46mm",
  qrSize: 300,
  qrMargin: 1,
  qrMaxMM: "12mm",
};

const getPrintStyles = () => `
  @page { size: ${QR_STICKER_CONFIG.width} ${QR_STICKER_CONFIG.height}; margin: 0; }
  body { margin: 0; padding: 0; font-family: 'Montserrat', sans-serif; }

  .sticker-item {
    width: ${QR_STICKER_CONFIG.width};
    height: ${QR_STICKER_CONFIG.height};
    max-height: ${QR_STICKER_CONFIG.height};
    padding: 0mm 0.5mm;
    page-break-after: always;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    box-sizing: border-box;
    border: 1px solid #d1d5dc;
    overflow: hidden;
  }

  .sticker-header {
    width: 100%;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #111827;
    flex-shrink: 0;
  }

  .sticker-specs-group {
    width: 100%;
    margin-top: 0.6mm;
    display: flex;
    flex-direction: column;
    gap: 0.3mm;
    flex-shrink: 0;
  }

  .sticker-spec {
    width: 100%;
    font-size: 7px;
    font-weight: 400;
    line-height: 1.25;
    color: #374151;
    flex-shrink: 0;
  }

  .sticker-meta-group {
    width: 100%;
    margin-top: 0.6mm;
    display: flex;
    flex-direction: column;
    gap: 0.25mm;
    flex-shrink: 0;
  }

  .sticker-meta {
    width: 100%;
    font-size: 6px;
    font-weight: 500;
    line-height: 1.2;
    color: #4b5563;
    flex-shrink: 0;
  }

  .sticker-prices {
    width: 100%;
    margin-top: 0.8mm;
    display: flex;
    flex-direction: column;
    gap: 0.15mm;
    flex-shrink: 0;
  }

  .cash-price {
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    color: #111827;
  }

  .srp-price {
    font-size: 8px;
    font-weight: 400;
    line-height: 1.1;
    color: #6b7280;
  }

  .qr-container {
    width: 100%;
    margin-top: auto;
    margin-bottom: 1mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 1px 0 0;
    gap: 0.4mm;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .qr-code {
    width: ${QR_STICKER_CONFIG.qrMaxMM};
    height: ${QR_STICKER_CONFIG.qrMaxMM};
    max-width: ${QR_STICKER_CONFIG.qrMaxMM};
    max-height: ${QR_STICKER_CONFIG.qrMaxMM};
    object-fit: contain;
    display: block;
    margin: 0;
    flex: 0 0 auto;
  }

  .sticker-text {
    width: 100%;
    margin: 0;
    font-size: 9px;
    font-family: monospace;
    font-weight: lighter;
    line-height: 1;
    letter-spacing: 0.1mm;
    text-align: center;
    color: #374151;
  }
`;

// ==========================================
// HELPERS
// ==========================================

const formatCurrency = (amount) => {
  return (amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const buildResolvedHeaderLine = ({ brand, model, headerLine }) =>
  String(headerLine || `${brand} ${model}`.trim()).toUpperCase();

const buildResolvedSpecLines = ({ specLines, specLine, subSpecLine }) =>
  Array.isArray(specLines)
    ? specLines.filter(Boolean)
    : [specLine, subSpecLine].filter(Boolean);

const buildResolvedMetaLines = ({ condition, warrantyLines }) => [
  condition || "Brand New",
  ...(warrantyLines || []).filter(Boolean),
];

export function QRStickerPreview({
  brand,
  model,
  headerLine,
  specLines,
  specLine,
  subSpecLine,
  condition,
  warrantyLines,
  cashPrice,
  srp,
  identifier,
  className = "",
}) {
  const [qrDataUrl, setQrDataUrl] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!identifier) {
      setQrDataUrl(null);
      return;
    }

    QRCode.toDataURL(identifier, {
      width: QR_STICKER_CONFIG.qrSize,
      margin: QR_STICKER_CONFIG.qrMargin,
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [identifier]);

  if (!identifier || !qrDataUrl) return null;

  const resolvedHeaderLine = buildResolvedHeaderLine({ brand, model, headerLine });
  const resolvedSpecLines = buildResolvedSpecLines({ specLines, specLine, subSpecLine });
  const resolvedMetaLines = buildResolvedMetaLines({ condition, warrantyLines });

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[4px] bg-white p-[1.5mm] shadow-[0_10px_24px_rgba(15,23,42,0.18),0_3px_8px_rgba(15,23,42,0.12)] dark:bg-white dark:shadow-[0_12px_28px_rgba(2,6,23,0.5),0_4px_10px_rgba(2,6,23,0.35)] ${className}`.trim()}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        width: QR_STICKER_CONFIG.previewWidth,
        height: QR_STICKER_CONFIG.previewHeight,
        maxHeight: QR_STICKER_CONFIG.previewHeight,
      }}
    >
      <div className="w-full flex-shrink-0 text-[12px] font-bold uppercase leading-[1.05] tracking-[0.02em] text-gray-900 dark:text-gray-900">
        <strong>{resolvedHeaderLine}</strong>
      </div>

      {resolvedSpecLines.length > 0 && (
        <div className="mt-[0.6mm] flex w-full flex-shrink-0 flex-col gap-[0.3mm]">
          {resolvedSpecLines.map((line, index) => (
            <div key={`${line}-${index}`} className="w-full flex-shrink-0 text-[7px] font-normal leading-[1.25] text-gray-700 dark:text-gray-700">
              {line}
            </div>
          ))}
        </div>
      )}

      {resolvedMetaLines.length > 0 && (
        <div className="mt-[0.6mm] flex w-full flex-shrink-0 flex-col gap-[0.25mm]">
          {resolvedMetaLines.map((line, index) => (
            <div key={`${line}-${index}`} className="w-full flex-shrink-0 text-[6px] font-medium leading-[1.2] text-gray-600 dark:text-gray-600">
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="mt-[0.8mm] flex w-full flex-shrink-0 flex-col gap-[0.15mm] text-gray-900 dark:text-gray-900">
        <div className="text-[13px] font-extrabold leading-none">CASH ₱{formatCurrency(cashPrice)}</div>
        <div className="text-[8px] font-normal leading-[1.1] text-gray-500 dark:text-gray-500">SRP ₱{formatCurrency(srp)}</div>
      </div>

      <div className="mb-[1mm] mt-auto flex w-full flex-[0_0_auto] flex-col items-center justify-end gap-[0.4mm] overflow-hidden pt-px">
        <img
          src={qrDataUrl}
          className="block h-[12mm] w-[12mm] max-h-[12mm] max-w-[12mm] object-contain"
          alt="QR Code"
        />
        <div className="m-0 w-full text-center font-mono text-[10px] font-light leading-none tracking-[0.1mm] text-gray-700 dark:text-gray-700">
          {identifier}
        </div>
      </div>
    </div>
  );
}

const stickerItemHTML = ({
  brand,
  model,
  headerLine,
  specLines,
  specLine,
  subSpecLine,
  condition,
  warrantyLines,
  cashPrice,
  srp,
  qrDataUrl,
  displayValue,
}) => {
  const resolvedHeaderLine = buildResolvedHeaderLine({ brand, model, headerLine });
  const resolvedSpecLines = buildResolvedSpecLines({ specLines, specLine, subSpecLine });
  const resolvedMetaLines = buildResolvedMetaLines({ condition, warrantyLines });

  return `
    <div class="sticker-item">
      <div class="sticker-header">
        <strong>${resolvedHeaderLine}</strong>
      </div>

      ${resolvedSpecLines.length
        ? `<div class="sticker-specs-group">${resolvedSpecLines.map((line) => `<div class="sticker-spec">${line}</div>`).join("")}</div>`
        : ""}
      ${resolvedMetaLines.length
        ? `<div class="sticker-meta-group">${resolvedMetaLines.map((line) => `<div class="sticker-meta">${line}</div>`).join("")}</div>`
        : ""}

      <div class="sticker-prices">
        <div class="cash-price">CASH ₱${formatCurrency(cashPrice)}</div>
        <div class="srp-price">SRP ₱${formatCurrency(srp)}</div>
      </div>

      <div class="qr-container">
        <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
        <div class="sticker-text">${displayValue}</div>
      </div>
    </div>
  `;
};

// ==========================================
// MAIN EXPORT
// ==========================================

export const printQRStickers = async ({ items, title = "QR Stickers" }) => {
  if (!items?.length) {
    alert("No items to print QR stickers for.");
    return;
  }

  const validItems = items.filter((item) => item.identifier);
  if (validItems.length === 0) {
    alert("No valid identifiers found in selected items.");
    return;
  }

  const stickerPromises = validItems.map(async (item) => {
    const qrDataUrl = await QRCode.toDataURL(item.identifier, {
      width: QR_STICKER_CONFIG.qrSize,
      margin: QR_STICKER_CONFIG.qrMargin,
      errorCorrectionLevel: "M",
    });

    return {
      brand: item.brand || "",
      model: item.model || "",
      headerLine: item.headerLine || "",
      specLines: Array.isArray(item.specLines) ? item.specLines.filter(Boolean) : undefined,
      specLine: item.specLine || "",
      subSpecLine: item.subSpecLine || "",
      condition: item.condition || "Brand New",
      warrantyLines: item.warrantyLines || [],
      cashPrice: item.cashPrice || 0,
      srp: item.srp || 0,
      qrDataUrl,
      displayValue: item.identifier,
    };
  });

  const resolvedItems = await Promise.all(stickerPromises);
  const itemsHTML = resolvedItems.map(stickerItemHTML).join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print QR stickers.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800&display=swap" rel="stylesheet">
      <style>${getPrintStyles()}</style>
    </head>
    <body>
      ${itemsHTML}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
};
