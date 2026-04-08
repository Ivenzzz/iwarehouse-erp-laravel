import { printQRStickers } from '@/components/shared/services/qrStickerPrintService';

// ==========================================
// CONFIGURATION & STYLES (for barcode printing only)
// ==========================================

const PRINT_CONFIG = {
  width: '46mm',
  height: '40mm',
};

const getPrintStyles = () => `
  @page { size: ${PRINT_CONFIG.width} ${PRINT_CONFIG.height}; margin: 0; }
  body { margin: 0; padding: 0; font-family: 'Noto Serif', sans-serif; }
  
  .barcode-item {
    width: ${PRINT_CONFIG.width};
    height: ${PRINT_CONFIG.height};
    padding: 0mm 0.5mm;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    box-sizing: border-box;
    border: 1px solid #d1d5dc;
  }

  .barcode-header { 
    font-size: 9px; 
    font-weight: bold; 
    text-align: left; 
    width: 100%;
    white-space: normal;
    line-height: 1.1;
    margin-top: 0;
  }
  
  .barcode-specs { 
    font-size: 7px; 
    text-align: left; 
    width: 100%;
  }
  
  .barcode-prices { 
    display: flex; 
    flex-direction: column; 
    justify-content: space-between; 
    width: 100%; 
    font-size: 8px; 
    font-weight: bold; 
  }

  .cash-price { font-weight: bold; }
  .srp-price { font-weight: normal; }

  .barcode { 
    width: 42mm; 
    height: 13mm; 
    margin-top: auto; 
    margin-left: auto;
    display: block; 
  }
  
  .barcode-text { 
    font-size: 6px; 
    text-align: center; 
    width: 100%; 
    font-family: monospace;
    line-height: 1;
    margin: 0;
    letter-spacing: 0.1mm;
    font-weight: lighter;
  }
`;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const formatCurrency = (amount) => {
  return (amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getSpecsText = (pm, category, variantAttrs, inventoryItem) => {
  const modelName = String(pm?.model || "").toLowerCase();
  const catName = String(category?.name || "").toLowerCase();
  const isIphone = modelName.includes("iphone") || catName.includes("iphone");

  const ram = variantAttrs.ram || variantAttrs.RAM || "";
  const storage = variantAttrs.storage || variantAttrs.Storage || variantAttrs.rom || variantAttrs.ROM || "";
  const color = variantAttrs.color || variantAttrs.Color || "";
  
  let mainSpecs = "";

  if (isIphone) {
    mainSpecs = [storage, color].filter(Boolean).join(" ");
  } else {
    let specsBase = "";
    if (ram && storage) specsBase = `${ram}/${storage}`;
    else specsBase = storage || ram;
    mainSpecs = [specsBase, color].filter(Boolean).join(" ");
  }

  const fixed = pm?.fixed_specifications || {};
  const cpu = inventoryItem?.cpu || variantAttrs.cpu || variantAttrs.CPU || variantAttrs.processor || variantAttrs.Processor || fixed.platform_cpu || fixed.cpu || "";
  const gpu = inventoryItem?.gpu || variantAttrs.gpu || variantAttrs.GPU || variantAttrs.graphics || variantAttrs.Graphics || fixed.platform_gpu || fixed.gpu || "";
  
  let subSpecs = "";
  if (cpu && gpu) subSpecs = `${cpu} | ${gpu}`;
  else if (cpu || gpu) subSpecs = cpu || gpu;

  return { mainSpecs, subSpecs };
};

/**
 * Maps raw inventory items into the global sticker item format.
 */
const mapInventoryToStickerItems = (items, { variants, productMasters, brands, categories }) => {
  return items.map((item) => {
    const variant = variants.find((v) => v.id === item.variant_id);
    const pm = productMasters.find((p) => p.id === item.product_master_id);
    const brand = pm ? brands.find((b) => b.id === pm.brand_id) : null;
    const category = pm ? categories.find((c) => c.id === pm.category_id) : null;

    const identifier = item.imei1 || item.imei2 || item.serial_number;
    if (!identifier) return null;

    const variantAttrs = variant?.attributes || {};
    const { mainSpecs, subSpecs } = getSpecsText(pm, category, variantAttrs, item);

    return {
      brand: brand?.name?.toUpperCase() || "",
      model: pm?.model?.toUpperCase() || "",
      specLine: mainSpecs,
      subSpecLine: subSpecs,
      condition: variant?.condition || "Brand New",
      warrantyLines: (item.warranty_description || pm?.warranty_description || "No Warranty").split(",").map(w => w.trim()).filter(Boolean),
      cashPrice: item.cash_price || 0,
      srp: item.srp || 0,
      identifier,
    };
  }).filter(Boolean);
};

// ==========================================
// QR CODE STICKERS (delegates to global service)
// ==========================================

export const printInventoryQRStickers = async ({ items, variants, productMasters, brands, categories }) => {
  const stickerItems = mapInventoryToStickerItems(items, { variants, productMasters, brands, categories });
  await printQRStickers({ items: stickerItems, title: "QR Stickers - Inventory" });
};

// ==========================================
// BARCODE STICKERS
// ==========================================

export const printInventoryBarcodes = ({ items, variants, productMasters, brands, categories }) => {
  if (!items?.length) {
    alert("No items selected to print barcodes.");
    return;
  }

  const barcodeHTML = items.map((item) => {
    const variant = variants.find((v) => v.id === item.variant_id);
    const pm = productMasters.find((p) => p.id === item.product_master_id);
    const brand = pm ? brands.find((b) => b.id === pm.brand_id) : null;
    const category = pm ? categories.find((c) => c.id === pm.category_id) : null;

    const barcodeValue = item.imei1 || item.imei2 || item.serial_number || "";
    if (!barcodeValue) return "";

    const variantAttrs = variant?.attributes || {};
    const { mainSpecs, subSpecs } = getSpecsText(pm, category, variantAttrs, item);
    const warrantyLines = (item.warranty_description || pm?.warranty_description || "No Warranty").split(",").map(w => w.trim()).filter(Boolean);

    return `
      <div class="barcode-item">
        <div class="barcode-header">
          <strong>${brand?.name?.toUpperCase() || ""} ${pm?.model?.toUpperCase() || ""}</strong>
        </div>
        ${mainSpecs ? `<div class="barcode-specs">${mainSpecs}</div>` : ""}
        ${subSpecs ? `<div class="barcode-specs">${subSpecs}</div>` : ""}
        <div class="barcode-specs">${variant?.condition || "Brand New"}</div>
        ${warrantyLines.map((line) => `<div class="barcode-specs">${line}</div>`).join("")}
        <div class="barcode-prices">
          <div class="cash-price">CASH ₱${formatCurrency(item.cash_price)}</div>
          <div class="srp-price">SRP ₱${formatCurrency(item.srp)}</div>
        </div>
        <svg class="barcode" data-barcode-value="${barcodeValue}"></svg>
        <div class="barcode-text">${barcodeValue}</div>
      </div>
    `;
  }).filter(Boolean).join("");

  if (!barcodeHTML) {
    alert("No valid barcodes found in selected items.");
    return;
  }

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barcodes - Inventory</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap" rel="stylesheet">
      <style>${getPrintStyles()}</style>
    </head>
    <body>
      ${barcodeHTML}
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.barcode').forEach((svg) => {
            const barcodeValue = svg.dataset.barcodeValue;
            if (barcodeValue) {
              JsBarcode(svg, barcodeValue, { format: 'CODE128', width: 1.5, height: 50, displayValue: false, margin: 18 });
            }
          });
          setTimeout(() => window.print(), 500);
        });
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};