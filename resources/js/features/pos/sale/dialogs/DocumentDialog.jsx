import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronRight, Eye, CheckCircle2, Trash2, Camera } from "lucide-react";
import SequentialDocScanner from "@/features/pos/sale/dialogs/SequentialDocScanner";

function ImagePreviewDialog({ open, onOpenChange, imageUrl, title }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-slate-100">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center bg-gray-100 dark:bg-slate-950 p-4 rounded-lg">
          <img src={imageUrl} alt={title} className="max-h-[70vh] object-contain rounded shadow-sm" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentDialog({
  open,
  onOpenChange,
  manualOrNumber,
  setManualOrNumber,
  modeOfRelease,
  setModeOfRelease,
  remarks,
  setRemarks,
  documentUrls,
  onDocumentCapture,
  onDocumentUpload,
  isUploadingDocs,
  onProceedToPayment,
}) {
  const [previewImage, setPreviewImage] = useState({ open: false, url: null, title: "" });
  const [showScanner, setShowScanner] = useState(false);

  const DOC_ITEMS = [
    { key: "official_receipt", label: "Official Receipt Copy", required: true },
    { key: "customer_id", label: "Customer ID", required: true },
    { key: "customer_agreement", label: "Signed Agreement", required: true },
    { key: "other_supporting", label: "Other Supporting Documents", required: false },
  ];

  const capturedCount = DOC_ITEMS.filter((d) => documentUrls[d.key]).length;
  const requiredCount = DOC_ITEMS.filter((d) => d.required).length;
  const requiredCaptured = DOC_ITEMS.filter((d) => d.required && documentUrls[d.key]).length;

  // Helper to render uploaded state
  const renderUploadedState = (url, label, key) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 transition-all">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Uploaded</span>
      </div>
      <div className="flex gap-1">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setPreviewImage({ open: true, url, title: label })}
          className="h-8 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
        >
          <Eye className="w-4 h-4 mr-1" /> View
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => onDocumentCapture(key, null)}
          className="h-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <ImagePreviewDialog
        open={previewImage.open}
        onOpenChange={(open) => setPreviewImage({ ...previewImage, open })}
        imageUrl={previewImage.url}
        title={previewImage.title}
      />
      
      <SequentialDocScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        documentUrls={documentUrls}
        onDocumentCapture={onDocumentCapture}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="bg-[#002060] dark:bg-slate-950 text-white p-6 flex flex-row items-center justify-between border-b border-blue-900 dark:border-slate-800 sticky top-0 z-10">
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-wide">Complete Transaction</DialogTitle>
              <DialogDescription className="text-blue-100 dark:text-slate-300 mt-1">
                Review transaction details and required documents before proceeding to payment.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10 h-8 w-8 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogHeader>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Transaction Details */}
              <div className="space-y-6">
                <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                   <h3 className="text-sm font-bold text-gray-500 dark:text-cyan-400 uppercase tracking-wider">
                    Transaction Details
                  </h3>
                </div>
                
                {/* Official Receipt Number */}
                <div className="space-y-2">
                  <Label htmlFor="or_number" className="text-gray-700 dark:text-slate-300">
                    Official Receipt Number <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    id="or_number"
                    placeholder="Enter OR # from physical receipt"
                    value={manualOrNumber}
                    onChange={(e) => setManualOrNumber(e.target.value)}
                    className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Mode of Release */}
                <div className="space-y-2">
                  <Label htmlFor="mode_of_release" className="text-gray-700 dark:text-slate-300">Mode of Release</Label>
                  <Select value={modeOfRelease} onValueChange={setModeOfRelease}>
                    <SelectTrigger id="mode_of_release" className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 focus:ring-indigo-500 dark:focus:ring-indigo-500">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
                      <SelectItem value="Item Claimed / Pick-up">Item Claimed / Pick-up</SelectItem>
                      <SelectItem value="Delivery">Delivery</SelectItem>
                      <SelectItem value="Store Transfer">Store Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-gray-700 dark:text-slate-300">Remarks / Special Instructions</Label>
                  <Textarea
                    id="remarks"
                    placeholder="E.g., Item checked, delivered via Lalamove..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={5}
                    className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Right: Required Documents */}
              <div className="space-y-6">
                <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-cyan-400 uppercase tracking-wider">
                    Required Documents
                  </h3>
                </div>

                {/* Scan All Documents Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  className="w-full py-6 border-dashed border-2 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-400 dark:hover:border-blue-500/60 transition-all"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {capturedCount === 0
                    ? "Scan All Documents"
                    : `${capturedCount}/${DOC_ITEMS.length} Scanned — Tap to Continue`}
                </Button>

                {/* Document Status List */}
                <div className="space-y-2">
                  {DOC_ITEMS.map((doc) => {
                    const url = documentUrls[doc.key];
                    return (
                      <div key={doc.key}>
                        {url ? (
                          renderUploadedState(url, doc.label, doc.key)
                        ) : (
                          <div className="flex items-center gap-2 p-3 border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {doc.label}
                              {doc.required && <span className="text-red-500 ml-0.5">*</span>}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 p-6 sticky bottom-0 z-10">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="bg-white dark:bg-transparent border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={onProceedToPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all"
              disabled={isUploadingDocs || !manualOrNumber || !documentUrls.official_receipt || !documentUrls.customer_id || !documentUrls.customer_agreement}
            >
              Proceed to Payment <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
