import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { batchUpdateInventory } from "../services/batchUpdateService";

export function useBatchUpdate({ onSuccess }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ itemIds, updateFields, options }) =>
      batchUpdateInventory(itemIds, updateFields, options),
    onSuccess: (data) => {
      setResult(data);
      if (data.succeeded.length > 0) {
        toast.success(`${data.succeeded.length} item(s) updated successfully`);
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }
      if (data.failed.length > 0) {
        toast.error(`${data.failed.length} item(s) failed to update`);
      }
      if (data.skippedConflicts.length > 0) {
        toast.warning(`${data.skippedConflicts.length} IMEI/SN conflict(s) skipped`);
      }
      onSuccess?.();
    },
  });

  const reset = () => setResult(null);

  return {
    execute: mutation.mutate,
    isUpdating: mutation.isPending,
    result,
    reset,
  };
}