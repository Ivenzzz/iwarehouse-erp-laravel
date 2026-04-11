import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useStockRequests() {
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["stockRequests"],
    queryFn: () => base44.entities.StockRequest.list("-created_date"),
    initialData: [],
  });

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouse.list(),
    initialData: [],
  });

  const { data: stockRequestApprovals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ["stockRequestApprovals"],
    queryFn: () => base44.entities.StockRequestApproval.list("-created_date"),
    initialData: [],
  });

  const isLoading = requestsLoading || userLoading || warehousesLoading || approvalsLoading;

  return {
    requests,
    currentUser,
    warehouses,
    stockRequestApprovals,
    isLoading,
  };
}