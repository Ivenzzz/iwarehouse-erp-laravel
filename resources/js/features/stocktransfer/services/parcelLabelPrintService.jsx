import { format } from "date-fns";

export const printBatchParcelLabels = (transfers, companyInfo) => {
  const transferArray = Array.isArray(transfers) ? transfers : [transfers];
  
  // Capture current URL base (main app URL) before opening print window
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Pop-up blocked! Please allow pop-ups for this site to print parcel labels.");
    return;
  }

  // --- 1. Helper to generate HTML for a single label ---
  const generateLabelHTML = (transfer, index, isLast) => {
    // Get warehouse info
    const sourceWarehouse = transfer.source_location;
    const destWarehouse = transfer.destination_location;

    // Format address
    const formatAddress = (warehouse) => {
      if (!warehouse) return "N/A";
      const addr = warehouse.address || {};
      const parts = [addr.street, addr.city, addr.province, addr.zip_code].filter(Boolean);
      return parts.length ? parts.join(", ") : warehouse.name || "N/A";
    };

    // Format phone
    const formatPhone = (warehouse) => {
      return warehouse?.contact_info?.phone_number || warehouse?.contact_info?.email || "N/A";
    };

    // Aggregate product lines by variant name
    const productSummary = {};
    (transfer.product_lines || []).forEach((line) => {
      const variantName = line.variant_name || line.product_name || "Unknown Item";
      productSummary[variantName] = (productSummary[variantName] || 0) + 1;
    });

    const productListHTML = Object.entries(productSummary)
      .slice(0, 5) // Limit items to fit
      .map(([name, qty]) => `<div class="product-line"><strong>${qty}x</strong> ${name}</div>`)
      .join("");

    const trackingNumber = transfer.transfer_number || "N/A";
    
    // Unique IDs for canvases
    const trackingQrId = `tracking-qr-${index}`;
    
    return {
      trackingQrId,
      trackingNumber,
      html: `
        <div class="label-wrapper" style="${!isLast ? 'page-break-after: always; break-after: page;' : ''}">
          <div class="label-container">
            <!-- LEFT PANEL -->
            <div class="left-panel">
              
              <!-- Tracking QR Section -->
              <div class="tracking-section">
                <div class="tracking-label">Tracking No.</div>
                <div class="qr-box main-qr">
                  <canvas id="${trackingQrId}" class="qr-canvas"></canvas>
                  <div class="barcode-text">${trackingNumber}</div>
                </div>
              </div>
              
              <!-- Products Section -->
              <div class="products-section">
                <div class="products-title">Contents</div>
                ${productListHTML}
              </div>
              
              <!-- Box Type -->
              <div class="box-type">
                <div class="box-type-info">
                  Handle with Care
                </div>
              </div>
            </div>
            
            <!-- RIGHT PANEL -->
            <div class="right-panel">
              
              <!-- Brand Header -->
              <div class="brand-header">
                <div class="brand-logo-group">
                  <div class="brand-name">
                    <span class="brand-i">i</span><span class="brand-warehouse">Warehouse</span>
                  </div>
                  <div class="brand-tagline">Making Technology Available For Everyone</div>
                </div>

              </div>
              
              <!-- Info Grid -->
              <div class="info-grid">
                <!-- FROM -->
                <div class="address-row">
                  <div class="address-label from-label">From:</div>
                  <div class="address-content from-content">
                    <div class="address-name">${sourceWarehouse?.name || "Source Warehouse"}</div>
                    <div class="address-detail">
                      <svg class="address-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>${formatAddress(sourceWarehouse)}</span>
                    </div>
                    <div class="address-detail">
                      <svg class="address-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      <span>${formatPhone(sourceWarehouse)}</span>
                    </div>
                  </div>
                </div>
                
                <!-- TO -->
                <div class="address-row">
                  <div class="address-label to-label">To:</div>
                  <div class="address-content">
                    <div class="address-name to-name">${destWarehouse?.name || "Destination Warehouse"}</div>
                    <div class="address-detail to-address">
                      ${formatAddress(destWarehouse)}
                    </div>
                    <div class="phone-badge">${formatPhone(destWarehouse)}</div>
                  </div>
                  
                  <!-- Stamp Area -->
                  <div class="stamp-area">
                    <svg class="stamp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span class="stamp-text">Fragile<br/>Items</span>
                  </div>
                </div>
              </div>
              
              <!-- Footer Services -->
              <div class="footer-services">
                <div class="service-item">
                  <div class="checkbox-box"></div>
                  <span class="service-text">Door to Door</span>
                </div>
                <div class="service-item">
                  <div class="checkbox-box"></div>
                  <span class="service-text">Pickup</span>
                </div>
                <div class="signature-group">
                  <span class="service-text">Signature:</span>
                  <span class="signature-line"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    };
  };

  // --- 2. Generate Data for all labels ---
  const labelsData = transferArray.map((t, i) => generateLabelHTML(t, i, i === transferArray.length - 1));

  // --- 3. Construct Full Document ---
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Parcel Labels</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
      <style>
        @page { size: 148mm 105mm; margin: 0; }
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        body { 
          font-family: 'Inter', sans-serif; 
          background: #f5f5f5; 
          padding: 8px;
        }
        
        .label-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 20px;
        }

        .label-container {
          background: white;
          width: 148mm;
          height: 105mm;
          border-top: 6px solid #f97316;
          display: flex;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        /* LEFT PANEL */
        .left-panel {
          width: 35%;
          background: #f9fafb;
          border-right: 2px dashed #d1d5db;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }
        
        .tracking-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .mt-2 { margin-top: 8px; }
        
        .tracking-label {
          font-size: 8px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
          align-self: flex-start;
        }
        
        .qr-box {
          background: white;
          border: 1px solid #d1d5db;
          padding: 3px;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        /* Adjust sizing for double QR codes */
        .main-qr .qr-canvas { max-width: 80px; }
        .sub-qr .qr-canvas { max-width: 60px; }
        
        .qr-canvas {
          width: 100% !important;
          height: auto !important;
        }
        
        .barcode-text {
          font-family: monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }
        
        /* Products Section */
        .products-section {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          margin-top: 6px;
        }
        
        .products-title {
          font-size: 8px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 2px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 2px;
        }
        
        .product-line {
          font-size: 8px;
          color: #374151;
          padding: 2px 0;
          border-bottom: 1px dotted #e5e7eb;
          word-break: break-word;
        }
        
        .box-type {
          margin-top: auto;
          padding-top: 6px;
        }
        
        .box-type-info {
          font-size: 8px;
          color: #6b7280;
        }
        
        /* RIGHT PANEL */
        .right-panel {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }
        
        .brand-header {
          background-color: #000000 !important; 
          padding: 12px 16px;
          margin-bottom: 8px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .brand-logo-group {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          display: flex;
          align-items: baseline;
          letter-spacing: -1px;
          line-height: 1;
        }
        
        .brand-i { color: #f97316 !important; font-weight: 700; font-size: 26px; }
        .brand-warehouse { color: #ffffff !important; font-weight: 700; font-size: 26px; }
        .brand-tagline { font-size: 6px; color: #d1d5db !important; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
        .header-icon { color: #333333; width: 24px; height: 24px; }
        
        .info-grid { border: 2px solid #000; flex: 1; display: flex; flex-direction: column; }
        .address-row { display: flex; border-bottom: 1px solid #d1d5db; }
        .address-row:last-child { border-bottom: none; flex: 1; }
        
        .address-label { width: 40px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 9px; text-transform: uppercase; }
        .from-label { background: #000; color: white; }
        .to-label { background: #f97316; color: white; }
        
        .address-content { flex: 1; padding: 8px; }
        .from-content { background: rgba(255, 237, 213, 0.4); }
        .address-name { font-weight: 800; font-size: 12px; color: #111827; text-transform: uppercase; letter-spacing: -0.5px; }
        .to-name { font-size: 14px; }
        
        .address-detail { display: flex; align-items: flex-start; gap: 4px; font-size: 9px; color: #4b5563; margin-top: 4px; text-transform: uppercase; line-height: 1.3; }
        .to-address { font-size: 10px; font-weight: 500; color: #1f2937; width: 75%; }
        
        .address-icon { width: 10px; height: 10px; color: #f97316; flex-shrink: 0; margin-top: 1px; }
        .phone-badge { display: inline-block; background: #f3f4f6; padding: 3px 6px; border-radius: 4px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 10px; font-weight: 700; color: #374151; margin-top: 4px; }
        
        .stamp-area { width: 50px; border-left: 1px dashed #d1d5db; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; text-align: center; }
        .stamp-icon { width: 18px; height: 18px; color: #f97316; }
        .stamp-text { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #ea580c; margin-top: 4px; }
        
        /* Footer Services */
        .footer-services { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        .service-item { display: flex; align-items: center; gap: 6px; }
        .checkbox-box { width: 14px; height: 14px; border: 1.5px solid #000; border-radius: 2px; background: transparent; }
        .service-text { font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .signature-group { display: flex; align-items: baseline; gap: 4px; }
        .signature-line { width: 100px; border-bottom: 1.5px solid #000; display: inline-block; }
        
        @media print {
          body { padding: 0; background: white; }
          .label-wrapper { box-shadow: none; margin: 0; page-break-after: always; }
          .label-wrapper:last-child { page-break-after: auto; }
          .label-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      ${labelsData.map(d => d.html).join('')}
      
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const qrData = ${JSON.stringify(labelsData.map(d => ({ id: d.trackingQrId, text: d.trackingNumber })))};
          
          let renderedCount = 0;
          
          qrData.forEach(item => {
            const canvas = document.getElementById(item.id);
            if(canvas) {
                QRCode.toCanvas(canvas, item.text, { 
                    width: 100,
                    margin: 0,
                    color: {
                      dark: "#000000",
                      light: "#ffffff"
                    }
                }, function (error) {
                    renderedCount++;
                    if (renderedCount === qrData.length) {
                       // Small delay to ensure rendering is visible before print dialog
                       setTimeout(() => window.print(), 800);
                    }
                });
            } else {
                renderedCount++;
            }
          });
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const printParcelLabel = (transfer, companyInfo) => {
  printBatchParcelLabels([transfer], companyInfo);
};
