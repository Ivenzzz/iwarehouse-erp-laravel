import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { batchDeleteInventoryItems } from "@/components/inventory/services/batchDeleteService";

export function useBatchDelete({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ itemIds }) => batchDeleteInventoryItems(itemIds),
    onSuccess: (data) => {
      setResult(data);
      if (data.deleted > 0) {
        toast.success(`${data.deleted} item(s) deleted successfully`);
      }
      if (data.failed > 0) {
        toast.error(`${data.failed} item(s) failed to delete`);
      }
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err?.message || "Batch delete failed");
    },
  });

  return {
    execute: mutation.mutate,
    isDeleting: mutation.isPending,
    result,
    reset: () => setResult(null),
  };
}