import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { batchUpdateWarehouse } from "../services/batchWarehouseService";

export function useBatchWarehouseUpdate({ onSuccess }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState(null); // { succeeded, failed } | null

  const mutation = useMutation({
    mutationFn: ({ itemIds, targetWarehouseId }) =>
      batchUpdateWarehouse(itemIds, targetWarehouseId),
    onSuccess: (data) => {
      setResult(data);
      if (data.succeeded.length > 0) {
        toast.success(`${data.succeeded.length} item(s) moved successfully`);
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }
      if (data.failed.length > 0) {
        toast.error(`${data.failed.length} item(s) failed to update`);
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