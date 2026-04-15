import { format } from "date-fns";

const getGRNNumber = (grn) => grn.grn_number || grn.receipt_info?.grn_number || "N/A";
const getGRNDate = (grn) => grn.created_date || grn.receipt_info?.receipt_date || "";
const getGRNStatus = (grn) => grn.status || grn.status_info?.status || "draft";
const getGRNTotalAmount = (grn) => grn.total_amount ?? grn.financial_info?.total_amount ?? 0;
const getEncodedBy = (grn) => {
  const directValue = grn.received_by || grn.parties?.received_by || grn.checked_by || grn.parties?.checked_by;
  if (directValue) return directValue;

  const noteMatch = grn.notes?.match(/completed by (.+?) on/i);
  return noteMatch?.[1] || "";
};

const getPrintRows = (grnItem, variant) => {
  if (grnItem.identifiers || grnItem.pricing || grnItem.spec) {
    return [{
      imei1: grnItem.identifiers?.imei1 || "",
      imei2: grnItem.identifiers?.imei2 || "",
      serial_number: grnItem.identifiers?.serial_number || "",
      warranty: grnItem.warranty || "",
      cost_price: grnItem.pricing?.cost_price || 0,
      cash_price: grnItem.pricing?.cash_price || 0,
      srp: grnItem.pricing?.srp || 0,
      package: grnItem.package || "",
      condition: grnItem.condition || variant?.condition || "Brand New",
    }];
  }

  const serials = grnItem.serials || grnItem.serial_numbers || [];
  const costing = grnItem.costing || {};

  if (serials.length > 0) {
    return serials.map((serial) => ({
      imei1: serial.imei1 || "",
      imei2: serial.imei2 || "",
      serial_number: serial.serial_number || "",
      warranty: serial.warranty || "",
      cost_price: costing.unit_cost || serial.cost_price || 0,
      cash_price: costing.cash_price || serial.cash_price || 0,
      srp: costing.srp || serial.srp || 0,
      package: serial.package || "",
      condition: grnItem.condition || variant?.condition || "Brand New",
    }));
  }

  const quantity = grnItem.quantities?.quantity_received || 1;
  return Array.from({ length: quantity }).map(() => ({
    imei1: "",
    imei2: "",
    serial_number: "",
    warranty: grnItem.warranty || "",
    cost_price: costing.unit_cost || 0,
    cash_price: costing.cash_price || 0,
    srp: costing.srp || 0,
    package: grnItem.package || "",
    condition: grnItem.condition || variant?.condition || "Brand New",
  }));
};

export const printGRN = ({ grn, dr, supplier, warehouse, po, companyInfo, productMasters, variants }) => {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Pop-up blocked! Please allow pop-ups for this site to print GRN documents.");
    return;
  }

  const groupedItems = {};
  (grn.items || []).forEach((item) => {
    const variant = variants.find((vr) => vr.id === item.variant_id);
    const pm = productMasters.find((p) => p.id === item.product_master_id || p.id === variant?.product_master_id);
    const productName = `${pm?.brand || ""} ${variant?.variant_name || pm?.name || ""}`.trim() || "Unknown Product";

    if (!groupedItems[productName]) {
      groupedItems[productName] = {
        productName,
        items: [],
      };
    }

    groupedItems[productName].items.push(...getPrintRows(item, variant));
  });

  const groupedItemsArray = Object.values(groupedItems);
  const totalItemsCount = groupedItemsArray.reduce((total, group) => total + group.items.length, 0);

  const htmlContent = generateGRNPrintHTML({
    grn,
    dr,
    supplier,
    warehouse,
    po,
    companyInfo,
    groupedItemsArray,
    totalItemsCount,
  });

  try {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } catch (error) {
    console.error("Error printing GRN:", error);
    alert("Failed to print GRN. Please check your pop-up settings.");
    printWindow.close();
  }
};

const generateGRNPrintHTML = ({ grn, dr, supplier, warehouse, po, companyInfo, groupedItemsArray, totalItemsCount }) => {
  const grnNumber = getGRNNumber(grn);
  const deliveryNoteNumber = dr?.dr_number || dr?.vendor_dr_number || grn.delivery_info?.delivery_note_number || "";
  const receiptDate = getGRNDate(grn);
  const receivedBy = getEncodedBy(grn);
  const checkedBy = receivedBy;
  const approvedBy = grn.status_info?.approved_by || grn.approved_by || "";
  const status = getGRNStatus(grn);
  const totalAmount = getGRNTotalAmount(grn);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Goods Received Note - ${grnNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            padding: 40px;
            background: white;
            color: #111;
            font-size: 10px;
            line-height: 1.4;
        }
        .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .company-branding { display: flex; gap: 15px; }
        .logo-box { width: 60px; height: 60px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .company-text h2 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .company-text p { color: #555; margin-bottom: 2px; }
        .doc-title { text-align: right; }
        .doc-title span { display: block; font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
        .doc-title h1 { font-size: 22px; font-weight: 800; margin-top: 4px; color: #000; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
        .info-column h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
        .info-row { display: flex; margin-bottom: 4px; }
        .info-label { width: 100px; font-weight: 600; color: #4b5563; }
        .info-value { flex: 1; font-weight: 500; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
        thead { background-color: #f3f4f6; }
        th { text-align: left; padding: 8px 6px; font-weight: 700; text-transform: uppercase; font-size: 9px; color: #1f2937; border-top: 1px solid #000; border-bottom: 1px solid #000; vertical-align: bottom; }
        td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 9px; word-wrap: break-word; }
        tr.group-start td { border-top: 1px solid #9ca3af; }
        .col-index { width: 25px; text-align: center; color: #666; }
        .col-product { width: 25%; font-weight: 600; }
        .col-id { width: 15%; font-family: monospace; font-size: 9px; color: #374151; }
        .col-money { width: 9%; text-align: right; font-family: monospace; }
        .col-pkg { width: 10%; font-size: 8px; }
        .col-warranty { width: 10%; font-size: 8px; }
        .col-status { width: 12%; text-align: center; font-weight: 600; }
        .status-badge { display: inline-block; padding: 2px 4px; border-radius: 4px; font-size: 8px; background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .footer-section { margin-top: 20px; display: flex; justify-content: flex-end; }
        .totals-box { width: 250px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .total-row.final { border-top: 2px solid #000; margin-top: 5px; padding-top: 10px; font-weight: 800; font-size: 12px; }
        .signatures-container { margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-block { width: 30%; }
        .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 8px; }
        .sig-title { font-weight: 700; font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 2px; }
        .sig-name { font-weight: 500; font-size: 11px; }
        .sig-date { font-size: 9px; color: #666; margin-top: 2px; }
        .page-footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 9px; }
        @media print { body { padding: 0; } @page { size: A4; margin: 10mm; } }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="company-branding">
           ${companyInfo?.logo_url ? `<div class="logo-box"><img src="${companyInfo.logo_url}" style="max-width:40px;" /></div>` : ""}
           <div class="company-text">
             <h2>${companyInfo?.company_name || "iWarehouse Corp."}</h2>
             <p>${companyInfo?.address || ""}</p>
             <p>${companyInfo?.city ? `${companyInfo.city}, ` : ""}${companyInfo?.country || "Philippines"}</p>
             <p>Tax ID: ${companyInfo?.tax_id || "N/A"}</p>
           </div>
        </div>
        <div class="doc-title">
            <span>Goods Received Note</span>
            <h1>${grnNumber}</h1>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-column">
            <h3>Supplier Information</h3>
            <div class="info-row"><span class="info-label">Supplier:</span><span class="info-value">${supplier?.master_profile?.trade_name || supplier?.CompanyName || "N/A"}</span></div>
            <div class="info-row"><span class="info-label">PO Number:</span><span class="info-value">${po?.po_number || "N/A"}</span></div>
            <div class="info-row"><span class="info-label">Invoice Ref:</span><span class="info-value">${deliveryNoteNumber || "N/A"}</span></div>
        </div>
        <div class="info-column">
            <h3>Receipt Details</h3>
            <div class="info-row"><span class="info-label">Received Date:</span><span class="info-value">${receiptDate ? format(new Date(receiptDate), "MMMM dd, yyyy") : "N/A"}</span></div>
            <div class="info-row"><span class="info-label">Warehouse:</span><span class="info-value">${warehouse?.name || "N/A"}</span></div>
            <div class="info-row"><span class="info-label">Received By:</span><span class="info-value">${receivedBy || "N/A"}</span></div>
            <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="text-transform:uppercase;">${status}</span></div>
        </div>
      </div>
      <table>
        <thead>
            <tr>
                <th class="col-index">#</th>
                <th class="col-product">Product Details</th>
                <th class="col-id">IMEI / SN</th>
                <th class="col-money">Cost</th>
                <th class="col-money">Cash</th>
                <th class="col-money">SRP</th>
                <th class="col-pkg">Package</th>
                <th class="col-warranty">Warranty</th>
                <th class="col-status">Status</th>
            </tr>
        </thead>
        <tbody>
            ${generateItemsRows(groupedItemsArray)}
        </tbody>
      </table>
      <div class="footer-section">
        <div class="totals-box">
            <div class="total-row">
                <span>Total Items:</span>
                <span>${totalItemsCount}</span>
            </div>
            <div class="total-row final">
                <span>TOTAL COST:</span>
                <span>P${totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
        </div>
      </div>
      <div class="signatures-container">
        <div class="sig-block">
            <div class="sig-title">Checked By</div>
            <div class="sig-name">${checkedBy || ""}</div>
            <div class="sig-line"></div>
            <div class="sig-date">Date: _________________</div>
        </div>
        <div class="sig-block">
            <div class="sig-title">Approved By</div>
            <div class="sig-name">${approvedBy || ""}</div>
            <div class="sig-line"></div>
            <div class="sig-date">Date: _________________</div>
        </div>
      </div>
      <div class="page-footer">
        This document is computer-generated. Printed on ${format(new Date(), "MMMM dd, yyyy HH:mm a")}
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;
};

const generateItemsRows = (groupedItemsArray) => {
  let rowCounter = 1;

  return groupedItemsArray.map((group) => {
    const rowSpan = group.items.length;

    return group.items.map((item, itemIndex) => {
      const isFirstOfGroup = itemIndex === 0;
      const groupClass = isFirstOfGroup ? "group-start" : "";
      const identifier = item.imei1 || item.serial_number || "-";
      const fullIdentifier = item.imei2
        ? `${identifier}<br/><span style="color:#666; font-size:8px;">${item.imei2}</span>`
        : identifier;

      return `
        <tr class="${groupClass}">
          <td class="col-index">${rowCounter++}</td>
          ${isFirstOfGroup ? `<td class="col-product" rowspan="${rowSpan}" style="background-color:#fff; border-right:1px solid #e5e7eb; border-bottom: 1px solid #9ca3af;">${group.productName}</td>` : ""}
          <td class="col-id">${fullIdentifier}</td>
          <td class="col-money">P${(item.cost_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</td>
          <td class="col-money">P${(item.cash_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</td>
          <td class="col-money">P${(item.srp || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</td>
          <td class="col-pkg">${item.package || "-"}</td>
          <td class="col-warranty">${item.warranty || "-"}</td>
          <td class="col-status"><span class="status-badge">${item.condition || "Brand New"}</span></td>
        </tr>
      `;
    }).join("");
  }).join("");
};

export const printBarcodes = ({ grn, variants, productMasters, brands, categories }) => {
  if (!grn.items || grn.items.length === 0) {
    alert("No items to print barcodes for.");
    return;
  }

  const printWindow = window.open("", "_blank");

  const barcodeHTML = grn.items.flatMap((grnItem) => {
    const variant = variants.find((v) => v.id === grnItem.variant_id);
    const pm = productMasters.find((p) => p.id === grnItem.product_master_id || p.id === variant?.product_master_id);
    const brand = pm ? brands.find((b) => b.id === pm.brand_id) : null;
    const category = pm ? categories.find((c) => c.id === pm.category_id) : null;
    const serialNumbers = grnItem.identifiers
      ? [{
          imei1: grnItem.identifiers?.imei1 || "",
          imei2: grnItem.identifiers?.imei2 || "",
          serial_number: grnItem.identifiers?.serial_number || "",
          warranty: grnItem.warranty || "",
          cash_price: grnItem.pricing?.cash_price || 0,
          srp: grnItem.pricing?.srp || 0,
        }]
      : grnItem.serials || grnItem.serial_numbers || [];
    const costing = grnItem.costing || {};

    return serialNumbers.map((sn) => {
      const srp = sn.srp || costing.srp || 0;
      const cashPrice = sn.cash_price || costing.cash_price || 0;
      const warrantyDesc = sn.warranty || pm?.warranty_description || "No Warranty";
      const productCondition = variant?.condition || "Brand New";
      const variantAttrs = variant?.attributes || {};
      const ram = variantAttrs.ram || variantAttrs.RAM || "";
      const storage = variantAttrs.storage || variantAttrs.Storage || variantAttrs.rom || variantAttrs.ROM || "";
      const modelName = pm?.model ? String(pm.model).toLowerCase() : "";
      const categoryNameLower = category?.name ? String(category.name).toLowerCase() : "";
      const isIphone = modelName.includes("iphone") || categoryNameLower.includes("iphone");
      const color = variantAttrs.color || variantAttrs.Color || "";

      let ramRomText = "";
      if (isIphone) {
        ramRomText = [storage, color].filter(Boolean).join(" ");
      } else {
        let specsBase = "";
        if (ram && storage) specsBase = `${ram}/${storage}`;
        else if (storage) specsBase = storage;
        else if (ram) specsBase = ram;
        ramRomText = [specsBase, color].filter(Boolean).join(" ");
      }

      const fixedSpecs = pm?.fixed_specifications || {};
      const cpu = fixedSpecs.cpu || "";
      const gpu = fixedSpecs.gpu || "";
      let cpuGpuText = "";
      const categoryName = category?.name?.toLowerCase() || "";
      const shouldShowCpuGpu = categoryName.includes("laptop") || categoryName.includes("desktop");
      if (shouldShowCpuGpu) {
        if (cpu && gpu) cpuGpuText = `${cpu} | ${gpu}`;
        else if (cpu) cpuGpuText = cpu;
        else if (gpu) cpuGpuText = gpu;
      }

      const barcodeValue = sn.imei1 || sn.imei2 || sn.serial_number || "";
      if (!barcodeValue) return "";

      const warrantyLines = String(warrantyDesc).split(",").map((w) => w.trim()).filter((w) => w);

      return `
        <div class="barcode-item">
            <div class="barcode-header">
              <strong>${brand?.name ? String(brand.name).toUpperCase() : ""} ${pm?.model ? String(pm.model).toUpperCase() : ""}</strong>
            </div>
            ${ramRomText ? `<div class="barcode-specs">${ramRomText}</div>` : ""}
            ${cpuGpuText ? `<div class="barcode-specs">${cpuGpuText}</div>` : ""}
            <div class="barcode-specs">${productCondition}</div>
            ${warrantyLines.map((line) => `<div class="barcode-specs">${line}</div>`).join("")}
            <div class="barcode-prices">
              <div class="cash-price">CASH P${cashPrice.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div class="srp-price">SRP P${srp.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            </div>
            <svg class="barcode" data-barcode-value="${barcodeValue}"></svg>
            <div class="barcode-text">${barcodeValue}</div>
        </div>
      `;
    }).join("");
  }).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barcode Batch ${getGRNNumber(grn)}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
      <style>
        @page { size: 46mm 40mm; margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Noto Serif', sans-serif; }
        .barcode-item {
          width: 46mm;
          height: 40mm;
          padding: 1mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
          box-sizing: border-box;
          border: 1px solid #d1d5dc;
        }
        .barcode-header { font-size: 9px; font-weight: bold; text-align: left; width: 100%; }
        .barcode-condition,
        .barcode-warranty,
        .barcode-specs { font-size: 7px; text-align: left; width: 100%; margin-top: 0px; }
        .barcode-prices { display: flex; flex-direction: column; justify-content: space-between; width: 100%; font-size: 8px; font-weight: bold; margin-top: 0px; }
        .cash-price { text-align: left; font-weight: bold; }
        .srp-price { text-align: left; font-weight: normal; }
        .barcode { width: 42mm; height: 13mm; margin-top: auto; margin-left: auto; display: block; }
        .barcode-text { font-size: 8px; font-weight: normal; text-align: center; width: 100%; font-family: monospace; z-index: 999; margin-top: -8px; }
      </style>
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
