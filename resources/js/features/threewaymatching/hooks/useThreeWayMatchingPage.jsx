import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useThreeWayMatchingData } from "./useThreeWayMatchingData";
import { useMarkPurchaseOrderPaid } from "./mutations/useMarkPurchaseOrderPaid";
import { DISCREPANCY, MATCHED, PENDING } from "../utils/threeWayMatchingMeta";

export function useThreeWayMatchingPage() {
  const queryClient = useQueryClient();
  const { matches, currentUser, loading, error } = useThreeWayMatchingData();
  const { mutation: markAsPaidMutation, markAsPaid } = useMarkPurchaseOrderPaid();

  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (matches.length === 0) {
      setSelectedMatchId(null);
      return;
    }

    if (!matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(matches[0].id);
    }
  }, [matches, selectedMatchId]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  );

  const counts = useMemo(() => {
    const pendingCount = matches.filter((match) => match.status === PENDING).length;
    const matchedCount = matches.filter((match) => match.status === MATCHED).length;
    const discrepancyCount = matches.filter((match) => match.status === DISCREPANCY).length;
    const paidCount = matches.filter((match) => match.isPaid).length;
    const readyToPayCount = matches.filter((match) => match.paymentState === "ready").length;
    const matchRate = matches.length > 0 ? Math.round((matchedCount / matches.length) * 100) : 0;

    return { pendingCount, matchedCount, discrepancyCount, paidCount, readyToPayCount, matchRate };
  }, [matches]);

  const resetPaymentDialog = () => {
    setPaymentDialogOpen(false);
    setPaymentFile(null);
    setPaymentNotes("");
  };

  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ["threeWayMatching"] });

  const openPaymentDialog = () => {
    if (selectedMatch?.paymentState === "ready") {
      setPaymentDialogOpen(true);
    }
  };

  const closePaymentDialog = (nextOpen) => {
    if (!nextOpen) {
      resetPaymentDialog();
      return;
    }

    setPaymentDialogOpen(true);
  };

  const submitPayment = async () => {
    await markAsPaid({
      match: selectedMatch,
      paymentFile,
      paymentNotes,
      currentUser,
    });
    resetPaymentDialog();
  };

  return {
    data: { matches, selectedMatch, counts, loading, error },
    state: {
      selectedMatchId,
      paymentDialogOpen,
      paymentFile,
      paymentNotes,
      isSavingPayment: markAsPaidMutation.isPending,
    },
    actions: {
      selectMatch: setSelectedMatchId,
      refreshAll,
      openPaymentDialog,
      closePaymentDialog,
      submitPayment,
      resetPaymentDialog,
      setPaymentFile,
      setPaymentNotes,
    },
  };
}
