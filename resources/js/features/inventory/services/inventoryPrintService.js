import { printQRStickers } from "@/shared/services/qrStickerPrintService";

const PRINT_CONFIG = {
  width: "46mm",
  height: "40mm",
};

const getPrintStyles = () => `
  @page { size: ${PRINT_CONFIG.width} ${PRINT_CONFIG.height}; margin: 0; }
  body { margin: 0; padding: 0; font-family: 'Noto Serif', sans-serif; }
  .barcode-item { width: ${PRINT_CONFIG.width}; height: ${PRINT_CONFIG.height}; padding: 0mm 0.5mm; page-break-after: always; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; box-sizing: border-box; border: 1px solid #d1d5dc; }
  .barcode-header { font-size: 9px; font-weight: bold; text-align: left; width: 100%; white-space: normal; line-height: 1.1; margin-top: 0; }
  .barcode-specs { font-size: 7px; text-align: left; width: 100%; }
  .barcode-prices { display: flex; flex-direction: column; justify-content: space-between; width: 100%; font-size: 8px; font-weight: bold; }
  .cash-price { font-weight: bold; }
  .srp-price { font-weight: normal; }
  .barcode { width: 42mm; height: 13mm; margin-top: auto; margin-left: auto; display: block; }
  .barcode-text { font-size: 6px; text-align: center; width: 100%; font-family: monospace; line-height: 1; margin: 0; letter-spacing: 0.1mm; font-weight: lighter; }
`;

const formatCurrency = (amount) =>
  (amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const getSpecsText = (productMaster, category, variantAttrs, inventoryItem) => {
  const modelName = String(productMaster?.model || "").toLowerCase();
  const categoryName = String(category?.name || "").toLowerCase();
  const isIphone = modelName.includes("iphone") || categoryName.includes("iphone");

  const ram = variantAttrs.ram || variantAttrs.RAM || "";
  const storage = variantAttrs.storage || variantAttrs.Storage || variantAttrs.rom || variantAttrs.ROM || "";
  const color = variantAttrs.color || variantAttrs.Color || "";

  let mainSpecs = "";
  if (isIphone) {
    mainSpecs = [storage, color].filter(Boolean).join(" ");
  } else {
    const specsBase = ram && storage ? `${ram}/${storage}` : storage || ram;
    mainSpecs = [specsBase, color].filter(Boolean).join(" ");
  }

  const fixed = productMaster?.fixed_specifications || {};
  const cpu = inventoryItem?.cpu || fixed.platform_cpu || fixed.cpu || "";
  const gpu = inventoryItem?.gpu || fixed.platform_gpu || fixed.gpu || "";
  const subSpecs = cpu && gpu ? `${cpu} | ${gpu}` : cpu || gpu || "";

  return { mainSpecs, subSpecs };
};

const mapInventoryToStickerItems = (items, { variants, productMasters, brands, categories }) =>
  items.map((item) => {
    const variant = variants.find((entry) => entry.id === item.variant_id);
    const productMaster = productMasters.find((entry) => entry.id === item.product_master_id);
    const brand = productMaster ? brands.find((entry) => entry.id === productMaster.brand_id) : null;
    const category = productMaster ? categories.find((entry) => entry.id === productMaster.category_id) : null;

    const identifier = item.imei1 || item.imei2 || item.serial_number;
    if (!identifier) return null;

    const variantAttrs = variant?.attributes || {};
    const { mainSpecs, subSpecs } = getSpecsText(productMaster, category, variantAttrs, item);

    return {
      brand: brand?.name?.toUpperCase() || "",
      model: productMaster?.model?.toUpperCase() || "",
      specLine: mainSpecs,
      subSpecLine: subSpecs,
      condition: variant?.condition || "Brand New",
      warrantyLines: (item.warranty_description || "No Warranty")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      cashPrice: item.cash_price || 0,
      srp: item.srp || 0,
      identifier,
    };
  }).filter(Boolean);

export const printInventoryQRStickers = async ({ items, variants, productMasters, brands, categories }) => {
  const stickerItems = mapInventoryToStickerItems(items, { variants, productMasters, brands, categories });
  await printQRStickers({ items: stickerItems, title: "QR Stickers - Inventory" });
};

export const printInventoryBarcodes = ({ items, variants, productMasters, brands, categories }) => {
  if (!items?.length) {
    window.alert("No items selected to print barcodes.");
    return;
  }

  const barcodeHTML = items.map((item) => {
    const variant = variants.find((entry) => entry.id === item.variant_id);
    const productMaster = productMasters.find((entry) => entry.id === item.product_master_id);
    const brand = productMaster ? brands.find((entry) => entry.id === productMaster.brand_id) : null;
    const category = productMaster ? categories.find((entry) => entry.id === productMaster.category_id) : null;

    const barcodeValue = item.imei1 || item.imei2 || item.serial_number || "";
    if (!barcodeValue) return "";

    const variantAttrs = variant?.attributes || {};
    const { mainSpecs, subSpecs } = getSpecsText(productMaster, category, variantAttrs, item);
    const warrantyLines = (item.warranty_description || "No Warranty")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return `
      <div class="barcode-item">
        <div class="barcode-header"><strong>${brand?.name?.toUpperCase() || ""} ${productMaster?.model?.toUpperCase() || ""}</strong></div>
        ${mainSpecs ? `<div class="barcode-specs">${mainSpecs}</div>` : ""}
        ${subSpecs ? `<div class="barcode-specs">${subSpecs}</div>` : ""}
        <div class="barcode-specs">${variant?.condition || "Brand New"}</div>
        ${warrantyLines.map((line) => `<div class="barcode-specs">${line}</div>`).join("")}
        <div class="barcode-prices">
          <div class="cash-price">CASH P${formatCurrency(item.cash_price)}</div>
          <div class="srp-price">SRP P${formatCurrency(item.srp)}</div>
        </div>
        <svg class="barcode" data-barcode-value="${barcodeValue}"></svg>
        <div class="barcode-text">${barcodeValue}</div>
      </div>
    `;
  }).filter(Boolean).join("");

  if (!barcodeHTML) {
    window.alert("No valid barcodes found in selected items.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Please allow pop-ups to print barcodes.");
    return;
  }

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
