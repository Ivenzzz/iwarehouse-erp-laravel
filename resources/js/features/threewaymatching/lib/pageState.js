import { useEffect, useMemo, useState } from "react";

export function useThreeWayMatchingPageState({ matches, initialSelectedMatchId }) {
  const [selectedMatchId, setSelectedMatchId] = useState(initialSelectedMatchId || null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (initialSelectedMatchId) {
      setSelectedMatchId(initialSelectedMatchId);
      return;
    }

    if (!matches || matches.length === 0) {
      setSelectedMatchId(null);
      return;
    }

    if (!matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(matches[0].id);
    }
  }, [initialSelectedMatchId, matches, selectedMatchId]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  );

  const resetPaymentDialog = () => {
    setPaymentDialogOpen(false);
    setPaymentFile(null);
    setPaymentNotes("");
  };

  return {
    selectedMatchId,
    setSelectedMatchId,
    selectedMatch,
    paymentDialogOpen,
    setPaymentDialogOpen,
    paymentFile,
    setPaymentFile,
    paymentNotes,
    setPaymentNotes,
    resetPaymentDialog,
  };
}
