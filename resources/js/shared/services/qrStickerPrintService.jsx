import React from "react";
import QRCode from "qrcode";

export const QR_STICKER_CONFIG = {
  width: "46mm",
  height: "40mm",
  previewWidth: "56mm",
  previewHeight: "46mm",
  qrSize: 300,
  qrMargin: 1,
  qrMaxMM: "12mm",
  pageMargin: "0",
  itemPaddingY: "0mm",
  itemPaddingX: "0.5mm",
  borderColor: "#d1d5dc",
  fontFamily: "'Montserrat', sans-serif",
  specGroupMarginTop: "0mm",
  specGap: "0.3mm",
  qrBottomMargin: "1mm",
  textFit: {
    stepPx: 0.25,
    maxIterations: 60,
    sizes: {
      header: { max: 10, min: 7 },
      spec: { max: 7, min: 5 },
      meta: { max: 6, min: 5 },
      cash: { max: 9, min: 7 },
      srp: { max: 8, min: 6 },
      identifier: { max: 9, min: 6 },
    },
  },
};

export const getQRStickerPrintStyles = () => ` 
  @page { size: ${QR_STICKER_CONFIG.width} ${QR_STICKER_CONFIG.height}; margin: ${QR_STICKER_CONFIG.pageMargin}; }
  body { margin: 0; padding: 0; font-family: ${QR_STICKER_CONFIG.fontFamily}; }
  .sticker-item { width: ${QR_STICKER_CONFIG.width}; height: ${QR_STICKER_CONFIG.height}; max-height: ${QR_STICKER_CONFIG.height}; padding: ${QR_STICKER_CONFIG.itemPaddingY} ${QR_STICKER_CONFIG.itemPaddingX}; page-break-after: always; page-break-inside: avoid; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; box-sizing: border-box; border: 1px solid ${QR_STICKER_CONFIG.borderColor}; overflow: hidden; }
  .sticker-header { width: 100%; font-size: ${QR_STICKER_CONFIG.textFit.sizes.header.max}px; font-weight: 700; line-height: 1.05; letter-spacing: 0.02em; text-transform: uppercase; color: #111827; flex-shrink: 0; }
  .sticker-specs-group { width: 100%; margin-top: ${QR_STICKER_CONFIG.specGroupMarginTop}; display: flex; flex-direction: column; gap: ${QR_STICKER_CONFIG.specGap}; flex-shrink: 0; }
  .sticker-spec { width: 100%; font-size: ${QR_STICKER_CONFIG.textFit.sizes.spec.max}px; font-weight: 400; line-height: 1.25; color: #374151; flex-shrink: 0; }
  .sticker-meta-group { width: 100%; margin-top: ${QR_STICKER_CONFIG.specGroupMarginTop}; display: flex; flex-direction: column; gap: 0.25mm; flex-shrink: 0; }
  .sticker-meta { width: 100%; font-size: ${QR_STICKER_CONFIG.textFit.sizes.meta.max}px; font-weight: 500; line-height: 1.2; color: #4b5563; flex-shrink: 0; }
  .sticker-prices { width: 100%; margin-top: 0mm; display: flex; flex-direction: column; gap: 0.15mm; flex-shrink: 0; }
  .cash-price { font-size: ${QR_STICKER_CONFIG.textFit.sizes.cash.max}px; font-weight: 800; line-height: 1; color: #111827; }
  .srp-price { font-size: ${QR_STICKER_CONFIG.textFit.sizes.srp.max}px; font-weight: 400; line-height: 1.1; color: #6b7280; }
  .qr-container { width: 100%; margin-top: auto; margin-bottom: ${QR_STICKER_CONFIG.qrBottomMargin}; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 1px 0 0; gap: 0.4mm; overflow: hidden; flex: 0 0 auto; }
  .qr-code { width: ${QR_STICKER_CONFIG.qrMaxMM}; height: ${QR_STICKER_CONFIG.qrMaxMM}; max-width: ${QR_STICKER_CONFIG.qrMaxMM}; max-height: ${QR_STICKER_CONFIG.qrMaxMM}; object-fit: contain; display: block; margin: 0; flex: 0 0 auto; }
  .sticker-text { width: 100%; margin: 0; font-size: ${QR_STICKER_CONFIG.textFit.sizes.identifier.max}px; font-family: monospace; font-weight: lighter; line-height: 1; letter-spacing: 0.1mm; text-align: center; color: #374151; }
`;

const formatCurrency = (amount) =>
  (amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const buildResolvedHeaderLine = ({ brand, model, headerLine }) =>
  String(headerLine || `${brand} ${model}`.trim()).toUpperCase();

const buildResolvedSpecLines = ({ specLines, specLine, subSpecLine }) =>
  Array.isArray(specLines) ? specLines.filter(Boolean) : [specLine, subSpecLine].filter(Boolean);

const buildResolvedMetaLines = ({ condition, warrantyLines }) => [
  condition || "Brand New",
  ...(warrantyLines || []).filter(Boolean),
];

const TEXT_ROLE_SELECTORS = {
  header: ".sticker-header",
  spec: ".sticker-spec",
  meta: ".sticker-meta",
  cash: ".cash-price",
  srp: ".srp-price",
  identifier: ".sticker-text",
};

const getTextFitDefaults = () => {
  const sizes = QR_STICKER_CONFIG.textFit.sizes;
  return {
    header: sizes.header.max,
    spec: sizes.spec.max,
    meta: sizes.meta.max,
    cash: sizes.cash.max,
    srp: sizes.srp.max,
    identifier: sizes.identifier.max,
  };
};

const applyTextSizesToSticker = (container, sizes) => {
  Object.entries(TEXT_ROLE_SELECTORS).forEach(([role, selector]) => {
    container.querySelectorAll(selector).forEach((node) => {
      node.style.fontSize = `${sizes[role]}px`;
    });
  });
};

const fitStickerText = (container) => {
  if (!container) return;

  const config = QR_STICKER_CONFIG.textFit;
  const sizes = getTextFitDefaults();
  const min = Object.fromEntries(
    Object.entries(config.sizes).map(([role, value]) => [role, value.min]),
  );

  applyTextSizesToSticker(container, sizes);

  let iterations = 0;
  while (
    container.scrollHeight > container.clientHeight &&
    iterations < config.maxIterations
  ) {
    let changed = false;

    Object.keys(sizes).forEach((role) => {
      const next = Math.max(min[role], sizes[role] - config.stepPx);
      if (next !== sizes[role]) {
        sizes[role] = next;
        changed = true;
      }
    });

    if (!changed) break;
    applyTextSizesToSticker(container, sizes);
    iterations += 1;
  }
};

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
  const stickerRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!identifier) {
      setQrDataUrl(null);
      return undefined;
    }

    QRCode.toDataURL(identifier, {
      width: QR_STICKER_CONFIG.qrSize,
      margin: QR_STICKER_CONFIG.qrMargin,
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (!cancelled) {
        setQrDataUrl(dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [identifier]);

  const resolvedHeaderLine = buildResolvedHeaderLine({ brand, model, headerLine });
  const resolvedSpecLines = buildResolvedSpecLines({ specLines, specLine, subSpecLine });
  const resolvedMetaLines = buildResolvedMetaLines({ condition, warrantyLines });

  React.useEffect(() => {
    if (!identifier || !qrDataUrl) return;
    fitStickerText(stickerRef.current);
  }, [
    identifier,
    qrDataUrl,
    resolvedHeaderLine,
    resolvedSpecLines.join("|"),
    resolvedMetaLines.join("|"),
    cashPrice,
    srp,
    identifier,
  ]);

  if (!identifier || !qrDataUrl) return null;

  return (
    <div
      ref={stickerRef}
      className={`flex flex-col overflow-hidden rounded-[4px] bg-white p-[1.5mm] shadow-[0_10px_24px_rgba(15,23,42,0.18),0_3px_8px_rgba(15,23,42,0.12)] ${className}`.trim()}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        width: QR_STICKER_CONFIG.previewWidth,
        height: QR_STICKER_CONFIG.previewHeight,
        maxHeight: QR_STICKER_CONFIG.previewHeight,
      }}
    >
      <div
        className="sticker-header w-full flex-shrink-0 font-bold uppercase leading-[1.05] tracking-[0.02em] text-gray-900"
        style={{ fontSize: `${QR_STICKER_CONFIG.textFit.sizes.header.max}px` }}
      >
        <strong>{resolvedHeaderLine}</strong>
      </div>

      {resolvedSpecLines.length > 0 && (
        <div className="mt-[0.6mm] flex w-full flex-shrink-0 flex-col gap-[0.3mm]">
          {resolvedSpecLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              className="sticker-spec w-full flex-shrink-0 font-normal leading-[1.25] text-gray-700"
              style={{ fontSize: `${QR_STICKER_CONFIG.textFit.sizes.spec.max}px` }}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {resolvedMetaLines.length > 0 && (
        <div className="mt-[0.6mm] flex w-full flex-shrink-0 flex-col gap-[0.25mm]">
          {resolvedMetaLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              className="sticker-meta w-full flex-shrink-0 font-medium leading-[1.2] text-gray-600"
              style={{ fontSize: `${QR_STICKER_CONFIG.textFit.sizes.meta.max}px` }}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="mt-[0.8mm] flex w-full flex-shrink-0 flex-col gap-[0.15mm] text-gray-900">
        <div
          className="cash-price font-extrabold leading-none"
          style={{ fontSize: `${QR_STICKER_CONFIG.textFit.sizes.cash.max}px` }}
        >
          CASH P{formatCurrency(cashPrice)}
        </div>
        <div
          className="srp-price font-normal leading-[1.1] text-gray-500"
          style={{ fontSize: `${QR_STICKER_CONFIG.textFit.sizes.srp.max}px` }}
        >
          SRP P{formatCurrency(srp)}
        </div>
      </div>

      <div className="mb-[1mm] mt-auto flex w-full flex-[0_0_auto] flex-col items-center justify-end gap-[0.4mm] overflow-hidden pt-px">
        <img src={qrDataUrl} className="block h-[12mm] w-[12mm] max-h-[12mm] max-w-[12mm] object-contain" alt="QR Code" />
        <div
          className="sticker-text m-0 w-full text-center font-mono font-light leading-none tracking-[0.1mm] text-gray-700"
          style={{ fontSize: `${QR_STICKER_CONFIG.textFit.sizes.identifier.max}px` }}
        >
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
      <div class="sticker-header"><strong>${resolvedHeaderLine}</strong></div>
      ${resolvedSpecLines.length ? `<div class="sticker-specs-group">${resolvedSpecLines.map((line) => `<div class="sticker-spec">${line}</div>`).join("")}</div>` : ""}
      ${resolvedMetaLines.length ? `<div class="sticker-meta-group">${resolvedMetaLines.map((line) => `<div class="sticker-meta">${line}</div>`).join("")}</div>` : ""}
      <div class="sticker-prices">
        <div class="cash-price">CASH P${formatCurrency(cashPrice)}</div>
        <div class="srp-price">SRP P${formatCurrency(srp)}</div>
      </div>
      <div class="qr-container">
        <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
        <div class="sticker-text">${displayValue}</div>
      </div>
    </div>
  `;
};

export const printQRStickers = async ({ items, title = "QR Stickers" }) => {
  if (!items?.length) {
    window.alert("No items to print QR stickers for.");
    return;
  }

  const validItems = items.filter((item) => item.identifier);
  if (validItems.length === 0) {
    window.alert("No valid identifiers found in selected items.");
    return;
  }

  const resolvedItems = await Promise.all(
    validItems.map(async (item) => ({
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
      qrDataUrl: await QRCode.toDataURL(item.identifier, {
        width: QR_STICKER_CONFIG.qrSize,
        margin: QR_STICKER_CONFIG.qrMargin,
        errorCorrectionLevel: "M",
      }),
      displayValue: item.identifier,
    })),
  );

  const itemsHTML = resolvedItems.map(stickerItemHTML).join("");
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    window.alert("Please allow pop-ups to print QR stickers.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800&display=swap" rel="stylesheet">
      <style>${getQRStickerPrintStyles()}</style>
    </head>
    <body>
      ${itemsHTML}
      <script>
        (function() {
          var TEXT_ROLE_SELECTORS = {
            header: ".sticker-header",
            spec: ".sticker-spec",
            meta: ".sticker-meta",
            cash: ".cash-price",
            srp: ".srp-price",
            identifier: ".sticker-text",
          };

          var TEXT_FIT = {
            stepPx: ${QR_STICKER_CONFIG.textFit.stepPx},
            maxIterations: ${QR_STICKER_CONFIG.textFit.maxIterations},
            sizes: {
              header: { max: ${QR_STICKER_CONFIG.textFit.sizes.header.max}, min: ${QR_STICKER_CONFIG.textFit.sizes.header.min} },
              spec: { max: ${QR_STICKER_CONFIG.textFit.sizes.spec.max}, min: ${QR_STICKER_CONFIG.textFit.sizes.spec.min} },
              meta: { max: ${QR_STICKER_CONFIG.textFit.sizes.meta.max}, min: ${QR_STICKER_CONFIG.textFit.sizes.meta.min} },
              cash: { max: ${QR_STICKER_CONFIG.textFit.sizes.cash.max}, min: ${QR_STICKER_CONFIG.textFit.sizes.cash.min} },
              srp: { max: ${QR_STICKER_CONFIG.textFit.sizes.srp.max}, min: ${QR_STICKER_CONFIG.textFit.sizes.srp.min} },
              identifier: { max: ${QR_STICKER_CONFIG.textFit.sizes.identifier.max}, min: ${QR_STICKER_CONFIG.textFit.sizes.identifier.min} }
            }
          };

          function applySizes(container, sizes) {
            Object.keys(TEXT_ROLE_SELECTORS).forEach(function(role) {
              var nodes = container.querySelectorAll(TEXT_ROLE_SELECTORS[role]);
              nodes.forEach(function(node) {
                node.style.fontSize = sizes[role] + "px";
              });
            });
          }

          function fitStickerText(container) {
            var sizes = {
              header: TEXT_FIT.sizes.header.max,
              spec: TEXT_FIT.sizes.spec.max,
              meta: TEXT_FIT.sizes.meta.max,
              cash: TEXT_FIT.sizes.cash.max,
              srp: TEXT_FIT.sizes.srp.max,
              identifier: TEXT_FIT.sizes.identifier.max
            };
            var mins = {
              header: TEXT_FIT.sizes.header.min,
              spec: TEXT_FIT.sizes.spec.min,
              meta: TEXT_FIT.sizes.meta.min,
              cash: TEXT_FIT.sizes.cash.min,
              srp: TEXT_FIT.sizes.srp.min,
              identifier: TEXT_FIT.sizes.identifier.min
            };

            applySizes(container, sizes);
            var iterations = 0;
            while (container.scrollHeight > container.clientHeight && iterations < TEXT_FIT.maxIterations) {
              var changed = false;
              Object.keys(sizes).forEach(function(role) {
                var next = Math.max(mins[role], sizes[role] - TEXT_FIT.stepPx);
                if (next !== sizes[role]) {
                  sizes[role] = next;
                  changed = true;
                }
              });
              if (!changed) break;
              applySizes(container, sizes);
              iterations += 1;
            }
          }

          window.__fitQRStickers = function() {
            document.querySelectorAll(".sticker-item").forEach(function(item) {
              fitStickerText(item);
            });
          };
        })();

        window.onload = function() {
          setTimeout(function() {
            if (window.__fitQRStickers) {
              window.__fitQRStickers();
            }
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
};
