import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { toast } from "@/shared/hooks/use-toast";
import AppShell from "@/shared/layouts/AppShell";
import ThreeWayMatchingLayout from "../components/ThreeWayMatchingLayout";
import MarkAsPaidDialog from "../components/MarkAsPaidDialog";
import { buildQueryParams, normalizeQueryParams } from "../lib/queryParams";
import { useThreeWayMatchingPageState } from "../lib/pageState";

export default function ThreeWayMatching({
  matches = [],
  selectedMatch = null,
  counts = {},
  filters = {},
  pagination = {},
}) {
  const normalizedFilters = useMemo(() => normalizeQueryParams(filters), [filters]);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const state = useThreeWayMatchingPageState({
    matches,
    initialSelectedMatchId: selectedMatch?.id || normalizedFilters.selected_match_id,
  });

  const effectiveSelectedMatch = state.selectedMatch || selectedMatch;

  const visit = (overrides = {}) => {
    router.get(route("three-way-matching.index"), buildQueryParams(normalizedFilters, overrides), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  const submitPayment = () => {
    if (!effectiveSelectedMatch?.po?.id) {
      toast({ variant: "destructive", description: "No purchase order selected." });
      return;
    }

    if (!state.paymentFile) {
      toast({ variant: "destructive", description: "Please upload invoice document before marking as paid." });
      return;
    }

    setIsSavingPayment(true);
    router.post(
      route("three-way-matching.mark-paid", effectiveSelectedMatch.po.id),
      {
        invoice_document: state.paymentFile,
        notes: state.paymentNotes,
        ...buildQueryParams(normalizedFilters, {
          selected_match_id: effectiveSelectedMatch.id,
        }),
      },
      {
        forceFormData: true,
        preserveScroll: true,
        onSuccess: () => {
          toast({ description: "Purchase order marked as paid." });
          state.resetPaymentDialog();
        },
        onError: () => {
          toast({ variant: "destructive", description: "Failed to mark purchase order as paid." });
        },
        onFinish: () => {
          setIsSavingPayment(false);
        },
      }
    );
  };

  return (
    <AppShell title="3-Way Matching">
      <Head title="3-Way Matching" />
      <div className="space-y-6 text-xs">
        <ThreeWayMatchingLayout
          matches={matches}
          selectedMatch={effectiveSelectedMatch}
          selectedMatchId={state.selectedMatchId}
          counts={counts}
          status={normalizedFilters.status}
          pagination={pagination}
          onRefresh={() => visit({ selected_match_id: state.selectedMatchId })}
          onSelectMatch={state.setSelectedMatchId}
          onStatusChange={(nextStatus) =>
            visit({
              status: nextStatus,
              page: 1,
              selected_match_id: null,
            })
          }
          onPageChange={(page) => visit({ page, selected_match_id: state.selectedMatchId })}
          onOpenPaymentDialog={() => {
            if (effectiveSelectedMatch?.paymentState === "ready") {
              state.setPaymentDialogOpen(true);
            }
          }}
        />

        <MarkAsPaidDialog
          open={state.paymentDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              state.resetPaymentDialog();
              return;
            }

            state.setPaymentDialogOpen(true);
          }}
          selectedMatch={effectiveSelectedMatch}
          paymentFile={state.paymentFile}
          paymentNotes={state.paymentNotes}
          isSaving={isSavingPayment}
          onFileChange={state.setPaymentFile}
          onNotesChange={state.setPaymentNotes}
          onCancel={state.resetPaymentDialog}
          onSubmit={submitPayment}
        />
      </div>
    </AppShell>
  );
}
