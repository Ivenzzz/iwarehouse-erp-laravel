import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updatePurchaseOrderPayable, uploadPaymentDocument } from "../../services/threeWayMatchingApi";

export function useMarkPurchaseOrderPaid() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ match, paymentFile, paymentNotes, currentUser }) => {
      if (!match?.po?.id) {
        throw new Error("No purchase order selected.");
      }

      if (!paymentFile) {
        throw new Error("Please upload the invoice document before marking this PO as paid.");
      }

      const documentUrl = await uploadPaymentDocument(paymentFile);
      const actor =
        currentUser?.full_name || currentUser?.name || currentUser?.email || currentUser?.username || "Unknown User";

      const nextPayableJson = {
        ...(match.po.payable_json || {}),
        has_paid: true,
        paid_by: actor,
        paid_date: new Date().toISOString(),
        attached_documents: {
          document_url: documentUrl,
          document_name: paymentFile.name,
        },
        notes: paymentNotes || "",
      };

      await updatePurchaseOrderPayable({
        purchaseOrderId: match.po.id,
        payableJson: nextPayableJson,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["threeWayMatching"] });
      toast.success("Purchase order marked as paid.");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to mark this purchase order as paid.");
    },
  });

  return {
    mutation,
    markAsPaid: mutation.mutateAsync,
  };
}
