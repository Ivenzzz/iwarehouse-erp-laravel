import { useQuery } from "@tanstack/react-query";
import { inventoryOps } from "@/functions/inventoryOps";

export function useInventoryKPIs() {
  return useQuery({
    queryKey: ["inventory-kpis"],
    queryFn: async () => {
      const res = await inventoryOps({ action: "getKPIs" });
      return res.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}