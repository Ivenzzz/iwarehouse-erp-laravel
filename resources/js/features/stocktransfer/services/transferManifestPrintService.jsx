import { format } from "date-fns";
import {
  buildDocumentFooter,
  buildDocumentHeader,
  buildPrintShell,
  getReceiveQrUrl,
} from "@/shared/services/printDocumentService";

/**
 * Generates the HTML for a single Manifest page
 */
const generateManifestHTML = (transfer, companyInfo, isLast, options = {}) => {
  const sourceWarehouse = transfer.source_location;
  const destWarehouse = transfer.destination_location;
  const createdBy = transfer.actors_json?.created_by_name || transfer.created_by?.full_name || "N/A";

  const logisticsParts = [];
  if (transfer.logistics_json) {
    if (transfer.logistics_json.driver_name) logisticsParts.push(transfer.logistics_json.driver_name);
    if (transfer.logistics_json.courier_name) logisticsParts.push(transfer.logistics_json.courier_name);
  }
  const logisticsInfo = logisticsParts.length > 0 ? logisticsParts.join(" / ") : "N/A";

  const resolvedItems = (transfer.product_lines || []).map((line) => ({
    variantName: line.variant_name || line.product_name || "Unknown Product",
    identifier: line.identifier || line.imei1 || line.serial_number || "—",
    costPrice: Number(line.cost_price || 0),
  }));

  const totalItems = transfer.summary?.total_items ?? resolvedItems.length;
  const totalCost = transfer.summary?.total_cost ?? resolvedItems.reduce((sum, item) => sum + item.costPrice, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(amount || 0);
  };

  const transferDate = transfer.dates_json?.shipped_date || transfer.dates_json?.picked_date || transfer.created_date;
  const transferDateStr = transferDate ? format(new Date(transferDate), "MMMM dd, yyyy | hh:mm a") : "N/A";

  const headerHtml = buildDocumentHeader({
    companyInfo,
    docRef: transfer.transfer_number || "",
    docRefLabel: "",
    showQrCode: Boolean(options.showQrCode),
    qrValue: options.qrValue || getReceiveQrUrl(transfer.id),
  });

  return `
    <main class="flex flex-col min-h-[260mm] ${!isLast ? "break-after-page" : ""}" style="${!isLast ? "page-break-after: always;" : ""} font-family: sans-serif;">
        ${headerHtml}

        <div class="grid grid-cols-3 gap-y-3 gap-x-6 border border-slate-200 p-4 rounded-md mb-6 text-[11px]">
            <div>
                <label class="block text-[9px] uppercase text-slate-400 font-bold">Transfer Date</label>
                <p class="font-semibold text-slate-800">${transferDateStr}</p>
            </div>
            <div>
                <label class="block text-[9px] uppercase text-slate-400 font-bold">Reference / SO</label>
                <p class="font-semibold text-slate-800">${transfer.reference || "---"}</p>
            </div>
            <div>
                <label class="block text-[9px] uppercase text-slate-400 font-bold">Status</label>
                <p class="font-semibold text-slate-800 uppercase">${(transfer.status || "").replace(/_/g, " ")}</p>
            </div>
            
            <div class="border-t border-slate-100 pt-2">
                <label class="block text-[9px] uppercase text-slate-400 font-bold">Origin (Source)</label>
                <p class="font-bold text-slate-900 uppercase">${sourceWarehouse?.name || "Unknown"}</p>
            </div>
            <div class="border-t border-slate-100 pt-2">
                <label class="block text-[9px] uppercase text-slate-400 font-bold">Destination</label>
                <p class="font-bold text-slate-900 uppercase">${destWarehouse?.name || "Unknown"}</p>
            </div>
            <div class="border-t border-slate-100 pt-2">
                <label class="block text-[9px] uppercase text-slate-400 font-bold">Logistics / Driver</label>
                <p class="font-semibold text-slate-800">${logisticsInfo}</p>
            </div>
        </div>

        <div class="flex-grow">
            <table class="w-full text-[10px] border-collapse">
                <thead>
                    <tr class="bg-slate-800 text-white uppercase tracking-wider">
                        <th class="py-2 px-3 text-left w-8 rounded-tl">#</th>
                        <th class="py-2 px-3 text-left">Product Description</th>
                        <th class="py-2 px-3 text-left">Serial / IMEI</th>
                        <th class="py-2 px-3 text-right w-28 rounded-tr">Cost</th>
                    </tr>
                </thead>
                <tbody class="border-x border-slate-200">
                    ${resolvedItems.length === 0
                      ? `<tr><td colspan="4" class="py-6 text-center text-slate-400 italic">No items</td></tr>`
                      : resolvedItems.map((item, idx) => `
                            <tr class="border-b border-slate-100 hover:bg-slate-50">
                                <td class="py-2 px-3 align-top text-slate-400">${idx + 1}</td>
                                <td class="py-2 px-3 align-top">
                                    <div class="font-bold text-slate-900">${item.variantName}</div>
                                </td>
                                <td class="py-2 px-3 align-top font-mono text-[9px] text-slate-600">${item.identifier}</td>
                                <td class="py-2 px-3 text-right align-top font-medium">${formatCurrency(item.costPrice)}</td>
                            </tr>
                        `).join("")}
                </tbody>
                <tfoot class="bg-slate-50 border border-slate-200">
                    <tr class="font-bold text-slate-900">
                        <td colspan="2" class="py-3 px-3 text-right uppercase text-[9px]">Grand Totals:</td>
                        <td class="py-3 px-3 text-left text-sm">${totalItems} item(s)</td>
                        <td class="py-3 px-3 text-right text-sm">${formatCurrency(totalCost)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="mt-8 grid grid-cols-2 gap-8 px-2 no-break pb-12">
            <div class="flex flex-col">
                <label class="text-[9px] uppercase font-bold text-slate-400 mb-10">1. Prepared By</label>
                <div class="border-t border-slate-900 pt-1">
                    <p class="text-xs font-bold text-slate-900">${createdBy}</p>
                    <p class="text-[9px] text-slate-400 uppercase tracking-tight">Staff Signature / Date</p>
                </div>
            </div>
            <div class="flex flex-col">
                <label class="text-[9px] uppercase font-bold text-slate-400 mb-10">2. Acknowledged By</label>
                <div class="border-t border-slate-900 pt-1">
                    <div class="h-4"></div>
                    <p class="text-[9px] text-slate-400 uppercase tracking-tight">Receiver Signature / Date</p>
                </div>
            </div>
        </div>
    </main>
  `;
};

export const printBatchManifests = (transfers, companyInfo, options = {}) => {
  const transferArray = Array.isArray(transfers) ? transfers : [transfers];
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this site.");
    return;
  }

  printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Generating Document...</title>
        <style>
          body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; background: #f8fafc; }
          .spinner { border: 3px solid #e2e8f0; border-top: 3px solid #0f172a; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin-bottom: 12px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div style="text-align: center">
          <div class="spinner"></div>
          <div style="color: #64748b; font-size: 13px;">Preparing Manifests...</div>
        </div>
      </body>
      </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    const showQrCode = options.showQrCode ?? true;
    const pagesHTML = transferArray.map((t, i) =>
      generateManifestHTML(t, companyInfo, i === transferArray.length - 1, {
        showQrCode,
      })
    ).join("");

    const htmlContent = buildPrintShell({
      title: `Batch_Print_${format(new Date(), "yyyyMMdd")}`,
      pagesHtml: pagesHTML,
      footerHtml: buildDocumentFooter({
        companyInfo,
        generatedAt: new Date(),
        footerNote: `${companyInfo?.company_name || "iWarehouse"} Internal Document | Printed: ${format(new Date(), "MMM dd, yyyy | hh:mm a")}`,
      }),
      includeQrScript: Boolean(showQrCode),
    });

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, 500);
};

export const printTransferManifest = (transfer, companyInfo, options = {}) => {
  printBatchManifests([transfer], companyInfo, options);
};
