import React from "react";
import { MarkAsPaidDialog, ThreeWayMatchingLayout, useThreeWayMatchingPage } from "@/components/threewaymatching";

export default function ThreeWayMatching() {
  const { data, state, actions } = useThreeWayMatchingPage();

  return (
    <div className="space-y-6 text-xs">
      <ThreeWayMatchingLayout
        matches={data.matches}
        selectedMatch={data.selectedMatch}
        selectedMatchId={state.selectedMatchId}
        counts={data.counts}
        loading={data.loading}
        error={data.error}
        onRefresh={actions.refreshAll}
        onSelectMatch={actions.selectMatch}
        onOpenPaymentDialog={actions.openPaymentDialog}
      />

      <MarkAsPaidDialog
        open={state.paymentDialogOpen}
        onOpenChange={actions.closePaymentDialog}
        selectedMatch={data.selectedMatch}
        paymentFile={state.paymentFile}
        paymentNotes={state.paymentNotes}
        isSaving={state.isSavingPayment}
        onFileChange={actions.setPaymentFile}
        onNotesChange={actions.setPaymentNotes}
        onCancel={actions.resetPaymentDialog}
        onSubmit={actions.submitPayment}
      />
    </div>
  );
}
