import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Image, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { getTransactionDiscountProofs } from "@/utils/transactionDiscounts";

export default function TransactionDocumentsDialog({ open, onOpenChange, transaction }) {
  const [selectedImage, setSelectedImage] = useState(null);

  // Collect payment supporting documents from payments_json
  const paymentSupportingDocs = useMemo(() => {
    const docs = [];
    const payments = transaction?.payments_json?.payments || [];
    payments.forEach((payment, idx) => {
      const supportingUrls = payment.payment_details?.supporting_doc_urls || [];
      supportingUrls.forEach((url, docIdx) => {
        if (url) {
          docs.push({
            key: `payment_${idx}_doc_${docIdx}`,
            label: `${payment.payment_method} - Supporting Doc ${docIdx + 1}`,
            url,
            type: "image",
          });
        }
      });
    });
    return docs;
  }, [transaction]);

  const discountProofs = getTransactionDiscountProofs(transaction);
  const discountProofDocs = discountProofs.map((proof, index) => ({
    key: `proof_image_url_${index}`,
    label: `Proof of Validation${discountProofs.length > 1 ? ` ${index + 1}` : ""}`,
    url: proof.proof_image_url,
    type: "image",
  }));

  const documents = [
    ...discountProofDocs,
    {
      key: "official_receipt_url",
      label: "Official Receipt",
      url: transaction?.supporting_documents?.official_receipt_url,
      type: "image",
    },
    {
      key: "customer_id_url",
      label: "Customer ID",
      url: transaction?.supporting_documents?.customer_id_url,
      type: "image",
    },
    {
      key: "customer_agreement_url",
      label: "Customer Agreement",
      url: transaction?.supporting_documents?.customer_agreement_url,
      type: "image",
    },
    ...paymentSupportingDocs,
  ];

  const handleViewImage = (url) => {
    setSelectedImage(url);
  };

  const handleCloseImage = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Transaction Documents
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              OR# {transaction?.or_number || "N/A"} - {transaction?.transaction_number}
            </div>

            {documents.map((doc) => (
              <div
                key={doc.key}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {doc.label}
                    </p>
                    {doc.url ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs mt-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-xs mt-1">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Available
                      </Badge>
                    )}
                  </div>
                </div>

                {doc.url && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewImage(doc.url)}
                      className="text-xs"
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.url, "_blank")}
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={handleCloseImage}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <DialogHeader>
            <DialogTitle className="text-sm">Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto">
            <img
              src={selectedImage}
              alt="Document"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
