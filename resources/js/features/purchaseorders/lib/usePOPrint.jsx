import {
  buildDocumentFooter,
  buildDocumentHeader,
  buildPrintShell,
} from "@/shared/services/printDocumentService";
import {
  buildPOPrintContext,
  buildPOPrintMainContent,
  buildPOPrintStyles,
} from "./poPrintTemplate";

export function usePOPrint({ suppliers, companyInfo, onPrintError }) {
  const handlePrintPO = (po) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      if (typeof onPrintError === "function") {
        onPrintError("Unable to open print preview.");
      }
      return false;
    }

    const context = buildPOPrintContext(po, suppliers, companyInfo);

    const headerHtml = buildDocumentHeader({
      companyInfo: context.sanitizedCompanyInfo,
      docRef: "",
      docRefLabel: "",
      showQrCode: true,
      qrValue: po?.po_number || String(po?.id || ""),
    });

    const contentHtml = buildPOPrintMainContent(context, headerHtml);
    const htmlContent = buildPrintShell({
      title: po?.po_number || "Purchase Order",
      pagesHtml: contentHtml,
      footerHtml: buildDocumentFooter({
        companyInfo: context.sanitizedCompanyInfo,
        generatedAt: new Date(),
      }),
      printDelayMs: 250,
      includeQrScript: true,
      extraStyles: buildPOPrintStyles(),
    });

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return true;
  };

  return { handlePrintPO };
}
