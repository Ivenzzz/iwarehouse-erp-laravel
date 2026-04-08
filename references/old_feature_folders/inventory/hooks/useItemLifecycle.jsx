import { useQuery } from "@tanstack/react-query";
import { fetchItemLifecycle } from "../services/lifecycleService";

export function useItemLifecycle(item) {
  return useQuery({
    queryKey: ["itemLifecycle", item?.id],
    queryFn: () => fetchItemLifecycle(item),
    enabled: !!item,
    initialData: [],
  });
}