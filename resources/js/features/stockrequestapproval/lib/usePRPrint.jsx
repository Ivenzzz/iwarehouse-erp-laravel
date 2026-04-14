import { format } from "date-fns";

function formatDate(value, pattern = "MMMM dd, yyyy") {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return format(parsed, pattern);
}

/**
 * Builds a display name for an item purely from denormalized StockRequest item fields.
 */
function getItemProductName(item) {
  if (item.variant_name) return item.variant_name;
  const brandModel = [item.brand, item.model].filter(Boolean).join(" ");
  return brandModel || "Unknown Product";
}

/**
 * Builds a spec line for an item purely from denormalized StockRequest item fields.
 */
function getItemSpecLine(item) {
  const attrs = item.variant_attributes || {};
  const parts = [
    attrs.RAM || attrs.ram,
    attrs.rom,
    attrs.Color || attrs.color,
    item.condition,
  ].filter(Boolean);
  return parts.join(" | ");
}

export function usePRPrint({ companyInfo }) {
  const handlePrintPR = (pr) => {
    const requesterName = pr.requested_by || "N/A";
    const branchName = pr.branch_name || pr.destination_warehouse_name || "N/A";

    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loading...</title>
        <style>
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .loader {
            text-align: center;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .loader-text {
            color: #666;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <div class="loader-text">Generating PDF...</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    const srNumber = pr.pr_number || pr.request_number || "SR";

    setTimeout(() => {
      const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <title>${srNumber}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    @layer utilities {
                    @media print {
                        @page {
                        size: A4;
                        margin: 15mm;
                        }

                        .print-footer {
                        @apply fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 text-gray-500 text-[10px] text-center pt-2;
                        }

                        main {
                        margin-bottom: 50px;
                        }

                        .no-break {
                        page-break-inside: avoid;
                        }
                    }
                    }

                    body {
                        font-family: 'Times New Roman', serif;
                    }
                    </style>
            </head>

            <body class="bg-white text-gray-800 p-[5mm] flex flex-col min-h-screen">
                <main class="flex-1">
                    <div class="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                    <div class="flex gap-4 items-start">
                        ${companyInfo?.logo_url
          ? `
                            <div class="w-20 h-20 bg-gray-100 flex items-center justify-center rounded-lg">
                            <img src="${companyInfo.logo_url}" alt="Logo" class="max-w-full max-h-full object-contain" />
                            </div>`
          : ''
        }
                        <div class="text-sm leading-tight">
                        <h2 class="text-lg font-bold mb-1">${companyInfo?.company_name || 'iWarehouse Corp.'}</h2>
                        ${companyInfo?.address ? `<p>${companyInfo.address}</p>` : ''}
                        ${companyInfo?.city ? `<p>${companyInfo.city}, ${companyInfo.country || 'Philippines'}</p>` : ''}
                        ${companyInfo?.phone ? `<p>Tel: ${companyInfo.phone}</p>` : ''}
                        ${companyInfo?.tax_id ? `<p>Tax ID: ${companyInfo.tax_id}</p>` : ''}
                        ${companyInfo?.email ? `<p>Email: ${companyInfo.email}</p>` : ''}
                        ${companyInfo?.website ? `<p>Website: ${companyInfo.website}</p>` : ''}
                        </div>
                    </div>

                    <div class="text-right">
                        <p class="text-xs text-gray-500 mb-1">STOCK REQUISITION No.</p>
                        <h3 class="text-2xl font-bold">${srNumber}</h3>
                    </div>
                    </div>

                    <h1 class="text-center text-slate-600 text-3xl font-bold my-4 tracking-wide">STOCK REQUISITION</h1>

                    <div class="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-lg mb-4 no-break">
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Request Date:</label>
                            <p class="text-sm font-medium">${formatDate(pr.request_date || pr.created_at || pr.created_date)}</p>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Requested By:</label>
                            <p class="text-sm font-medium">${requesterName}</p>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Required By:</label>
                            <p class="text-sm font-medium">${formatDate(pr.required_date)}</p>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Requested Store:</label>
                            <p class="text-sm font-medium">${branchName}</p>
                        </div>
                    </div>

                    <div class="bg-yellow-50 p-2 px-5 rounded-md mb-6 no-break">
                    <h3 class="text-xs font-semibold text-gray-500 uppercase mb-2">Purpose / Justification</h3>
                    <p class="text-sm">${pr.purpose || 'N/A'}</p>
                    </div>

                    <div class="items-section mb-6">
                    <h3 class="text-lg font-semibold mb-3">Requested Items</h3>
                    <div class="overflow-hidden rounded-lg border border-gray-300">
                        <table class="w-full border-collapse text-sm">
                        <thead class="bg-gray-100 border-b border-gray-300">
                            <tr>
                            <th class="w-10 py-2 px-3 text-left font-semibold text-xs uppercase">#</th>
                            <th class="py-2 px-3 text-left font-semibold text-xs uppercase">Product / Description</th>
                            <th class="w-24 py-2 px-3 text-center font-semibold text-xs uppercase">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(pr.items || [])
          .map((item, idx) => {
            const productName = getItemProductName(item);
            const specs = getItemSpecLine(item);

            return `
                                <tr class="hover:bg-gray-50 border-b border-gray-200">
                                    <td class="py-2 px-3">${idx + 1}</td>
                                    <td class="py-2 px-3">
                                    <div class="font-semibold">${productName}</div>
                                    ${specs ? `<div class="text-xs text-gray-500">${specs}</div>` : ''}
                                    </td>
                                    <td class="py-2 px-3 text-center font-bold italic">${item.quantity} Units</td>
                                </tr>
                                `;
          })
          .join('')}
                        </tbody>
                        </table>
                    </div>
                    </div>

                    <div class="flex justify-end mt-10 mb-6 no-break">
                    <div class="text-center w-64">
                        <div class="border-t-2 border-gray-600 pt-2 mt-10">
                        <h4 class="uppercase text-gray-600 text-xs font-semibold">Approved By</h4>
                        </div>
                    </div>
                    </div>
                </main>


                <footer class="print-footer text-center text-[10px] text-gray-500 border-t border-gray-300 pt-3 mt-8">
                    <p>
                    This is a computer-generated document. Generated on
                    ${format(new Date(), 'MMMM dd, yyyy hh:mm:ss a').toUpperCase()}
                    </p>
                    <p class="mt-1">
                    For inquiries: ${companyInfo?.email || 'N/A'} | ${companyInfo?.phone || 'N/A'}
                    </p>
                </footer>


                <script>
                document.title = '${srNumber}';
                window.onload = function() {
                    setTimeout(() => window.print(), 250);
                };
                </script>
            </body>
            </html>
            `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }, 500);
  };

  return { handlePrintPR };
}
