import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  FileCheck,
  Loader2,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

import ReceiptSearch from "@/components/rma/intake/ReceiptSearch";
import InvoiceInfoCard from "@/components/rma/intake/InvoiceInfoCard";
import ItemSelectionList from "@/components/rma/intake/ItemSelectionList";
import SelectedItemCard from "@/components/rma/intake/SelectedItemCard";
import { generateAndDownloadRMAReceipt } from "@/components/rma/intake/services/rmaReceiptPdfService";
import { useRMAIntake } from "@/components/rma/intake/useRMAIntake";

const PHOTO_POSITIONS = ["front", "back", "top", "bottom", "left", "right"];

const STEP_CONFIG = [
  {
    title: "Find Transaction",
    description: "Lookup by receipt, IMEI, customer name, or phone.",
  },
  {
    title: "Select Items",
    description: "Choose the exact products being returned or serviced.",
  },
  {
    title: "Issue Details",
    description: "Capture issue, accessories, and condition evidence.",
  },
  {
    title: "Review & Submit",
    description: "Review all intake data before submission.",
  },
];

export default function POSReturnsView({ onClose }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [stationId] = useState("01");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const {
    searchValue,
    setSearchValue,
    isSearching,
    searchError,
    fetchTransactionDetails,
    allTransactions,
    customers,
    inventory,
    warehouses,
    invoiceData,
    customerData,
    availableItems,
    selectedItems,
    selectedItemIds,
    addItemToSelection,
    removeItemFromSelection,
    updateItemIntake,
    uploadingPosition,
    handlePhotoUpload,
    submitRMA,
    resetForm,
    isSubmitting,
  } = useRMAIntake();

  const formMetrics = useMemo(() => {
    const selectedCount = selectedItems.length;
    const totalPhotosRequired = selectedCount * PHOTO_POSITIONS.length;
    const photoCount = selectedItems.reduce(
      (count, selected) =>
        count +
        PHOTO_POSITIONS.filter((position) => Boolean(selected.intakeData.device_photos?.[position])).length,
      0
    );
    const accessoryCount = selectedItems.reduce((count, selected) => {
      const checked = Object.values(selected.intakeData.accessories || {}).filter(Boolean).length;
      return count + checked + (selected.intakeData.accessories_other?.trim() ? 1 : 0);
    }, 0);
    const allReasonCaptured =
      selectedCount > 0 &&
      selectedItems.every(({ intakeData }) => Boolean(intakeData.return_reason));
    const allSymptomsCaptured =
      selectedCount > 0 &&
      selectedItems.every(({ intakeData }) => Boolean(intakeData.symptoms.trim()));
    const allActionsCaptured =
      selectedCount > 0 &&
      selectedItems.every(({ intakeData }) => Boolean(intakeData.requested_action));
    const allPhotosCaptured = selectedCount > 0 && photoCount === totalPhotosRequired;
    const primaryItem = selectedItems[0]?.item;
    const primaryItemLabel = primaryItem
      ? `${primaryItem.brand_name || ""} ${primaryItem.variant_name || ""}`.trim()
      : "None selected";
    const currentStep = !invoiceData ? 0 : selectedCount === 0 ? 1 : !(allReasonCaptured && allSymptomsCaptured && allActionsCaptured && allPhotosCaptured) ? 2 : 3;

    return {
      selectedCount,
      totalAvailableCount: availableItems.length + selectedCount,
      photoCount,
      totalPhotosRequired,
      accessoryCount,
      allReasonCaptured,
      allSymptomsCaptured,
      allActionsCaptured,
      allPhotosCaptured,
      currentStep,
      primaryItemLabel,
      requestedAction:
        selectedItems.find(({ intakeData }) => intakeData.requested_action)?.intakeData.requested_action ||
        "Pending",
    };
  }, [availableItems.length, invoiceData, selectedItems]);

  const isFormValid = useMemo(() => {
    if (formMetrics.selectedCount === 0) return false;
    return (
      formMetrics.allReasonCaptured &&
      formMetrics.allSymptomsCaptured &&
      formMetrics.allActionsCaptured &&
      formMetrics.allPhotosCaptured
    );
  }, [formMetrics]);

  const policyChecks = useMemo(
    () => [
      {
        label: "Warranty lookup",
        status: invoiceData && formMetrics.selectedCount > 0 ? "pass" : "warn",
        note:
          invoiceData && formMetrics.selectedCount > 0
            ? "Invoice and eligible items loaded"
            : "Load a transaction and select at least one item",
      },
      {
        label: "Required fields",
        status:
          formMetrics.allReasonCaptured && formMetrics.allSymptomsCaptured && formMetrics.allActionsCaptured
            ? "pass"
            : "warn",
        note:
          formMetrics.allReasonCaptured && formMetrics.allSymptomsCaptured && formMetrics.allActionsCaptured
            ? "Issue and requested action captured"
            : "Reason, symptoms, and requested action are still required",
      },
      {
        label: "Photo documentation",
        status: formMetrics.allPhotosCaptured ? "pass" : "warn",
        note: formMetrics.totalPhotosRequired
          ? `${formMetrics.photoCount} / ${formMetrics.totalPhotosRequired} required photos captured`
          : "Photos become required after item selection",
      },
      {
        label: "Ready to submit",
        status: isFormValid ? "pass" : "warn",
        note: isFormValid ? "All validation checks passed" : "Complete the remaining intake requirements",
      },
    ],
    [formMetrics, invoiceData, isFormValid]
  );

  const handleSubmit = async () => {
    try {
      const receiptContext = await submitRMA();
      toast.success(`RMA Ticket Created: ${receiptContext.ticketNumber}`, {
        description: `${selectedItems.length} item(s) submitted for triage. Generating receipt...`,
      });

      try {
        await generateAndDownloadRMAReceipt(receiptContext);
      } catch (pdfError) {
        console.error("Failed to generate PDF:", pdfError);
        toast.error("RMA created but failed to generate receipt PDF");
      }

      resetForm();
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to submit RMA");
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const selectedItemCountLabel = `${formMetrics.selectedCount} / ${formMetrics.totalAvailableCount || 0}`;
  const footerStatus = isFormValid
    ? "Ready to submit"
    : formMetrics.selectedCount === 0
      ? "Select at least one item to continue"
      : "Complete required fields and photo evidence";
  const footerDescription = currentUser?.full_name
    ? `Station ${stationId} · Intake operator: ${currentUser.full_name}`
    : `Station ${stationId} · Loading operator details`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="mb-6 rounded-none border border-border bg-card/95 p-6 shadow-xl shadow-primary/5 backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-3 rounded-none border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                Service Desk · Returns / RMA
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">Create RMA Request</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Guided intake flow for retail staff with transaction validation, item-level selection,
                and complete device documentation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-none px-4">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to POS
              </Button>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-none border border-border bg-card p-5 shadow-lg shadow-black/5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {STEP_CONFIG.map((step, index) => {
              const isPast = index < formMetrics.currentStep;
              const isCurrent = index === formMetrics.currentStep;
              return (
                <div
                  key={step.title}
                  className={cn(
                    "rounded-none border p-4 transition-colors",
                    isCurrent
                      ? "border-primary/40 bg-primary/10"
                      : isPast
                        ? "border-border bg-muted/40"
                        : "border-border bg-background/70"
                  )}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-none text-sm font-semibold",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : isPast
                            ? "bg-foreground/10 text-foreground"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="text-sm font-medium">{step.title}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <ReceiptSearch
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              onFetch={fetchTransactionDetails}
              isLoading={isSearching}
              warehouses={warehouses}
              allTransactions={allTransactions}
              customers={customers}
              inventory={inventory}
            />

            {searchError && (
              <div className="rounded-none border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {searchError}
              </div>
            )}

            {invoiceData && <InvoiceInfoCard invoice={invoiceData} customer={customerData} />}

            {availableItems.length > 0 && (
              <ItemSelectionList
                items={availableItems}
                selectedItemIds={selectedItemIds}
                onSelectItem={addItemToSelection}
              />
            )}

            {selectedItems.length > 0 && (
              <section className="space-y-4">
                <div className="rounded-none border border-border bg-card p-5 shadow-lg shadow-black/5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">4. Issue intake</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Structured item-level intake for consistent service desk documentation.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-none border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                      {formMetrics.selectedCount} selected
                    </Badge>
                  </div>
                </div>

                {selectedItems.map((selected, index) => (
                  <SelectedItemCard
                    key={selected.item.inventory_id}
                    item={selected.item}
                    itemIndex={index}
                    intakeData={selected.intakeData}
                    warrantyInfo={selected.warrantyInfo}
                    onUpdateIntake={updateItemIntake}
                    onRemove={removeItemFromSelection}
                    onPhotoUpload={handlePhotoUpload}
                    uploadingPosition={uploadingPosition}
                  />
                ))}
              </section>
            )}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-none border border-border bg-card p-5 shadow-xl shadow-black/5">
              <h2 className="text-lg font-semibold">RMA summary</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live validation and quick review before submission.
              </p>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Selected Items" value={selectedItemCountLabel} />
                <SummaryRow label="Primary Item" value={formMetrics.primaryItemLabel} />
                <SummaryRow label="Resolution" value={formatRequestedAction(formMetrics.requestedAction)} />
                <SummaryRow label="Customer" value={customerData?.full_name || "No transaction loaded"} />
                <SummaryRow label="Accessories Logged" value={String(formMetrics.accessoryCount)} />
                <SummaryRow label="Photos Uploaded" value={`${formMetrics.photoCount} / ${formMetrics.totalPhotosRequired || 0}`} />
              </div>

              <div
                className={cn(
                  "mt-5 rounded-none border p-4",
                  isFormValid ? "border-success/30 bg-success/10" : "border-warning/30 bg-warning/10"
                )}
              >
                <div className={cn("text-sm font-medium", isFormValid ? "text-success" : "text-warning-muted-foreground")}>
                  {isFormValid ? "Submission ready" : "Attention required"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isFormValid
                    ? "All required intake details and evidence are complete."
                    : "Finish the remaining required details and photo capture before final submission."}
                </p>
              </div>
            </section>

            {invoiceData && (
              <section className="rounded-none border border-border bg-card p-5 shadow-xl shadow-black/5">
                <h2 className="text-lg font-semibold">Transaction context</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <ContextRow label="Invoice" value={invoiceData.or_number || invoiceData.transaction_number} />
                  <ContextRow label="Date" value={formatDisplayDate(invoiceData.transaction_date)} />
                  <ContextRow label="Branch" value={invoiceData.warehouse_name || "N/A"} />
                  <ContextRow label="Payment" value={invoiceData.payment_method || "N/A"} />
                </div>
              </section>
            )}

            <section className="rounded-none border border-border bg-card p-5 shadow-xl shadow-black/5">
              <h2 className="text-lg font-semibold">Policy checks</h2>
              <div className="mt-4 space-y-3 text-sm">
                {policyChecks.map((item) => (
                  <PolicyItem key={item.label} {...item} />
                ))}
              </div>
            </section>

            <section className="rounded-none border border-border bg-gradient-to-br from-card to-muted/30 p-5 shadow-xl shadow-black/5">
              <h2 className="text-lg font-semibold">Operator guidance</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <GuideRow icon={ShoppingBag} text="Verify the customer-selected line item before adding it to the case." />
                <GuideRow icon={ShieldCheck} text="Capture all six device angles to avoid warranty disputes during triage." />
                <GuideRow icon={FileCheck} text="Use symptoms and requested action to speed up service center routing." />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 mt-8 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{footerStatus}</div>
            <div className="text-sm text-muted-foreground">{footerDescription}</div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} className="rounded-none px-4 py-3">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting} className="rounded-none px-5 py-3">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit RMA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-none border border-border bg-background/60 px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-none border border-border bg-background/50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-right text-sm text-foreground">{value}</div>
    </div>
  );
}

function PolicyItem({ label, status, note }) {
  const isPass = status === "pass";
  return (
    <div className="rounded-none border border-border bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-none border text-xs font-bold",
            isPass
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning-muted-foreground"
          )}
        >
          {isPass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        </div>
        <div>
          <div className="font-medium text-foreground">{label}</div>
          <div className="mt-1 text-muted-foreground">{note}</div>
        </div>
      </div>
    </div>
  );
}

function GuideRow({ icon: Icon, text }) {
  return (
    <div className="flex items-start gap-3 rounded-none border border-border bg-background/40 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <p>{text}</p>
    </div>
  );
}

function formatRequestedAction(value) {
  if (!value || value === "Pending") return "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDisplayDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
