import { format } from "date-fns";
import {
  buildDocumentFooter,
  buildDocumentHeader,
  buildPrintShell,
  getReceiveQrUrl,
} from "@/shared/services/printDocumentService";

/**
 * Generates the HTML string for a single picklist page.
 * Uses the exact layout/styling as the Manifest PDF.
 */
const generatePicklistHTML = (transfer, companyInfo, isLast, options = {}) => {
  // --- Data Preparation ---
  const sourceWarehouse = transfer.source_location;
  const destWarehouse = transfer.destination_location;
  
  // --- Prepare Items Table Data ---
  const tableRows = (transfer.product_lines || []).map((line, lineIndex) => {
    return {
      productName: line.variant_name || line.product_name || "Unknown Variant",
      identifier: line.identifier || line.imei1 || line.serial_number || "N/A",
      isSerial: true,
      groupKey: line.inventory_id || line.variant_id || `line-${lineIndex}`,
    };
  });
  const headerHtml = buildDocumentHeader({
    companyInfo,
    docRef: transfer.transfer_number,
    docRefLabel: "PICKLIST REF No.",
    showQrCode: Boolean(options.showQrCode),
    qrValue: options.qrValue || getReceiveQrUrl(transfer.id),
  });

  // --- HTML Template (Matches Manifest Layout) ---
  return `
    <main class="flex-1 ${!isLast ? 'break-after-page' : ''}" style="${!isLast ? 'page-break-after: always;' : ''}">
        ${headerHtml}

        <h1 class="text-center text-slate-600 text-3xl font-bold my-4 tracking-wide">STOCK TRANSFER PICKLIST</h1>

        <!-- Info Grid -->
        <div class="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-lg mb-4 no-break">
            <div>
                <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Date:</label>
                <p class="text-sm font-medium">${format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
            <div>
                <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Reference:</label>
                <p class="text-sm font-medium">${transfer.reference || 'N/A'}</p>
            </div>
            <div>
                <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">From (Source):</label>
                <p class="text-sm font-medium">${sourceWarehouse?.name || 'Unknown'}</p>
            </div>
            <div>
                <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">To (Destination):</label>
                <p class="text-sm font-medium">${destWarehouse?.name || 'Unknown'}</p>
            </div>
        </div>

        <!-- Items Table -->
        <div class="items-section mb-6">
            <h3 class="text-lg font-semibold mb-3">Items to Pick</h3>
            <div class="overflow-hidden rounded-lg border border-gray-300">
                <table class="w-full border-collapse text-sm">
                    <thead class="bg-gray-100 border-b border-gray-300">
                        <tr>
                            <th class="w-10 py-2 px-3 text-left font-semibold text-xs uppercase">#</th>
                            <th class="py-2 px-3 text-left font-semibold text-xs uppercase">Product / Description</th>
                            <th class="py-2 px-3 text-left font-semibold text-xs uppercase">Serial / IMEI</th>
                            <th class="w-24 py-2 px-3 text-center font-semibold text-xs uppercase">Picked</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.length === 0 
                            ? '<tr><td colspan="4" class="text-center py-4 text-gray-500 italic">No items found</td></tr>' 
                            : tableRows.map((row, idx) => `
                            <tr class="hover:bg-gray-50 border-b border-gray-200">
                                <td class="py-2 px-3 align-top">${idx + 1}</td>
                                <td class="py-2 px-3 align-top">
                                    <div class="font-semibold">${row.productName}</div>
                                </td>
                                <td class="py-2 px-3 font-mono text-xs align-top">${row.identifier}</td>
                                <td class="py-2 px-3 text-center align-middle">
                                    <div class="w-5 h-5 border-2 border-gray-400 rounded-sm mx-auto"></div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Signatures -->
        <div class="flex justify-between mt-10 mb-6 no-break px-10">
            <div class="text-center w-64">
                <div class="border-t-2 border-gray-600 pt-2 mt-10">
                    <h4 class="uppercase text-gray-600 text-xs font-semibold">Picked By</h4>
                    <p class="text-[10px] text-gray-400 mt-1">Name & Signature / Date</p>
                </div>
            </div>
            <div class="text-center w-64">
                <div class="border-t-2 border-gray-600 pt-2 mt-10">
                    <h4 class="uppercase text-gray-600 text-xs font-semibold">Checked By</h4>
                    <p class="text-[10px] text-gray-400 mt-1">Name & Signature / Date</p>
                </div>
            </div>
        </div>
    </main>
  `;
};

/**
 * Main function to batch print picklists.
 */
export const printBatchPicklists = (transfers, companyInfo = {}, options = {}) => {
  const transferArray = Array.isArray(transfers) ? transfers : [transfers];
  
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert("Pop-up blocked! Please allow pop-ups for this site to print.");
    return;
  }

  // Initial Loader State (Same as Manifest)
  printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loading Picklists...</title>
        <style>
          body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; background: #f5f5f5; }
          .loader { text-align: center; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .loader-text { color: #666; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <div class="loader-text">Generating Picklists...</div>
        </div>
      </body>
      </html>
  `);
  printWindow.document.close();

  // Generate Content
  setTimeout(() => {
    const pagesHTML = transferArray.map((t, i) => 
      generatePicklistHTML(t, companyInfo, i === transferArray.length - 1, {
        showQrCode: Boolean(options.showQrCode),
      })
    ).join('');
    const fullHTML = buildPrintShell({
      title: `Picklist-${transferArray.length > 1 ? "Batch" : transferArray[0].transfer_number}`,
      pagesHtml: pagesHTML,
      footerHtml: buildDocumentFooter({ companyInfo, generatedAt: new Date() }),
      includeQrScript: Boolean(options.showQrCode),
      extraHeadHtml:
        '<link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">',
    });

    printWindow.document.open();
    printWindow.document.write(fullHTML);
    printWindow.document.close();
  }, 500);
};

// Backward compatibility function (now includes companyInfo)
export const printStockTransferPicklist = (transfer, companyInfo, options = {}) => {
  printBatchPicklists([transfer], companyInfo, options);
};
