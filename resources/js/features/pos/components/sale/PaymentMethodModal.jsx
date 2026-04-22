import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, Image } from 'lucide-react';
import { toast } from '@/shared/hooks/use-toast';
import CreatableBankCombobox from './CreatableBankCombobox';

export default function PaymentMethodModal({
  open,
  onOpenChange,
  methodDetails,
  paymentData,
  setPaymentData,
  refInput,
  setRefInput,
  onConfirm,
}) {
  const fileInputRef = useRef(null);

  if (!methodDetails) return null;

  const methodType = methodDetails.type;
  const methodName = methodDetails.name;
  const isCreditCard = methodType === 'card' && methodName === 'Credit Card';

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentDocs = paymentData.supportingDocUrls || [];
    const remaining = 5 - currentDocs.length;
    if (remaining <= 0) {
      toast({ variant: 'destructive', description: 'Maximum 5 documents allowed' });
      return;
    }

    const filesToStore = files.slice(0, remaining).map((file) => ({
      file,
      name: file.name,
      type: file.type,
    }));

    setPaymentData(prev => ({
      ...prev,
      supportingDocUrls: [...(prev.supportingDocUrls || []), ...filesToStore]
    }));

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDoc = (index) => {
    setPaymentData(prev => ({
      ...prev,
      supportingDocUrls: (prev.supportingDocUrls || []).filter((_, i) => i !== index)
    }));
  };

  const renderSupportingDocumentsUpload = () => (
    <div className="space-y-2">
      <Label className="text-slate-700 dark:text-slate-200">
        Supporting Documents (up to 5)
      </Label>

      <div className="space-y-2">
        {(paymentData.supportingDocUrls || []).map((doc, idx) => (
          <div
            key={idx}
            className="
              flex items-center gap-2 rounded px-3 py-2 border
              bg-slate-50 border-slate-200
              dark:bg-[#020617] dark:border-slate-800
            "
          >
            {doc.type?.startsWith("image") ? (
              <Image className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
            )}

            <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">
              {doc.name}
            </span>

            <button
              type="button"
              onClick={() => removeDoc(idx)}
              className="
                text-red-500 hover:text-red-600
                dark:text-red-400 dark:hover:text-red-300
                flex-shrink-0 transition-colors
              "
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {(paymentData.supportingDocUrls || []).length < 5 && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="
                w-full text-xs
                border-slate-300 text-slate-800 hover:bg-slate-50
                dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800/40
              "
            >
              <span className="flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                Upload Document (Images / PDF)
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
        sm:max-w-md max-h-[90vh] overflow-y-auto
        bg-white text-slate-900 border border-slate-200
        dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-800
      "
      >
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            {methodDetails.name} Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {/* Reference Number - All non-cash */}
          {methodType !== "cash" && (
            <div className="space-y-2">
              <Label htmlFor="refNumber" className="text-slate-700 dark:text-slate-200">
                {methodType === "cheque" ? "Cheque Number" : "Reference Number"} *
              </Label>
              <Input
                id="refNumber"
                placeholder={
                  methodType === "cheque"
                    ? "Enter cheque number"
                    : "Enter reference number"
                }
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                className="
                bg-white text-slate-900 border-slate-300
                focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
              "
              />
            </div>
          )}

          {/* Credit Card fields */}
          {isCreditCard && (
            <>
              <div className="space-y-2">
                <Label htmlFor="bank" className="text-slate-700 dark:text-slate-200">
                  Bank *
                </Label>
                <CreatableBankCombobox
                  value={paymentData.bank || ''}
                  onValueChange={(val) =>
                    setPaymentData((prev) => ({ ...prev, bank: val }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="text-slate-700 dark:text-slate-200">
                  Account Number *
                </Label>
                <Input
                  id="cardNumber"
                  placeholder="Enter account number"
                  maxLength={19}
                  value={paymentData.cardNumber || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPaymentData((prev) => ({ ...prev, cardNumber: val }));
                  }}
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="terminalUsed"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Terminal Used
                </Label>
                <Input
                  id="terminalUsed"
                  placeholder="Enter terminal used"
                  value={paymentData.terminalUsed || ""}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      terminalUsed: e.target.value,
                    }))
                  }
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cardHolderName"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Cardholder Name *
                </Label>
                <Input
                  id="cardHolderName"
                  placeholder="Name on card"
                  value={paymentData.cardHolderName || ""}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      cardHolderName: e.target.value,
                    }))
                  }
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="loanTerm"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Loan Term *
                </Label>

                <Select
                  value={paymentData.loanTerm || ""}
                  onValueChange={(val) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      loanTerm: val,
                    }))
                  }
                >
                  <SelectTrigger
                    className="
        bg-white text-slate-900 border-slate-300
        focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
        dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
      "
                  >
                    <SelectValue placeholder="Select loan term" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="0">Straight Payment</SelectItem>
                    {[3, 4, 6, 8, 12, 15, 18, 24, 36, 48].map((term) => (
                      <SelectItem key={term} value={term.toString()}>
                        {term} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Non-credit card fields */}
          {methodType === "card" && !isCreditCard && (
            <>
              <div className="space-y-2">
                <Label htmlFor="bank" className="text-slate-700 dark:text-slate-200">
                  Bank *
                </Label>
                <CreatableBankCombobox
                  value={paymentData.bank || ''}
                  onValueChange={(val) =>
                    setPaymentData((prev) => ({ ...prev, bank: val }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cardNumber"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Account Number *
                </Label>
                <Input
                  id="cardNumber"
                  placeholder="Enter account number"
                  maxLength={19}
                  value={paymentData.cardNumber || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPaymentData((prev) => ({ ...prev, cardNumber: val }));
                  }}
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cardHolderName"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Cardholder Name *
                </Label>
                <Input
                  id="cardHolderName"
                  placeholder="Name on card"
                  value={paymentData.cardHolderName || ""}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      cardHolderName: e.target.value,
                    }))
                  }
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>
            </>
          )}

          {/* E-Wallet fields - Reference Number + Sender Number (full 11 digits) */}
          {methodType === "ewallet" && (
            <div className="space-y-2">
              <Label
                htmlFor="senderMobile"
                className="text-slate-700 dark:text-slate-200"
              >
                Sender Mobile Number (11 digits) *
              </Label>
              <Input
                id="senderMobile"
                placeholder="09XXXXXXXXX"
                maxLength={11}
                value={paymentData.senderMobileNumber || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPaymentData((prev) => ({ ...prev, senderMobileNumber: val }));
                }}
                className="
                bg-white text-slate-900 border-slate-300
                focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
              "
              />
            </div>
          )}

          {/* Bank Transfer fields */}
          {methodType === "bank_transfer" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="bank" className="text-slate-700 dark:text-slate-200">
                  Bank *
                </Label>
                <CreatableBankCombobox
                  value={paymentData.bank || ''}
                  onValueChange={(val) =>
                    setPaymentData((prev) => ({ ...prev, bank: val }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="accountNumber"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Account Number *
                </Label>
                <Input
                  id="accountNumber"
                  placeholder="Enter account number"
                  value={paymentData.accountNumber || ""}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="accountHolderName"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Account Holder Name *
                </Label>
                <Input
                  id="accountHolderName"
                  placeholder="Name on account"
                  value={paymentData.accountHolderName || ""}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      accountHolderName: e.target.value,
                    }))
                  }
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              {renderSupportingDocumentsUpload()}
            </>
          )}

          {/* Financing fields - added Loan Type, Downpayment Amount, Supporting Documents */}
          {methodType === "financing" && (
            <>
              <div className="space-y-2">
                <Label
                  htmlFor="contractId"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Contract/Application ID *
                </Label>
                <Input
                  id="contractId"
                  placeholder="Enter contract ID"
                  value={paymentData.contractId}
                  onChange={(e) =>
                    setPaymentData((prev) => ({ ...prev, contractId: e.target.value }))
                  }
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="registeredMobile"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Registered Mobile (11 digits) *
                </Label>
                <Input
                  id="registeredMobile"
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                  value={paymentData.registeredMobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPaymentData((prev) => ({ ...prev, registeredMobile: val }));
                  }}
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="loanType"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Loan Type
                </Label>
                <Input
                  id="loanType"
                  placeholder="e.g. Personal Loan, Home Credit"
                  value={paymentData.loanType || ""}
                  onChange={(e) =>
                    setPaymentData((prev) => ({ ...prev, loanType: e.target.value }))
                  }
                  className="
                  bg-white text-slate-900 border-slate-300
                  focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                  dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                  dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                "
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="downpaymentAmount"
                  className="text-slate-700 dark:text-slate-200"
                >
                  Downpayment Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">
                    ₱
                  </span>
                  <Input
                    id="downpaymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="
                    pl-8 bg-white text-slate-900 border-slate-300
                    focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500
                    dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                    dark:focus-visible:ring-indigo-500/40 dark:focus-visible:border-indigo-500
                  "
                    value={paymentData.downpaymentAmount || ""}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        downpaymentAmount: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loanTerm" className="text-slate-700 dark:text-slate-200">
                  Loan Term *
                </Label>

                <Select
                  value={paymentData.loanTerm}
                  onValueChange={(val) =>
                    setPaymentData((prev) => ({ ...prev, loanTerm: val }))
                  }
                >
                  <SelectTrigger
                    className="
                    bg-white text-slate-900 border-slate-300
                    focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500
                    dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800
                    dark:focus:ring-indigo-500/40 dark:focus:border-indigo-500
                  "
                  >
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>

                  <SelectContent
                    className="
                    bg-white text-slate-900 border-slate-200
                    dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-800
                  "
                  >
                    <SelectItem value="0" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      Straight Payment
                    </SelectItem>
                    <SelectItem value="3" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      3 Months
                    </SelectItem>
                    <SelectItem value="4" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      4 Months
                    </SelectItem>
                    <SelectItem value="6" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      6 Months
                    </SelectItem>
                    <SelectItem value="9" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      9 Months
                    </SelectItem>
                    <SelectItem value="12" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      12 Months
                    </SelectItem>
                    <SelectItem value="15" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      15 Months
                    </SelectItem>
                    <SelectItem value="18" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      18 Months
                    </SelectItem>
                    <SelectItem value="24" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      24 Months
                    </SelectItem>
                    <SelectItem value="48" className="focus:bg-indigo-50 dark:focus:bg-indigo-500/10">
                      48 Months
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Supporting Documents Upload */}
              {renderSupportingDocumentsUpload()}

              {methodName.toLowerCase().includes("samsung finance") && (
                <label
                  className="
                  flex items-center gap-2 text-sm rounded px-3 py-2 border
                  bg-orange-50 border-orange-300
                  dark:bg-orange-900/20 dark:border-orange-800
                "
                >
                  <input
                    type="checkbox"
                    checked={paymentData.knoxVerified}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        knoxVerified: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    Device Knox/Lock Verified
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="
            border-slate-300 text-slate-800 hover:bg-slate-50
            dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800/40
          "
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={false}
            className="
            bg-indigo-600 hover:bg-indigo-700 text-white
            dark:bg-indigo-500 dark:hover:bg-indigo-400
            disabled:bg-slate-300 disabled:text-slate-600
            dark:disabled:bg-slate-800 dark:disabled:text-slate-500
          "
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
